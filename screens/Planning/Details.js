///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useRef, useState, useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';

// UI components
import { View, Text, ScrollView, TouchableOpacity} from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// modals
import MealOverviewModal from '../../components/Planning/MealOverviewModal';

// initialize firebase app
import { getFirestore, collection, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

export default function Details ({ isSelectedTab }) {
  

  ///////////////////////////////// NAVIGATION LOGIC /////////////////////////////////

  // if the tab has changed, refresh the data from the globals
  useEffect(() => {
    
    if (isSelectedTab) {
      updatePreps();
    }
  }, [isSelectedTab])

  const previousIndexRef = useRef(null);
  const currentIndex = useNavigationState((state) => state.index);

  // if the screen has changed
  useEffect(() => {
    
    // if the page has changed to the current one, refetch the current data from the globals
    if (isSelectedTab && previousIndexRef !== null && previousIndexRef.current !== currentIndex && currentIndex === 2) {
      setTimeout(() => {
        updatePreps();
      }, 1000);
    }

    // updates the ref to the new index
    previousIndexRef.current = currentIndex;
  }, [currentIndex]);

  
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
  const [prepsIds, setPrepsIds] = useState(null);
  const [prepsCompleted, setPrepsCompleted] = useState(null);

  // updates the current list of meal preps
  const updatePreps = async () => {

    // gets the collection of meal preps
    const querySnapshot = await getDocs(collection(db, 'PREPS'));

    // reformats each one
    const prepsArray = querySnapshot.docs.map((doc) => {
      const formattedPrep = {
        id: doc.id,
        ... doc.data(),
      };
      return formattedPrep;
    })
    .sort((a, b) => a.prepName.localeCompare(b.prepName)); // sorts by prepName alphabetically

    setPrepData(prepsArray);
                
    // gets current global prep info
    const prep = await getDoc(doc(db, 'GLOBALS', 'prep'));
    
    // stores it
    setShowUnfinished(prep.data().unfinished)
    setPrepsIds(prep.data().preps.map((doc) => doc.id));
    setPrepsCompleted(prep.data().preps.map((doc) => doc.completed));
  }
  

  ///////////////////////////////// MULTIPLICITY /////////////////////////////////

  const [currAvailable, setCurrAvailable] = useState([]);   // the amounts available from the multiplicity
  const [currRemaining, setCurrRemaining] = useState([]);   // the amounts remaining from the number of times each prep is listed
  const [currDates, setCurrDates] = useState([]);           // the future dates the preps are listed under

  // to calculate the amounts available and remaining of the provided meal prep
  const calcCurrAmounts = async (currPrepData) => {
    
    // if the meal prep is valid
    if (currPrepData) {

      // the meal prep ids
      const prepIds = currPrepData.map((prep) => prep.id);

      // for calculations of the three prior states
      const available = currPrepData.map((prep) => (prep.prepMult !== "" ? prep.prepMult : 0));
      let remaining = currPrepData.map((prep) => (prep.prepMult !== "" ? prep.prepMult : 0));
      const dates = available.map(() => []);
      
      // gets all current ingredient data
      const plansCollectionRef = collection(db, 'PLANS');
      const plansSnapshot = await getDocs(plansCollectionRef);

      // loops over the meal preps
      for (let i = 0; i < available.length; i++) {

        // loops over all weekly plans
        plansSnapshot.forEach(async (planDoc) => {

          // gets the current plan data
          const planData = planDoc.data();
          const planId = planDoc.id;
          
          // if the date of the current plan is on or after today
          if (planId >= today.dateString) {

            // if the current meal prep id is stores in the plan's lunch
            if (planData.meals.lunch.prepId === prepIds[i]) { 
              // decrement the number of remaining preps and store the date
              remaining[i] = planId > today.dateString ? remaining[i] - 1 : remaining[i];
              dates[i].push(formatDateExtended(planId) + "  LUNCH");
            }

            // if the current meal prep id is stores in the plan's dinner
            if (planData.meals.dinner.prepId === prepIds[i]) { 
              // decrement the number of remaining preps and store the date
              remaining[i] = planId > today.dateString ? remaining[i] - 1 : remaining[i];                          
              dates[i].push(formatDateExtended(planId) + "  DINNER");
            }
          }
        });
      }
    
      // sets the states
      setCurrAvailable(available);
      setFilteredAvailable(available.filter((_, idx) => showUnfinished ? true : prepsCompleted?.[prepsIds?.indexOf(prepData[idx].id)]));
      
      setCurrRemaining(remaining);
      setFilteredRemaining(remaining.filter((_, idx) => showUnfinished ? true : prepsCompleted?.[prepsIds?.indexOf(prepData[idx].id)]));
      
      setCurrDates(dates);
      setFilteredDates(dates.filter((_, idx) => showUnfinished ? true : prepsCompleted?.[prepsIds?.indexOf(prepData[idx].id)]));
    }
  }

  // calls the previous function when the meal prep data is modified
  useEffect(() => {
    calcCurrAmounts(prepData);
  }, [prepData])
  
  
  ///////////////////////////////// MEAL MODAL /////////////////////////////////

  const [mealModalVisible, setMealModalVisible] = useState(false);
  const [mealModalData, setMealModalData] = useState(null);

  // when a touchable opacity for a meal is clicked, store the data
  const displayMeal = (index) => {

    // only opens the modal and stores data if there is data
    if (prepData !== null) {
      setMealModalData(prepData.filter(prep => (showUnfinished ? true : prepsCompleted?.[prepsIds?.indexOf(prep.id)]))[index]);
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
    setFilteredAvailable(currAvailable.filter((_, idx) => !showUnfinished ? true : prepsCompleted?.[prepsIds?.indexOf(prepData[idx].id)]));
    setFilteredRemaining(currRemaining.filter((_, idx) => !showUnfinished ? true : prepsCompleted?.[prepsIds?.indexOf(prepData[idx].id)]));
    setFilteredDates(currDates.filter((_, idx) => !showUnfinished ? true : prepsCompleted?.[prepsIds?.indexOf(prepData[idx].id)]));
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
              {filteredRemaining.reduce((sum, num) => (num > 0 ? sum + num : sum), 0)}
              {" / "}
              {filteredAvailable.reduce((sum, num) => (num > 0 ? sum + num : sum), 0)}
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
              {prepData.filter(prep => (showUnfinished ? true : prepsCompleted?.[prepsIds?.indexOf(prep.id)])).map((data, index) => (
                <View
                  key={index}
                  className="flex flex-row justify-center items-center w-full h-[70px] border-b-[1px] border-black"
                >
                  {/* Meal Prep Name & Modal */}
                  <TouchableOpacity
                    onPress={() => displayMeal(index)}
                    activeOpacity={0.6}
                    className={`flex flex-col justify-center items-center w-1/3 h-full px-1 ${(prepsCompleted === null || prepsCompleted?.[prepsIds?.indexOf(data.id)]) ? "bg-theme700" : "bg-mauve800"}`}
                  >
                    <Text className="text-white text-[12px] font-bold text-center">
                      {data.prepName}
                    </Text>
                  </TouchableOpacity>


                  {/* Amounts */}
                  <View className="bg-zinc350 justify-center items-center w-1/4 h-full space-y-1.5">
                    
                    {/* available */}
                    <View>
                      <Text className="text-[12px] font-semibold">
                        {(filteredAvailable[index] !== undefined && filteredAvailable[index].length !== 0) ? filteredAvailable[index] : "0"} {"available"}
                      </Text>
                    </View>

                    {/* remaining */}
                    <View>
                      <Text className={`text-[12px] font-semibold ${(filteredRemaining[index] !== undefined && filteredRemaining[index] < 0) ? "text-mauve700" : (filteredRemaining[index] !== undefined && filteredRemaining[index] === 0) ? "text-yellow-700" : (filteredRemaining[index] !== undefined && filteredRemaining[index] > 0) ? "text-green-700" : "text-black"}`}>
                        {(filteredRemaining[index] !== undefined && filteredRemaining[index].length !== 0) ? filteredRemaining[index] : "0"} {"remaining"}
                      </Text>
                    </View>
                  </View>

                  {/* List of Dates Used */}
                  {filteredDates[index] !== undefined && filteredDates[index].length !== 0 ? 
                    <View className="bg-zinc400 justify-center py-1.5 items-left w-5/12 h-full">
                      
                      {/* scrollable */}
                      <ScrollView
                        vertical
                        scrollEventThrottle={16}
                        contentContainerStyle={{ flexDirection: 'row' }}
                      >
                        <Text className="pl-1.5">
                          {filteredDates[index].map((date, idx) => {
                            const parts = date.split("  "); // Split by double space
                            const expanded = parts[0]?.trim() || date; // Text before the double space
                            const meal = parts[1]?.trim() || ''; // Text after the double space
                            
                            // maps out "www m/d/yy TYPE"
                            return (
                              <Text key={idx} className="flex justify-center items-center">
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
                                  {filteredDates[index][idx + 1] ? '\n' : ''}
                                </Text>
                              </Text>
                            );
                          })}
                        </Text>
                      </ScrollView>
                    </View>
                  : 
                    // if there are no dates, simply a line
                    <View className="bg-zinc400 justify-center py-1.5 items-center w-5/12 h-full">
                      <Text className="text-[13px]">
                        ───
                      </Text>
                    </View>
                  }
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