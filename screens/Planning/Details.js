///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useRef, useState, useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';

// UI components
import { View, Text, ScrollView, TouchableOpacity} from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// validation
import { numberToRoman } from '../../components/Validation/numberToRoman';

// modals
import MealOverviewModal from '../../components/Planning/MealOverviewModal';

// initialize firebase app
import { getFirestore, collection, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

export default function Details ({ isSelectedTab }) {
  

  ///////////////////////////////// NAVIGATION LOGIC /////////////////////////////////
  
  const firstLoad = useRef(true);

  // if the tab has changed, refresh the data from the globals
  useEffect(() => {
    
    if (isSelectedTab && !firstLoad.current) {
      onNav();
      firstLoad.current = false;
    }
  }, [isSelectedTab])

  const previousIndexRef = useRef(null);
  const currentIndex = useNavigationState((state) => state.index);

  // if the screen has changed
  useEffect(() => {
    
    // if the page has changed to the current one, refetch the current data from the globals
    if (isSelectedTab && previousIndexRef !== null && previousIndexRef.current !== currentIndex && currentIndex === 2) {
      setTimeout(() => {
        onNav();
        firstLoad.current = false;
      }, 1000);
    }

    // updates the ref to the new index
    previousIndexRef.current = currentIndex;
  }, [currentIndex]);

  const [variantIds, setVariantIds] = useState(null);

  // on navigation
  const onNav = async () => {

    // processes meal preps
    const querySnapshot = await getDocs(collection(db, 'PREPS'));
    const prepsArray = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => a.prepName.localeCompare(b.prepName));
    setPrepData(prepsArray);

                
    // gets current global prep info and stores it
    const prep = await getDoc(doc(db, 'GLOBALS', 'prep'));
    const unfinished = prep.data().unfinished;
    setShowUnfinished(unfinished);
    const completed = prep.data().preps.map(p => p.completed).reduce((acc, obj) => ({ ...acc, ...obj }), {} );
    setPrepsCompleted(completed);

    
    // to calculate the amounts
    if (prepsArray) {
      const prepIds = prepsArray.map((prep) => prep.id);
      const varIds = prepsArray.map((prep) => prep.variants.map((v) => v.variantId || ""));
      setVariantIds(varIds);

      // for calculations of the three prior states, per variant
      const available = prepsArray.map((prep) => prep.variants.map((v) => v.prepMult || 0));
      let remaining = prepsArray.map((prep) => prep.variants.map((v) => v.prepMult || 0));
      let dates = prepsArray.map((prep) => prep.variants.map(() => []));
      
      // gets all current ingredient data
      const plansSnapshot = await getDocs(collection(db, 'PLANS'));
      const plansArray = plansSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
      const filteredPlans = plansArray.filter(plan => plan.id >= today.dateString);

      // loops over the meal preps
      prepIds.forEach((prep, index) => {

        // loops over the variants of the current prep
        varIds[index].forEach((variant, idx) => {

          // loops over the filtered plans
          filteredPlans.forEach((plan) => {

            // if the current meal prep id and variant id is stored in the plan's lunch
            if (plan.data.meals.lunch.prepData?.prepId === prep && plan.data.meals.lunch.prepData.variantId === variant) { 
              // decrement the number of remaining preps and store the date
              remaining[index][idx] = plan.id > today.dateString ? remaining[index][idx] - 1 : remaining[index][idx];
              dates[index][idx].push(formatDateExtended(plan.id) + "  LUNCH");
            }

            // if the current meal prep id and variant id is stored in the plan's dinner
            if (plan.data.meals.dinner.prepData?.prepId === prep && plan.data.meals.dinner.prepData.variantId === variant) { 
              // decrement the number of remaining preps and store the date
              remaining[index][idx] = plan.id > today.dateString ? remaining[index][idx] - 1 : remaining[index][idx];
              dates[index][idx].push(formatDateExtended(plan.id) + "  DINNER");
            }
          })
        })
      })
    
      // sets the states and filters based on the unfinished preps
      setCurrAvailable(available);
      setFilteredAvailable(available.map((variants, idx) => unfinished ? variants : variants.map((v, i) => (completed[varIds[idx][i]] ? v : null))));

      setCurrRemaining(remaining);
      setFilteredRemaining(remaining.map((variants, idx) => unfinished ? variants : variants.map((v, i) => (completed[varIds[idx][i]] ? v : null))));
      
      setCurrDates(dates);
      setFilteredDates(dates.map((variants, idx) => unfinished ? variants : variants.map((v, i) => (completed[varIds[idx][i]] ? v : null))));
    }
  }

  
  ///////////////////////////////// DATES /////////////////////////////////

  // today's current date
  const today = (() => {
    const localDate = new Date();
    
    return {
      dateString: localDate.toLocaleDateString('en-CA'),
      day: localDate.getDate(),
      month: localDate.getMonth() + 1,
      timestamp: localDate.getTime(),
      year: localDate.getFullYear(),
    };
  })();

  // formats the provided date as "ww mm/dd/yy"
  const formatDateExtended = (currDate) => {
    
    // if the date is valid
    if (currDate !== "") {
      
      // gets the simple infor from the dateString by splitting it
      const [year, mm, dd] = currDate.split('-').map(Number); // Convert parts to numbers
      const yy = year % 100;
      
      // calculates the day of the week
      const date = new Date(`${currDate}T00:00:00`);
      const weekdays = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];
      const ww = weekdays[date.getDay()];

      return `${ww} ${mm}/${dd}/${yy}`;

    } else {
      return "";
    }
  };

  ///////////////////////////////// MEAL PREPS /////////////////////////////////

  const [prepData, setPrepData] = useState([]);
  const [prepsCompleted, setPrepsCompleted] = useState(null);

  ///////////////////////////////// MULTIPLICITY /////////////////////////////////

  const [currAvailable, setCurrAvailable] = useState([]);   // the amounts available from the multiplicity
  const [currRemaining, setCurrRemaining] = useState([]);   // the amounts remaining from the number of times each prep is listed
  const [currDates, setCurrDates] = useState([]);           // the future dates the preps are listed under
  
  
  ///////////////////////////////// MEAL MODAL /////////////////////////////////

  const [mealModalVisible, setMealModalVisible] = useState(false);
  const [mealModalData, setMealModalData] = useState(null);

  // when a touchable opacity for a meal is clicked, store the data
  const displayMeal = (index, idx) => {
    // only opens the modal and stores data if there is data
    if (prepData !== null) {
      setMealModalData(
        prepData?.map(prep => ({
          ...prep, variants: showUnfinished ? prep.variants : prep.variants.map(v => (prepsCompleted?.[v.variantId] ? v : null))
        })).filter(prep => prep.variants.length > 0)[index].variants[idx]
      );
      setMealModalVisible(true);
    }
  }
  

  ///////////////////////////////// UNFINISHED /////////////////////////////////
  
  const [showUnfinished, setShowUnfinished] = useState(false);

  const [filteredRemaining, setFilteredRemaining] = useState([]);
  const [filteredAvailable, setFilteredAvailable] = useState([]);
  const [filteredDates, setFilteredDates] = useState([]);

  // to change the unfinished status (overall) in global
  const changeUnfinished = async () => {
    await updateDoc(doc(db, 'GLOBALS', 'prep'), { 'unfinished': !showUnfinished });
    setShowUnfinished(!showUnfinished);

    // changes the filtered remaining and available amounts
    setFilteredAvailable(currAvailable.map((variants, idx) => !showUnfinished ? variants : variants.map((v, i) => (prepsCompleted[variantIds[idx][i]] ? v : null))));
    setFilteredRemaining(currRemaining.map((variants, idx) => !showUnfinished ? variants : variants.map((v, i) => (prepsCompleted[variantIds[idx][i]] ? v : null))));
    setFilteredDates(currDates.map((variants, idx) => !showUnfinished ? variants : variants.filter((v, i) => (prepsCompleted[variantIds[idx][i]] ? v : null))));
  }
  

  ///////////////////////////////// HTML /////////////////////////////////

  return (

    // CONTAINER
    <View className="flex-1 items-center justify-center bg-zinc100 border-0.5 space-y-7">      

      {/* Grid */}
      <View className="flex flex-col h-5/6 w-11/12 bg-zinc700 border-2 border-black">

        {/* HEADER */}
        <View className="flex flex-row justify-center items-center bg-theme900 w-full h-[50px] border-b-2">
          
          {/* Meal Prep */}
          <View className="flex justify-center items-center w-1/3 h-full border-r-[1px]">
            <Text className="text-white font-bold text-center">
              MEAL PREP
            </Text>
          </View>

          {/* Amount - available and remaining */}
          <View className="flex justify-center items-center w-1/4 h-full border-r-0.5">
            <Text className="text-white font-bold text-center">
              AMOUNT
            </Text>
            {/* calculates the total number of recipes */}
            <Text className="text-white text-[12px] text-center italic">
              {filteredRemaining.flat().reduce((sum, num) => (num > 0 ? sum + num : sum), 0)}
              {" / "}
              {filteredAvailable.flat().reduce((sum, num) => (num > 0 ? sum + num : sum), 0)}
              {" left"}
            </Text>
          </View>

          {/* Dates used - list */}
          <View className="flex justify-center items-center w-5/12 h-full">
            <Text className="text-white font-bold text-center">
              DATES USED
            </Text>
            <Text className="text-white text-[12px] text-center italic">
              future dates only
            </Text>
          </View>
        </View>


        {/* SCROLLABLE CONTENT */}
        <View className="flex-1 mt-[0.5px]">
          {prepData.length > 0
          ?
            <ScrollView>
              {/* maps over the list of all meal preps */}
              {prepData?.map(prep => ({...prep, variants: showUnfinished ? prep?.variants : prep?.variants?.map(v => (prepsCompleted?.[v?.variantId] ? v : null))})).map((prep, index) => (
                <View key={index}>
                  {prep?.variants?.map((v, idx) => (
                    <View key={idx}>
                      {v !== null && (
                        <View className="flex flex-row justify-center w-full border-b-[1px] min-h-[70px] border-black">
                      
                          {/* Meal Prep Name & Modal */}
                          <TouchableOpacity
                            onPress={() => displayMeal(index, idx)}
                            activeOpacity={0.6}
                            className={`flex flex-col justify-center items-center space-y-2 w-1/3 py-3 px-2 ${(prepsCompleted === null || prepsCompleted?.[v.variantId]) ? "bg-theme700" : "bg-mauve800"}`}
                          >
                            <Text className="text-white text-[12px] font-bold text-center">
                              {prep.prepName}
                            </Text>

                            {/* variant indicator */}
                            {(prepData[index].variants.length > 1) && (
                              <Text className="text-theme200 text-[10px] font-bold text-center italic">
                                {`VARIANT ${numberToRoman(idx + 1)}`}
                              </Text>
                            )}
                          </TouchableOpacity>

                          {/* Amounts */}
                          <View className="bg-zinc350 justify-center items-center w-1/4 space-y-1.5">
                            {/* available */}
                            <View>
                              <Text className="text-[12px] font-semibold">
                                {(filteredAvailable?.[index]?.[idx] && filteredAvailable[index][idx].length !== 0) ? filteredAvailable[index][idx] : "0"} {"available"}
                              </Text>
                            </View>

                            {/* remaining */}
                            <View>
                              <Text className={`text-[12px] font-semibold ${(filteredRemaining?.[index]?.[idx] < 0) ? "text-mauve700" : (filteredRemaining?.[index]?.[idx] === 0) ? "text-yellow-700" : (filteredRemaining?.[index]?.[idx] > 0) ? "text-green-700" : "text-black"}`}>
                                {(filteredRemaining?.[index]?.[idx] && filteredRemaining[index][idx].length !== 0) ? filteredRemaining[index][idx] : "0"} {"remaining"}
                              </Text>
                            </View>
                          </View>

                          {/* List of Dates Used */}
                          {(filteredDates?.[index]?.[idx] && filteredDates[index][idx].length !== 0) ? (
                            <View className="bg-zinc400 justify-center py-1.5 items-left w-5/12">
                              <View className="flex-1 justify-start items-start">
                                <Text className="pl-1.5">
                                  {filteredDates[index][idx].map((date, i) => {
                                    const parts = date.split("  ");             // split by double space
                                    const expanded = parts[0]?.trim() || date;  // text before the double space
                                    const meal = parts[1]?.trim() || '';        // text after the double space
                                    
                                    // maps out "www m/d/yy TYPE"
                                    return (
                                      <Text key={i} className="flex justify-center items-center">
                                        <Text className={`flex text-[14px] font-semibold ${(expanded.split(" ")[1] === `${today.month}/${today.day}/${today.year.toString().slice(-2)}`) ? "text-zinc800" : "text-theme900"}`}>
                                          {"• "}
                                        </Text>
                                        <Text className={`text-[12px] ${(expanded.split(" ")[1] === `${today.month}/${today.day}/${today.year.toString().slice(-2)}`) && "line-through decoration-zinc800 italic text-mauve900"}`}>
                                          {expanded}
                                        </Text>
                                        <Text className={`flex text-[11px] font-semibold ${(expanded.split(" ")[1] === `${today.month}/${today.day}/${today.year.toString().slice(-2)}`) ? "line-through decoration-zinc800 italic text-mauve900" : "text-theme900"}`}>
                                          {'  '}{meal}
                                        </Text>
                                        <Text>
                                          {filteredDates[index][idx][i + 1] ? '\n' : ''}
                                        </Text>
                                      </Text>
                                    );
                                  })}
                                </Text>
                              </View>
                            </View>
                          ) : (
                            // if there are no dates, simply a line
                            <View className="bg-zinc400 justify-center py-1.5 items-center w-5/12">
                              <Text className="text-[13px]">
                                ───
                              </Text>
                            </View>
                          )}
                        </View>
                      )} 
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          :
            // if there are no current meal preps
            <View className="flex w-full h-full justify-center items-center">
              <Text className="text-theme400 italic font-bold">
                NO MEAL PREPS AVAILABLE
              </Text>
            </View>
          }
        </View>
              

        {/* UNFINISHED INDICATOR */}
        {(prepData.length !== 0) && (
          <View className="flex flex-row z-20 justify-center items-center space-x-3 bg-zinc900 border-t-2 mt-[-1px] pb-[2px] h-[30px]">

            {/* text */}
            <Text className="font-bold text-[12px] text-zinc300 italic">
              {showUnfinished ? "SHOWING UNFINISHED" : "HIDING UNFINISHED"}
            </Text>

            {/* toggle button */}
            <View className="justify-center items-center" style={ showUnfinished ? null : { transform: [{ scaleX: -1 }] } }>
              <Icon
                name="toggle"
                size={20}
                color={colors.zinc100}
                onPress={() => changeUnfinished()}
              />
            </View>
          </View>
        )}


        {/* Modal to Display a Meal */}
        {mealModalVisible && (
          <MealOverviewModal
            data={mealModalData}
            modalVisible={mealModalVisible}
            setModalVisible={setMealModalVisible}
          />
        )}
      </View>
    </View>
  );
}