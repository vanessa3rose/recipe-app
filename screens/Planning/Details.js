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

  // on navigation
  const onNav = async () => {

    // processes meal preps
    const querySnapshot = await getDocs(collection(db, 'PREPS'));
    const prepsArray = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => a.prepName.localeCompare(b.prepName));

                
    // gets current global prep info and stores it
    const prep = await getDoc(doc(db, 'GLOBALS', 'prep'));
    const unfinished = prep.data().unfinished;
    setShowUnfinished(unfinished);
    const completed = prep.data().preps.map(p => p.completed).reduce((acc, obj) => ({ ...acc, ...obj }), {} );
    setPrepsCompleted(completed);

    
    // to calculate the amounts
    if (prepsArray) {
      let flattenedPreps = [];
      prepsArray.forEach(prep => {
        prep.variants.map((variant, idx) => {
          flattenedPreps.push({
            id: prep.id,
            prepName: prep.prepName,
            variantData: variant,
            variantIndex: prep.variants.length === 1 ? -1 : idx,
            dates: [],
            remaining: 0,
            available: 0,
          })
        })
      })
      
      // gets all current ingredient data
      const plansSnapshot = await getDocs(collection(db, 'PLANS'));
      const plansArray = plansSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
      const filteredPlans = plansArray.filter(plan => plan.id >= today.dateString);
      
      // loops over the meal prep variants
      flattenedPreps.forEach((prep) => {
        let dates = [];
        let remaining = prep.variantData.prepMult || 0;

        // loops over the filtered plans
        filteredPlans.forEach((plan) => {

          // if the current meal prep id and variant id is stored in the plan's lunch
          if (plan.data.meals.lunch.prepData?.prepId === prep.id && plan.data.meals.lunch.prepData.variantId === prep.variantData.variantId) { 
            // decrement the number of remaining preps and store the date
            remaining = plan.id > today.dateString ? remaining - 1 : remaining;
            dates.push(formatDateExtended(plan.id) + "  LUNCH");
          }

          // if the current meal prep id and variant id is stored in the plan's dinner
          if (plan.data.meals.dinner.prepData?.prepId === prep.id && plan.data.meals.dinner.prepData.variantId === prep.variantData.variantId) { 
            // decrement the number of remaining preps and store the date
            remaining = plan.id > today.dateString ? remaining - 1 : remaining;
            dates.push(formatDateExtended(plan.id) + "  DINNER");
          }
        })
        
        prep.dates = dates;
        prep.remaining = remaining;
        prep.available = prep.variantData.prepMult || 0;
      })

      setPrepData(flattenedPreps);
    }

    setSortType("");
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

  
  ///////////////////////////////// MEAL MODAL /////////////////////////////////

  const [mealModalVisible, setMealModalVisible] = useState(false);
  const [mealModalData, setMealModalData] = useState(null);

  // when a touchable opacity for a meal is clicked, store the data
  const displayMeal = (prep) => {
    // only opens the modal and stores data if there is data
    if (prep !== null) {
      setMealModalData(prep);
      setMealModalVisible(true);
    }
  }
  

  ///////////////////////////////// UNFINISHED /////////////////////////////////
  
  const [showUnfinished, setShowUnfinished] = useState(false);

  // to change the unfinished status (overall) in global
  const changeUnfinished = async () => {
    await updateDoc(doc(db, 'GLOBALS', 'prep'), { 'unfinished': !showUnfinished });
    setShowUnfinished(!showUnfinished);
  }
  

  ///////////////////////////////// DETAILS /////////////////////////////////

  const [showDetails, setShowDetails] = useState(false);
  const [sortType, setSortType] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  

  ///////////////////////////////// HTML /////////////////////////////////

  return (

    // CONTAINER
    <View className="flex-1 items-center justify-center bg-zinc100 border-0.5 space-y-7">  

      {/* Sort */}
      <View className="flex flex-row w-[70%] justify-center rounded-md mt-3 -mb-3 items-center bg-zinc200 border-2 border-zinc300">
        <Text className="font-bold px-3 py-1 border-r-2 border-zinc300 text-theme700">
          SORT BY
        </Text>
        <View className="px-3 py-1.5 flex flex-1 flex-row justify-around items-center">
          {["calories", "price"].map(type => (
            <TouchableOpacity 
              key={type} 
              className={`${(sortType === type) ? "bg-theme200 border-theme200" : "border-theme300"} border-2 py-0.5 px-3 rounded-xl`}
              onPress={() => setSortType(type === sortType ? "" : type)}
            >
              <Text className={`${(sortType === type) ? "text-theme800 font-semibold" : "text-zinc500 font-medium"}`}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity 
          className="font-semibold px-2 py-1 border-l-2 border-zinc300 text-theme800"
          onPress={() => setSortOrder(sortOrder * -1)}
        >
          <Icon
            name={(sortOrder === -1) ? "caret-up" : "caret-down"}
            size={16}
            color={colors.zinc600}
          />
        </TouchableOpacity>
      </View>
      
      {/* Grid */}
      <View className="flex flex-col h-5/6 w-11/12 bg-zinc700 border-2 border-black">

        {/* HEADER */}
        <View className="flex flex-row justify-center items-center bg-theme900 w-full h-[50px] border-b-2">
          
          {/* Meal Prep */}
          <View className="flex flex-row justify-evenly items-center w-1/3 h-full border-r-[1px]">
            <Text className="ml-2 text-white font-bold text-center">
              MEAL PREP
            </Text>

            <View className="">
              <Icon
                name={showDetails ? "information-circle" : "information"}
                size={16}
                color={colors.zinc300}
                onPress={() => setShowDetails(!showDetails)}
              />
            </View>
          </View>

          {/* Amount - available and remaining */}
          <View className="flex justify-center items-center w-1/4 h-full border-r-0.5">
            <Text className="text-white font-bold text-center">
              AMOUNT
            </Text>
            {/* calculates the total number of recipes */}
            <Text className="text-white text-[12px] text-center italic">
              {prepData.filter(prep => showUnfinished ? true : prepsCompleted[prep.variantData.variantId]).map(prep => prep.remaining).flat().reduce((sum, num) => (num > 0 ? sum + num : sum), 0)}
              {" / "}
              {prepData.filter(prep => showUnfinished ? true : prepsCompleted[prep.variantData.variantId]).map(prep => prep.available).flat().reduce((sum, num) => (num > 0 ? sum + num : sum), 0)}
              {" left"}
            </Text>
          </View>

          {/* Dates used - list */}
          <View className="flex justify-center items-center w-5/12 h-full">
            <View className="flex flex-col">
              <Text className="text-white font-bold text-center">
                DATES USED
              </Text>
              <Text className="text-white text-[12px] text-center italic">
                future dates only
              </Text>
            </View>
          </View>
        </View>


        {/* SCROLLABLE CONTENT */}
        <View className="flex-1 mt-[0.5px] overflow-visible">
          {prepData.length > 0
          ?
            <ScrollView>
              {/* maps over the list of all meal preps */}
              {(() => {
                const sorted = prepData
                  .filter(prep => showUnfinished || prepsCompleted[prep.variantData.variantId])
                  .sort((a,b) => ((sortType === "") ? a : (sortType === "calories") ? a.variantData.prepCal.localeCompare(b.variantData.prepCal) : a.variantData.prepPrice.localeCompare(b.variantData.prepPrice)));
                if (sortOrder === -1) sorted.reverse();
                return sorted.map((prep, index) => (
                  <View key={index} className="overflow-visible flex flex-row justify-center w-full border-b-[1px] min-h-[70px] border-black">
                    
                    {/* Meal Prep Name & Modal */}
                    <TouchableOpacity
                      onPress={() => displayMeal(prep)}
                      activeOpacity={0.6}
                      className={`flex flex-col justify-center items-center space-y-2 w-1/3 py-3 px-2 ${(prepsCompleted === null || prepsCompleted?.[prep.variantData.variantId]) ? "bg-theme700" : "bg-mauve800"}`}
                    >
                      <Text className="text-white text-[12px] font-bold text-center">
                        {prep.variantData.prepName}
                      </Text>

                      {/* variant indicator */}
                      {(!showDetails && prep.variantIndex !== -1) ? (
                        <Text className="text-theme200 text-[10px] font-bold text-center italic">
                          {`VARIANT ${numberToRoman(prep.variantIndex + 1)}`}
                        </Text>
                      ) : showDetails && (
                        <Text className="text-theme200 text-[11px] font-bold text-center italic">
                          {`${prep.variantData.prepCal} cal   |   $${prep.variantData.prepPrice}`}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* Amounts */}
                    <View className="bg-zinc350 justify-center items-center w-1/4 space-y-1.5">
                      {/* available */}
                      <View>
                        <Text className="text-[12px] font-semibold">
                          {prep.available} {"available"}
                        </Text>
                      </View>

                      {/* remaining */}
                      <View>
                        <Text className={`text-[12px] font-semibold ${(prep.remaining < 0) ? "text-mauve700" : (prep.remaining === 0) ? "text-yellow-700" : (prep.remaining > 0) ? "text-green-700" : "text-black"}`}>
                          {prep.remaining} {"remaining"}
                        </Text>
                      </View>
                    </View>

                    {/* List of Dates Used */}
                    {(prep.dates?.length !== 0) ? (
                      <View className="bg-zinc400 justify-center py-1.5 items-left w-5/12">
                        <View className="flex-1 justify-start items-start">
                          <Text className="pl-1.5">
                            {prep.dates.map((date, i) => {
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
                                    {prep.dates[i + 1] ? '\n' : ''}
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
                ));
              })()}
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
            data={mealModalData.variantData}
            modalVisible={mealModalVisible}
            setModalVisible={setMealModalVisible}
          />
        )}
      </View>
    </View>
  );
}