///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useRef, useState, useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';

import { View, Text, TouchableOpacity } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

import colors from '../../assets/colors';
import Icon from 'react-native-vector-icons/Ionicons';

import CalendarModal from '../../components/Planning-Plan/CalendarModal';
import MealDetailsModal from '../../components/Planning-Plan/MealDetailsModal';
import MealSearchModal from '../../components/Planning-Plan/MealSearchModal';
import MealOverviewModal from '../../components/Planning/MealOverviewModal';
import RadioWarningModal from '../../components/Planning-Plan/RadioWarningModal';

// Fractions
var Fractional = require('fractional').Fraction;

// Initialize Firebase App
import { getFirestore, collection, getDoc, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

export default function WeeklyPlan ({ isSelectedTab }) {
  

  ///////////////////////////////// NAVIGATION LOGIC /////////////////////////////////

  // if the tab has changed, refresh the data from the globals
  useEffect(() => {
    if (isSelectedTab) {
      setSelectedPrepId(null);
      updatePreps();
      fetchGlobalPlan();
    }
  }, [isSelectedTab])

  const previousIndexRef = useRef(null);
  const currentIndex = useNavigationState((state) => state.index);

  // if the screen has changed
  useEffect(() => {
    
    // if the page has changed to the current one, refetch the current data from the globals
    if (isSelectedTab && previousIndexRef !== null && previousIndexRef.current !== currentIndex && currentIndex === 2) {
      setTimeout(() => {
        setSelectedPrepId(null);
        updatePreps();
        fetchGlobalPlan();
      }, 1000);
    }

    // updates the ref to the new index
    previousIndexRef.current = currentIndex;
  }, [currentIndex]);
  

  ///////////////////////////////// GLOBALS /////////////////////////////////

  const [globalDate, setGlobalDate] = useState(today);

  // gets the weekly plan document data from the globals collection
  const fetchGlobalPlan = async () => {
    
    try {

      // gets the global weekly plan document
      const planDoc = ((await getDoc(doc(db, 'globals', 'plan'))));
      if (planDoc.exists()) {

        // if the data is not null, calculate the week range of the global date
        if (planDoc.data().selectedDate) {
          calculateWeekRange(planDoc.data().selectedDate);
          setGlobalDate(planDoc.data().selectedDate);
          setSelectedList((planDoc).data().selectedList); 

        // otherwise, calculate the week range of today
        } else {
          calculateWeekRange({ dateString: new Date().toISOString().split('T')[0] });
        }

      } else {
        console.error('No such document in Firestore!');
      }
    } catch (error) {
      console.error('Error fetching meal prep document:', error);
    }
  };

  // to change the data of the prep document under the global collection
  const changeGlobalPlan = async (date) => {
    setGlobalDate(date); // stores the new date in the state
    updateDoc(doc(db, 'globals', 'plan'), { selectedDate: date });
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

  // to format the given date as "mm/dd/yy"
  const formatDateShort = (currDate) => {
    const mm = currDate.getMonth() + 1; // Months are 0-based
    const dd = currDate.getDate();
    const yy = currDate.getFullYear() % 100;
    
    return `${mm}/${dd}/${yy}`;
  };

  const formatDateMed = (currDate) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = days[currDate.getDay()];
  
    const mm = currDate.getMonth() + 1; // Months are 0-based
    const dd = currDate.getDate();
    const yy = currDate.getFullYear() % 100;
    
    return `${dayName} ${mm}/${dd}/${yy}`;
  };

  // to format the given date as "mmmm d"
  const formatDateLong = (currDate) => {

    const monthNames = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];
    
    const mm = monthNames[currDate.getMonth()];
    const dd = currDate.getDate();
    
    return `${mm} ${dd}`;
  };


  ///////////////////////////////// WEEK SELECTION /////////////////////////////////

  const [weekRange, setWeekRange] = useState(["", "", "", "", "", "", ""]);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);

  // to calculate the week range of the given date
  const calculateWeekRange = (selectedDate) => {

    // parses the date so it is in the right format
    const date = new Date(`${selectedDate.dateString}T00:00:00`);
    
    // day of the week
    const dayOfWeek = date.getDay();
    
    // calculates the Sunday of the current week
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - dayOfWeek);
    
    // calculates the Monday of the current week
    const monday = new Date(sunday);
    monday.setDate(sunday.getDate() + 1);
    
    // calculates the Tuesday of the current week
    const tuesday = new Date(sunday);
    tuesday.setDate(sunday.getDate() + 2);
    
    // calculates the Wednesday of the current week
    const wednesday = new Date(sunday);
    wednesday.setDate(sunday.getDate() + 3);
    
    // calculates the Thursday of the current week
    const thursday = new Date(sunday);
    thursday.setDate(sunday.getDate() + 4);
    
    // calculates the Friday of the current week
    const friday = new Date(sunday);
    friday.setDate(sunday.getDate() + 5);
    
    // calculates the Saturday of the current week
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    
    // sets the range in the state
    setWeekRange([sunday, monday, tuesday, wednesday, thursday, friday, saturday]);
  }; 

  // to close the calendar popup
  const closeCalendarModal = (selectedDate) => {
    // unshows the modal
    setCalendarModalVisible(false);

    // if the selected date is valid
    if (selectedDate) {
      changeGlobalPlan(selectedDate);     // updates the date of the plan in the global doc
      calculateWeekRange(selectedDate);   // calculates the new week range
    }
  };


  // to select the next or prev week
  const toggleWeek = (prev) => {

    // adjusts the current date by 7 days depending on the `prev` value
    const dateToFormat = new Date(weekRange[0]);
    dateToFormat.setDate(dateToFormat.getDate() + (prev ? -7 : 7));
  
    // formats the adjusted date
    const formattedDate = {
      dateString: dateToFormat.toISOString().split('T')[0],
      day: dateToFormat.getDate(),
      month: dateToFormat.getMonth() + 1,
      timestamp: dateToFormat.getTime(),
      year: dateToFormat.getFullYear(),
    };
  
    changeGlobalPlan(formattedDate);     // updates the date of the plan in the global doc
    calculateWeekRange(formattedDate);   // calculates the new week range
  };


  ///////////////////////////////// WEEK DATA /////////////////////////////////

  // the plans for the 7 days of the week
  const [weekData, setWeekData] = useState([null, null, null, null, null, null, null]);

  // to get the 14 meal preps of the current week
  const getCollectionPlans = async () => {
    
    // null array at first
    const data = [null, null, null, null, null, null, null];
    
    // loops over the 7 days
    for (let i = 0; i < 7; i++) {
      
      // stores the current day's id
      const id = (new Date(weekRange[i])).toLocaleDateString('en-CA');
      
      // gets the day's plan data
      const planDocSnap = await getDoc(doc(db, 'plans', id));
      data[i] = planDocSnap.exists() ? planDocSnap.data() : null;
    }
    
    // once finished looping, set the week's data
    setWeekData(data);
    
    // recalculates the number of remaining meal preps based on the selected meal prep in the dropdown
    calcRemaining(selectedPrepId, prepData[(prepData.map((prep) => prep.id)).indexOf(selectedPrepId)]);
  }

  // calls the previous function when changing the week range
  useEffect(() => {
    getCollectionPlans();
  }, [weekRange]);
  

  ///////////////////////////////// CHECKBOXES /////////////////////////////////

  // whether all 14 of the checkboxes are to be checked
  const [isAllChecked, setIsAllChecked] = useState(false);

  // when the previous state changes, due to the checkbox at the top
  useEffect(() => {

    // stores that all 7 days of the week are either checked or not
    const checked = [isAllChecked, isAllChecked, isAllChecked, isAllChecked, isAllChecked, isAllChecked, isAllChecked];

    // updates both lunch and dinner checkboxes in the grid
    setIsLunchChecked(checked);
    setIsDinnerChecked(checked);

  }, [isAllChecked]);

  // the 14 checkboxes in the grid
  const [isLunchChecked, setIsLunchChecked] = useState([false, false, false, false, false, false, false]);
  const [isDinnerChecked, setIsDinnerChecked] = useState([false, false, false, false, false, false, false]);
  
  // to update a specific lunch checkbox
  const checkLunch = (index) => {
    
    // stores the given current price at the given index
    setIsLunchChecked((prevState) => {
      const updatedChecks = [...prevState];
      updatedChecks[index] = !isLunchChecked[index];
      return updatedChecks;
    });
  }

  // to update a specific dinner checkbox
  const checkDinner = (index) => {
    
    // stores the given current price at the given index
    setIsDinnerChecked((prevState) => {
      const updatedChecks = [...prevState];
      updatedChecks[index] = !isDinnerChecked[index];
      return updatedChecks;
    });
  }

  // to toggle all days including the selected prep
  const checkCurrent = () => {

    // the current checkboxes
    let lunchChecked = [...isLunchChecked];
    let dinnerChecked = [...isDinnerChecked];

    // determines whether to toggle on or off
    const numMatching = weekData.filter(data => data?.meals?.lunch?.prepId === selectedPrepId).length + weekData.filter(data => data?.meals?.dinner?.prepId === selectedPrepId).length;
    const numChecked = weekData.filter((data, index) => data?.meals?.lunch?.prepId === selectedPrepId && isLunchChecked[index]).length + weekData.filter((data, index) => data?.meals?.dinner?.prepId === selectedPrepId && isDinnerChecked[index]).length
    const toggle = numMatching - numChecked >= numMatching / 2;
    
    // loops over each day
    weekData.forEach((data, index) => {
      if (data?.meals?.lunch?.prepId === selectedPrepId) { lunchChecked[index] = toggle; }
      if (data?.meals?.dinner?.prepId === selectedPrepId) { dinnerChecked[index] = toggle; }
    })
    
    // stores data
    setIsLunchChecked(lunchChecked);
    setIsDinnerChecked(dinnerChecked);
  }


  ///////////////////////////////// MEAL PREP BUTTON TOGGLING /////////////////////////////////

  // for when the check button is selected next to the prep dropdown
  const submitCheckedPrep = async () => {

    try {
      // initializes a write batch
      const batch = writeBatch(db);
    
      // if a meal prep has been selected from the dropdown
      if (selectedPrepId) {

        let ogSelected = [...selectedList];
          
        // gets the data of the selected meal prep
        const docSnap = await getDoc(doc(db, 'preps', selectedPrepId));   
        const selectedPrepData = docSnap.exists() ? docSnap.data() : null;

        // loops over the 7 days of the week
        for (let index = 0; index < 7; index++) {
          
          // gets the state's week data of the curr index
          const planDate = (new Date(weekRange[index])).toLocaleDateString('en-CA');
          const planData = weekData[index];

          // prepares the doc data
          const docData = {
            date: planDate,
            meals: {
              lunch: {
                prepId: isLunchChecked[index] ? selectedPrepId : planData?.meals?.lunch?.prepId ?? null,          
                prepData: isLunchChecked[index] ? selectedPrepData : planData?.meals?.lunch?.prepData ?? null,
              },
              dinner: {
                prepId: isDinnerChecked[index] ? selectedPrepId : planData?.meals?.dinner?.prepId ?? null,         
                prepData: isDinnerChecked[index] ? selectedPrepData : planData?.meals?.dinner?.prepData ?? null,
              },
            },
          };

          // adds the set operation to the batch if the data has changed
          if (isLunchChecked[index] || isDinnerChecked[index]) {
            batch.set(doc(db, 'plans', planDate), docData);
          }

          // LUNCH - toggles the radio button if needed
          if (isLunchChecked[index]) { 
            ogSelected = ogSelected.filter(item => item.meal !== ("LUNCH " + new Date(weekRange[index]))); // removes original
            ogSelected.push({ filled: true, meal: "LUNCH " + new Date(weekRange[index]), });               // readds it
          // DINNER - toggles the radio button if needed
          } if (isDinnerChecked[index]) { 
            ogSelected = ogSelected.filter(item => item.meal !== ("DINNER " + new Date(weekRange[index]))); // removes original
            ogSelected.push({ filled: true, meal: "DINNER " + new Date(weekRange[index]), });               // readds it
          }
        }
         
        // stores the new list
        setSelectedList(ogSelected);
        updateDoc(doc(db, 'globals', 'plan'), { selectedList: ogSelected }); 

        // commits the batch
        await batch.commit();
      
        // refreshes and updates the dropdown amounts
        fetchDropdownItems();
        getCollectionPlans();
      }

    } catch (error) {
      console.error('Error updating weekly plans:', error);
    }
  }

  // for when the 'x' button is selected next to the prep dropdown
  const clearCheckedPrep = async () => {

    try {
      // initializes a write batch
      const batch = writeBatch(db);

      // loops over the 7 days of the week
      for (let index = 0; index < 7; index++) {
        
        // gets the state's week data of the curr index
        const planDate = (new Date(weekRange[index])).toLocaleDateString('en-CA');
        const planData = weekData[index];

        // prepares the doc data
        const docData = {
          date: planDate,
          meals: {
            lunch: {
              prepId: isLunchChecked[index] ? null : planData?.meals?.lunch?.prepId ?? null,          
              prepData: isLunchChecked[index] ? null : planData?.meals?.lunch?.prepData ?? null,
            },
            dinner: {
              prepId: isDinnerChecked[index] ? null : planData?.meals?.dinner?.prepId ?? null,         
              prepData: isDinnerChecked[index] ? null : planData?.meals?.dinner?.prepData ?? null,
            },
          },
        };

        // adds the set operation to the batch if the data has changed
        if (isLunchChecked[index] || isDinnerChecked[index]) {
          batch.set(doc(db, 'plans', planDate), docData);
        }
      }

      // commits the batch
      await batch.commit();

      // refreshes
      getCollectionPlans();
      
      // updates the dropdown amounts
      fetchDropdownItems();

    } catch (error) {
      console.error('Error updating weekly plans:', error);
    }
  }

  // for when the 'swap' button is selected next to the prep dropdown
  const swapCheckedPrep = async () => {

    try {

      let ogSelected = [...selectedList];

      // initializes a write batch
      const batch = writeBatch(db);

      // loops over the 7 days of the week
      let detailsOne = null;
      let detailsTwo = null;

      for (let index = 0; index < 7; index++) {
        
        if (isLunchChecked[index] && !detailsOne) {
          detailsOne = { date: (new Date(weekRange[index])).toLocaleDateString('en-CA'), meal: "LUNCH", data: weekData[index].meals.lunch, otherData: weekData[index].meals.dinner };
        } else if (isLunchChecked[index] && detailsOne) {
          detailsTwo = { date: (new Date(weekRange[index])).toLocaleDateString('en-CA'), meal: "LUNCH", data: weekData[index].meals.lunch, otherData: weekData[index].meals.dinner };
        }
        
        if (isDinnerChecked[index] && !detailsOne) {
          detailsOne = { date: (new Date(weekRange[index])).toLocaleDateString('en-CA'), meal: "DINNER", data: weekData[index].meals.dinner, otherData: weekData[index].meals.lunch };
        } else if (isDinnerChecked[index] && detailsOne) {
          detailsTwo = { date: (new Date(weekRange[index])).toLocaleDateString('en-CA'), meal: "DINNER", data: weekData[index].meals.dinner, otherData: weekData[index].meals.lunch };
        }
      }

      // IF THE SWAP HAPPENS ON ONLY ONE DAY
      if (detailsOne.date === detailsTwo.date) {
        
        // swaps the id meal if the first one is custom
        if (detailsOne.meal === "LUNCH" && detailsOne?.data?.prepId?.includes("LUNCH")) {
          detailsOne.data.prepId = detailsOne.data.prepId.replace("LUNCH", "DINNER");
        } else if (detailsOne.meal === "DINNER" && detailsOne?.data?.prepId?.includes("DINNER")) {
          detailsOne.data.prepId = detailsOne.data.prepId.replace("DINNER", "LUNCH");
        }

        // swaps the id meal if the second one is custom
        if (detailsTwo.meal === "LUNCH" && detailsTwo?.data?.prepId?.includes("LUNCH")) {
          detailsTwo.data.prepId = detailsTwo.data.prepId.replace("LUNCH", "DINNER");
        } else if (detailsTwo.meal === "DINNER" && detailsTwo?.data?.prepId?.includes("DINNER")) {
          detailsTwo.data.prepId = detailsTwo.data.prepId.replace("DINNER", "LUNCH");
        }

        // only one swap in the db is needed for a single day
        const swappedDay = {
          date: detailsOne.date,
          meals: {
            lunch: detailsOne.meal === "LUNCH" ? detailsTwo.data : detailsOne.data,
            dinner: detailsOne.meal === "DINNER" ? detailsTwo.data : detailsOne.data,
          },
        };

        batch.set(doc(db, 'plans', detailsOne.date), swappedDay);

        // reformatting date
        const [year, month, day] = detailsOne.date.split("-").map(Number);
        const longDate = new Date(year, month - 1, day);
        
        // unchecks the radio button for lunch if custom
        if (swappedDay.meals?.lunch?.prepId?.includes("LUNCH")) {
          ogSelected = ogSelected.filter(item => item.meal !== ("LUNCH " + longDate));
        // checks the radio button for lunch if not
        } else if (swappedDay.meals?.lunch?.prepId) {
          ogSelected = ogSelected.filter(item => item.meal !== ("LUNCH " + longDate));
          ogSelected.push({ filled: true, meal: "LUNCH " + longDate });
        }
        
        // unchecks the radio button for dinner if custom
        if (swappedDay.meals?.dinner?.prepId?.includes("DINNER")) {
          ogSelected = ogSelected.filter(item => item.meal !== ("DINNER " + longDate));
        // checks the radio button for dinner if not
        } else if (swappedDay.meals?.dinner?.prepId) {
          ogSelected = ogSelected.filter(item => item.meal !== ("DINNER " + longDate));
          ogSelected.push({ filled: true, meal: "DINNER " + longDate });
        }
      
      
      // IF IT HAPPENS ON TWO SEPARATE DAYS
      } else {

        // first day
        let swappedDayOne = {
          date: detailsOne.date,
          meals: {
            lunch: detailsOne.meal === "LUNCH" ? detailsTwo.data : detailsOne.otherData,
            dinner: detailsOne.meal === "DINNER" ? detailsTwo.data : detailsOne.otherData,
          },
        };

        // second day
        let swappedDayTwo = {
          date: detailsTwo.date,
          meals: {
            lunch: detailsTwo.meal === "LUNCH" ? detailsOne.data : detailsTwo.otherData,
            dinner: detailsTwo.meal === "DINNER" ? detailsOne.data : detailsTwo.otherData,
          },
        };
        
        // swaps the id meal if the first lunch is custom
        if (swappedDayOne?.meals?.lunch?.prepId?.includes("DINNER")) {
          swappedDayOne.data.prepId = swappedDayOne.data.prepId.replace("DINNER", "LUNCH");
        // swaps the id meal if the first dinner is custom
        } if (swappedDayOne?.meals?.dinner?.prepId?.includes("LUNCH")) {
          swappedDayOne.data.prepId = swappedDayOne.data.prepId.replace("LUNCH", "DINNER");
        // swaps the id meal if the second lunch is custom
        } if (swappedDayTwo?.meals?.lunch?.prepId?.includes("DINNER")) {
          swappedDayTwo.data.prepId = swappedDayTwo.data.prepId.replace("DINNER", "LUNCH");
        // swaps the id meal if the second dinner is custom
        } if (swappedDayTwo?.meals?.dinner?.prepId?.includes("LUNCH")) {
          swappedDayTwo.data.prepId = swappedDayTwo.data.prepId.replace("LUNCH", "DINNER");
        } 

        // changed dates
        batch.set(doc(db, 'plans', detailsOne.date), swappedDayOne);
        batch.set(doc(db, 'plans', detailsTwo.date), swappedDayTwo);

        // reformatting dates
        const [year1, month1, day1] = detailsOne.date.split("-").map(Number);
        const longDate1 = new Date(year1, month1 - 1, day1);
        const [year2, month2, day2] = detailsTwo.date.split("-").map(Number);
        const longDate2 = new Date(year2, month2 - 1, day2);

        // DAY 1: unchecks the radio button for lunch if custom
        if (detailsOne.meal === "LUNCH" && swappedDayOne.meals?.lunch?.prepId?.includes("LUNCH")) {
          ogSelected = ogSelected.filter(item => item.meal !== ("LUNCH " + longDate1));
        // DAY 1: checks the radio button for lunch if not
        } else if (detailsOne.meal === "LUNCH" && swappedDayOne.meals?.lunch?.prepId) {
          ogSelected = ogSelected.filter(item => item.meal !== ("LUNCH " + longDate1));
          ogSelected.push({ filled: true, meal: "LUNCH " + longDate1 });
        // DAY 1: unchecks the radio button for dinner if custom
        } if (detailsOne.meal === "DINNER" && swappedDayOne.meals?.dinner?.prepId?.includes("DINNER")) {
          ogSelected = ogSelected.filter(item => item.meal !== ("DINNER " + longDate1));
        // DAY 1: checks the radio button for dinner if not
        } else if (detailsOne.meal === "DINNER" && swappedDayOne.meals?.dinner?.prepId) {
          ogSelected = ogSelected.filter(item => item.meal !== ("DINNER " + longDate1));
          ogSelected.push({ filled: true, meal: "DINNER " + longDate1 });
        }
        
        // DAY 2: unchecks the radio button for lunch if custom
        if (detailsTwo.meal === "LUNCH" && swappedDayTwo.meals?.lunch?.prepId?.includes("LUNCH")) {
          ogSelected = ogSelected.filter(item => item.meal !== ("LUNCH " + longDate2));
        // DAY 2: checks the radio button for lunch if not
        } else if (detailsTwo.meal === "LUNCH" && swappedDayTwo.meals?.lunch?.prepId) {
          ogSelected = ogSelected.filter(item => item.meal !== ("LUNCH " + longDate2));
          ogSelected.push({ filled: true, meal: "LUNCH " + longDate2 });
        // DAY 2: unchecks the radio button for dinner if custom
        } if (detailsTwo.meal === "DINNER" && swappedDayTwo.meals?.dinner?.prepId?.includes("DINNER")) {
          ogSelected = ogSelected.filter(item => item.meal !== ("DINNER " + longDate2));
        // DAY 2: checks the radio button for dinner if not
        } else if (detailsTwo.meal === "DINNER" && swappedDayTwo.meals?.dinner?.prepId) {
          ogSelected = ogSelected.filter(item => item.meal !== ("DINNER " + longDate2));
          ogSelected.push({ filled: true, meal: "DINNER " + longDate2 });
        }
      }
      
         
      // stores the new list
      setSelectedList(ogSelected);
      updateDoc(doc(db, 'globals', 'plan'), { selectedList: ogSelected }); 

      // commits the batch
      await batch.commit();

      // refreshes
      getCollectionPlans();
      
      // updates the dropdown amounts
      fetchDropdownItems();

    } catch (error) {
      console.error('Error updating weekly plans:', error);
    }
  }


  ///////////////////////////////// MEAL PREP SELECTION /////////////////////////////////

  // whether the dropdown is open
  const [prepDropdownOpen, setPrepDropdownOpen] = useState(false);

  // for the plans
  const [plansSnapshot, setPlansSnapshot] = useState(null);

  // the selected meal prep from the dropdown
  const [selectedPrepId, setSelectedPrepId] = useState("");
  const [prepData, setPrepData] = useState([]);

  // updates the current list of meal preps
  const updatePreps = async () => {
    
    try {
    
      // initial data for the week
      const data = [null, null, null, null, null, null, null];

      // gets the collection of meal preps
      const querySnapshot = await getDocs(collection(db, 'preps'));

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

      // gets the ids
      const prepIds = prepsArray.map((prep) => prep.id);
      
      // gets all weekly plan data
      const snapshot = await getDocs(collection(db, 'plans'));
      setPlansSnapshot(snapshot);

      // initializes Firestore batch
      const batch = writeBatch(db);

      // loops over all weekly plans
      snapshot.forEach(async (planDoc) => {

        // if the date is on or past today
        if (planDoc.id >= today.dateString) {
          const planData = planDoc.data();

          // finds the index of the lunch and dinner in the planData
          const lunchIndex = prepIds.indexOf(planData.meals.lunch.prepId);
          const dinnerIndex = prepIds.indexOf(planData.meals.dinner.prepId);
          
          // the data for the current date
          const docData = {
            date: planDoc.id,
            meals: {
              lunch: {
                prepId: planData.meals.lunch.prepId,          
                prepData: lunchIndex === -1 ? planData.meals.lunch.prepData : prepsArray[lunchIndex],
              },
              dinner: {
                prepId: planData.meals.dinner.prepId,         
                prepData: dinnerIndex === -1 ? planData.meals.dinner.prepData : prepsArray[dinnerIndex],
              },
            },
          };
          
          // stores the data in the week's state if the date matches
          for (let i = 0; i < 7; i++) {
            if (weekRange[i].toLocaleDateString('en-CA') === planDoc.id) {
              data[i] = docData;
            }
          }

          // adds update to batch
          batch.update(doc(db, 'plans', planDoc.id), docData);
        }
      });

      // commits the batch
      await batch.commit();
      
      // sets the week data
      setWeekData(data);

      // resets the available and remaining amounts
      if (selectedPrepId && selectedPrepId !== "") {
        calcRemaining(selectedPrepId, prepsArray[(prepsArray.map((prep) => prep.id)).indexOf(selectedPrepId)]);
      } else {
        setCurrAvailable(0);
        setCurrRemaining(0);
      }

    } catch (error) {
      console.error('Error updating preps:', error);
    }
  }


  ///////////////////////////////// MULTIPLICITY /////////////////////////////////

  const [currAvailable, setCurrAvailable] = useState(0);
  const [currRemaining, setCurrRemaining] = useState(0);

  const [dropdownItems, setDropdownItems] = useState([]);

  // to calculate the number of meal preps remaining of the selected one
  const calcRemaining = async (currPrepId, currPrepData) => {

    // initially the multiplicity of the meal prep
    let remaining = currPrepData.prepMult;
    if (selectedPrepId === currPrepId) { setCurrAvailable(remaining); }
      
    // gets all weekly plan data
    const snapshot = await getDocs(collection(db, 'plans'));
    setPlansSnapshot(snapshot);
    
    // loops over all current ingredients
    snapshot.forEach(async (planDoc) => {

      // gets the current ingredient data
      const planData = planDoc.data();
      const planId = planDoc.id;
      
      // if the current plan's date is on or after today
      if (planId >= today.dateString) {

        // if the meal prep is found at lunch and/or dinner of the date, decrement remaining
        if (planData.meals.lunch.prepId === currPrepId) { remaining = remaining - 1; }
        if (planData.meals.dinner.prepId === currPrepId) { remaining = remaining - 1; }
      }
    });

    // sets the number of remaining meal preps after looping
    if (selectedPrepId === currPrepId) { setCurrRemaining(remaining); }
    return remaining;
  }

  // calls the previous function when the selected meal prep changes
  useEffect(() => {
    calcRemaining(selectedPrepId, prepData[(prepData.map((prep) => prep.id)).indexOf(selectedPrepId)]);
  }, [selectedPrepId]);

  // function to loop over the prepData to create dropdown items for each
  const fetchDropdownItems = async () => {
    const updatedItems = await Promise.all(
      prepData.map(async (prep) => {
        const remaining = await calcRemaining(prep.id, prep);

        // reformats
        return {
          label: `(${remaining || 0}) ${prep.prepName}`,
          value: prep.id,
          key: prep.id,
          labelStyle: { color: 'black' },
          containerStyle: {
            backgroundColor: remaining > 0 ? colors.theme200 : remaining < 0 ? colors.zinc200 : colors.zinc350,
          },
        };
      })
    );

    setDropdownItems(updatedItems);
  };

  // calls the previous function whenever prepData is changed
  useEffect(() => {
    fetchDropdownItems();
  }, [prepData]);


  ///////////////////////////////// MEAL MODALS /////////////////////////////////

  // for the individualized meal details
  const [mealModalVisible, setMealModalVisible] = useState(false);
  const [mealModalIndex, setMealModalIndex] = useState(-1);
  const [mealModalDate, setMealModalDate] = useState(null);
  const [mealModalDispDate, setMealModalDispDate] = useState(null);
  const [mealModalData, setMealModalData] = useState(null);

  // when a touchable opacity for a meal is clicked, store the data
  const displayMeal = (index, meal, data) => {

    // creates a date string
    const date = meal + " " + formatDateShort(new Date(weekRange[index]));
    const dispDate = meal + " - " + formatDateMed(new Date(weekRange[index]));

    // opens the modal and stores data if there is data
    setMealModalIndex(index);
    setMealModalDate(date);
    setMealModalDispDate(dispDate);
    setMealModalData(data ? data : null);
    setMealModalVisible(true);
  }

  // when a prep is changed from the buttons
  const updateSelectedButton = (type, index, filled) => {
    let ogSelected = [...selectedList];
    
    // removes what was there initially
    ogSelected = ogSelected.filter(item => item.meal !== (type + " " + new Date(weekRange[index])));

    // readds it
    ogSelected.push({
      filled: filled,
      meal: type + " " + new Date(weekRange[index]),
    });
     
    // store the new list
    setSelectedList(ogSelected);
    updateDoc(doc(db, 'globals', 'plan'), { selectedList: ogSelected }); 
  }

  // for closing the details modal after editing
  const closeEditingModal = async (isCustom) => {

    // current meal info
    const meal = mealModalDate.split(" ")[0];
    const [month, day, year] = mealModalDate.split(" ")[1].split("/");
    const formattedDate = `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const formattedWeekRange = weekRange.map(date => new Date(date).toLocaleDateString('en-CA')); 
    
    // if custom meal prep, remove it only
    if (isCustom) {
      let ogSelected = [...selectedList];
      ogSelected = ogSelected.filter(item => item.meal !== (meal + " " + new Date(weekRange[formattedWeekRange.indexOf(formattedDate)])));
      setSelectedList(ogSelected);
      updateDoc(doc(db, 'globals', 'plan'), { selectedList: ogSelected });
    
    // otherwise, add it
    } else {
      if (mealModalDate.includes("LUNCH")) { updateSelectedButton("LUNCH", mealModalIndex, !isCustom); }
      if (mealModalDate.includes("DINNER")) { updateSelectedButton("DINNER", mealModalIndex, !isCustom); }
    }
    
    setMealModalIndex(-1);
    setMealModalDate(null);
    setMealModalDispDate(null);
    setMealModalData(null);
      
    // updates the dropdown amounts and refreshes
    fetchDropdownItems();
    getCollectionPlans();
  }

  // for the prep overview touchable opacity
  const [prepModalVisible, setPrepModalVisible] = useState(false);
  const [prepModalData, setPrepModalData] = useState(null);

  // when a touchable opacity for a general prep is clicked, store the data
  const displayPrep = (id) => {

    // only opens the modal and stores data if there is data
    if (selectedPrepId && id !== null) {
      setPrepModalData(prepData.find((data) => data.id === id));
      setPrepModalVisible(true);

    // otherwise, just closes it
    } else {
      setPrepModalData(null);
      setPrepModalVisible(false);
    }
  }


  ///////////////////////////////// NUMBER OF MEALS SELECTED /////////////////////////////////

  const [selectedList, setSelectedList] = useState([]);
  const [selectedCount, setSelectedCount] = useState(0);

  // to update the list of selected meals
  const toggleSelected = async (type, index) => {
    let ogSelected = [...selectedList];
    
    // gets the current data
    const planDocSnap = await getDoc(doc(db, 'plans', (new Date(weekRange[index])).toLocaleDateString('en-CA')));

    // if the meal is not already in the list, add it
    if (!selectedList.map(item => item.meal).includes(type + " " + new Date(weekRange[index]).toString())) {
      
      // adds it
      ogSelected.push({
        filled: planDocSnap.exists() 
          ? type === "LUNCH" ? planDocSnap.data().meals.lunch.prepId !== null && !planDocSnap.data().meals.lunch.prepId.includes("LUNCH") 
          : type === "DINNER" ? planDocSnap.data().meals.dinner.prepId !== null && !planDocSnap.data().meals.dinner.prepId.includes("DINNER") 
          : false : false,
        meal: type + " " + new Date(weekRange[index]),
      });
    
      // store the new list
      setSelectedList(ogSelected);
      updateDoc(doc(db, 'globals', 'plan'), { selectedList: ogSelected });


    // issue a warning before deleting if meal present
    } else if (
      planDocSnap.exists() && planDocSnap.data()?.meals?.[type.toLowerCase()]?.prepId 
      && !planDocSnap.data()?.meals?.[type.toLowerCase()]?.prepId?.includes(type)
    ){ 
      setWarningModalType(type);
      setWarningModalIndex(index);
      setWarningModalDocSnap(planDocSnap);
      setWarningModalVisible(true);

    // otherwise, remove it
    } else {
      ogSelected = ogSelected.filter(item => item.meal !== (type + " " + new Date(weekRange[index]))); 
    
      // store the new list
      setSelectedList(ogSelected);
      updateDoc(doc(db, 'globals', 'plan'), { selectedList: ogSelected });
    }
  }

  // modal variables
  const [warningModalIndex, setWarningModalIndex] = useState(-1);
  const [warningModalType, setWarningModalType] = useState("");
  const [warningModalDocSnap, setWarningModalDocSnap] = useState(null);
  const [warningModalVisible, setWarningModalVisible] = useState(false);

  // to submit the warning modal
  const submitWarningModal = () => {
    let ogSelected = [...selectedList];
    ogSelected = ogSelected.filter(item => item.meal !== (warningModalType + " " + new Date(weekRange[warningModalIndex]))); 
  
    // if there is already a meal prep there, remove it - LUNCH
    if (warningModalType === "LUNCH" && warningModalDocSnap.exists() && warningModalDocSnap.data().meals.lunch.prepId !== null && !warningModalDocSnap.data().meals.lunch.prepId.includes("LUNCH")) {
      updateDoc(doc(db, 'plans', (new Date(weekRange[warningModalIndex])).toLocaleDateString('en-CA')), { "meals.lunch.prepData": null, "meals.lunch.prepId": null });
     
    // DINNER
    } else if (warningModalType === "DINNER" && warningModalDocSnap.data().meals.dinner.prepId !== null && !warningModalDocSnap.data().meals.dinner.prepId.includes("DINNER")) {
      updateDoc(doc(db, 'plans', (new Date(weekRange[warningModalIndex])).toLocaleDateString('en-CA')), { "meals.dinner.prepData": null, "meals.dinner.prepId": null });
    }
    
    // store the new list
    setSelectedList(ogSelected);
    updateDoc(doc(db, 'globals', 'plan'), { selectedList: ogSelected });
    
    // updates the dropdown amounts and refreshes
    fetchDropdownItems();
    getCollectionPlans();

    closeWarningModal();
  }

  // to close the warning modal without submitting
  const closeWarningModal = () => {
    setWarningModalType("");
    setWarningModalIndex(-1);
    setWarningModalDocSnap(null);
    setWarningModalVisible(false);
  }

  // to update the number of future selected meals
  useEffect(() => {
    let newCount = 0;

    // loops over the list of selected meals and counts future ones
    selectedList.forEach((item) => {
      if (new Date(item.meal.split(" ").slice(1).join(" ")).toISOString() > new Date(today.dateString).toISOString()
          && !item.filled) {
        newCount = newCount + 1;
      }
    })

    setSelectedCount(newCount);
  }, [selectedList]);


  ///////////////////////////////// SEARCH MODAL /////////////////////////////////

  // for the meal search
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [gotoDate, setGotoDate] = useState(null);

  // to close the calendar popup
  const closeSearchModal = (selectedMeal, selectedDate) => {
    
    // unshows the modal
    setSearchModalVisible(false);
    
    // if the selected date is valid
    if (selectedDate) {
      changeGlobalPlan(selectedDate);     // updates the date of the plan in the global doc
      calculateWeekRange(selectedDate);   // calculates the new week range

      // stores the date to highlight
      setGotoDate({meal: selectedMeal, date: selectedDate});
    }
  };


  ///////////////////////////////// HTML /////////////////////////////////
  
  return (

    // CONTAINER
    <View className="flex-1 items-center justify-center bg-zinc100 border space-y-7">      
        
      {/* WEEK SELECTION */}
      <View className="flex flex-row justify-center items-center bg-zinc100 pl-7">
        
        {/* Selected Week prompt */}
        <View className="flex flex-row justify-evenly items-center ml-[-30px] w-[45%] h-[35px] pr-2 bg-white border-l-[1.5px] border-y-[1.5px] border-theme300">
          
          {/* Go To Today */}
          <Icon
            name="reload-circle"
            color={colors.zinc600}
            size={20}
            onPress={() => closeCalendarModal(today)}
          />
          
          {/* Text */}
          <Text className="font-bold">
            SELECTED WEEK:
          </Text>
        </View>
        
        {/* Week Selection */}
        <View className="flex flex-row justify-center items-center bg-theme200 rounded-r-lg w-1/2 h-[35px] space-x-3">
          
          {/* Week Range Display */}
          {weekRange.indexOf("") === -1 &&
          <Text className="text-black text-[16px]">
            {`${formatDateShort(new Date(weekRange[0]))} - ${formatDateShort(new Date(weekRange[6]))}`}
          </Text>
          }

          {/* Calendar Button */}
          <TouchableOpacity
            onPress={() => setCalendarModalVisible(true)}
            className="justify-center items-center"
          >
            <Icon 
              name="calendar-clear" 
              size={20} 
              color={colors.zinc700}
              onClick={calendarModalVisible}
            />
          </TouchableOpacity>

          {/* Hidden DateTimePicker */}
          {calendarModalVisible && (
            <CalendarModal
              modalVisible={calendarModalVisible} 
              closeModal={closeCalendarModal} 
              globalDate={globalDate}
            />
          )}
        </View>
      </View>


      {/* BUTTONS */}
      <View className="flex flex-row -mb-6 -mt-3 justify-center items-center w-full px-3">
        <View className="flex flex-row w-full bg-theme100 border border-zinc500">

          {/* week change */}
          <View className="flex flex-row justify-center items-center w-[24%]">
          
            {/* Prev */}
            <Icon
              name="caret-up"
              color={colors.zinc700}
              size={20}
              onPress={() => toggleWeek(true)}
            />
            {/* Next */}
            <Icon
              name="caret-down"
              color={colors.zinc700}
              size={20}
              backgroundColor={colors.theme100}
              onPress={() => toggleWeek(false)}
            />
          </View>

          {/* count of included */}
          <View className="flex w-[6%] justify-center items-center">
            <Text className="-mx-5 text-zinc700 font-semibold text-[12px]">
              {selectedCount}
            </Text>
          </View>

          {/* searchbar */}
          <View className="flex w-[45%] justify-center items-center">
            <TouchableOpacity 
              onPress={() => setSearchModalVisible(true)}
              className="w-1/2 py-0.5 justify-center items-center bg-theme200 rounded-full"
            >
              <Icon name="search"/>
            </TouchableOpacity>
          </View>

          {/* overall checkbox */}
          <View className="flex justify-center items-center w-1/12">
            <Icon
              name={
                isLunchChecked.every((value) => value === true) &&
                isDinnerChecked.every((value) => value === true)
                  ? "checkbox"           // if all 14 checkboxes are checked
                  :
                isLunchChecked.every((value) => value === false) &&
                isDinnerChecked.every((value) => value === false)
                  ? "square-outline"     // if all 14 checkboxes are unchecked
                  : "checkbox-outline"   // if there is a mix of checked and unchecked
              }
              size={16}
              color={colors.zinc700}
              onPress={() => setIsAllChecked(!isAllChecked)}
            />
          </View>
        </View>
      </View>


      {/* SEARCH MODAL */}
      {searchModalVisible && 
        <MealSearchModal
          snapshot={plansSnapshot}
          modalVisible={searchModalVisible}
          setModalVisible={setSearchModalVisible}
          closeModal={closeSearchModal}
        />
      }


      {/* GRID */}
      <View className="flex flex-col justify-evenly items-center w-full h-2/3 px-3">
        <View className="bg-black border-x-2 border-t-2 border-black">
          
          {/* loops over the selected week's data */}
          {weekData.map((data, index) => (
            <View
              key={index}
              className="flex flex-row justify-center items-center w-full h-[14.25%] border-b-2 border-black"
            >

              {/* Date Display */}
              <View className={`flex flex-col justify-center items-center w-[24%] h-full ${weekRange[index] && today.dateString === weekRange[index].toLocaleDateString('en-CA') ? "bg-zinc700" : "bg-theme900"}`}>
                
                {/* day of the week */}
                <Text className="text-white text-[12px] font-bold">
                  {["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][index]}
                </Text>

                {/* date */}
                {(weekRange.indexOf("") === -1) &&
                <Text className="text-white text-[12px]">
                  {formatDateLong(new Date(weekRange[index]))}
                </Text>
                }
              </View>


              {/* Selection */}
              <View className={`flex flex-col h-full w-[6%] justify-around items-center px-1 ${weekRange[index] && today.dateString === weekRange[index].toLocaleDateString('en-CA') ? "bg-zinc600" : "bg-theme800"}`}>
                {/* lunch */}
                <Icon
                  name={selectedList.map(item => item.meal).includes("LUNCH " + weekRange[index]) ? "radio-button-on" : "radio-button-off"}
                  size={16}
                  color={colors.zinc300}
                  className="h-1/2"
                  onPress={() => toggleSelected("LUNCH", index)}
                />
                {/* dinner */}
                <Icon
                  name={selectedList.map(item => item.meal).includes("DINNER " + weekRange[index]) ? "radio-button-on" : "radio-button-off"}
                  size={16}
                  color={colors.zinc350}
                  className="h-1/2"
                  onPress={() => toggleSelected("DINNER", index)}
                />
              </View>


              {/* Meal Section */}
              <View className="flex flex-col w-[45%]">
              
                {/* lunch */}
                <TouchableOpacity
                  onPress={() => displayMeal(index, "LUNCH", data?.meals?.lunch?.prepData)}
                  activeOpacity={0.6}
                  className="flex flex-row bg-zinc350 w-full justify-center items-center h-1/2 px-1"
                >
                  <Text className={`text-[11px] font-bold text-center ${(gotoDate?.meal === "LUNCH" && gotoDate?.date?.dateString === data?.date) ? "text-pink-800" : (data?.meals?.lunch?.prepId === selectedPrepId) ? "text-theme700" : "text-black"}`}>
                    {data?.meals?.lunch?.prepData?.prepName ?? ""}
                  </Text>
                </TouchableOpacity>

                {/* dinner */}
                <TouchableOpacity
                  onPress={() => displayMeal(index, "DINNER", data?.meals?.dinner?.prepData)}
                  activeOpacity={0.6}
                  className="bg-zinc400 w-full justify-center items-center h-1/2 px-1"
                >
                  <Text className={`text-[11px] font-bold text-center ${(gotoDate?.meal === "DINNER" && gotoDate?.date?.dateString === data?.date) ? "text-pink-800" : (data?.meals?.dinner?.prepId === selectedPrepId) ? "text-theme800" : "text-black"}`}>
                    {data?.meals?.dinner?.prepData?.prepName ?? ""}
                  </Text>
                </TouchableOpacity>

                {/* Modal to Display a Prep Overview */}
                {prepModalVisible && 
                  <MealOverviewModal
                    data={prepModalData}
                    modalVisible={prepModalVisible}
                    setModalVisible={setPrepModalVisible}
                  />
                }

                {/* Modal to Display a Specific Meal */}
                {mealModalVisible && 
                  <MealDetailsModal
                    date={mealModalDate}
                    dispDate={mealModalDispDate}
                    data={mealModalData}
                    snapshot={plansSnapshot}
                    modalVisible={mealModalVisible}
                    setModalVisible={setMealModalVisible}
                    closeModal={closeEditingModal}
                  />
                }
              </View>

              {/* Checkboxes */}
              <View className="flex flex-col justify-center items-center w-1/12 h-full">
                
                {/* lunch */}
                <View className="flex flex-row justify-center items-center bg-zinc350 w-full h-1/2 z-0">
                  <Icon
                    name={isLunchChecked[index] ? "checkbox" : "square-outline"}
                    size={16}
                    color={selectedList.map(item => item.meal).includes("LUNCH " + new Date(weekRange[index])) ? colors.zinc700 : (isLunchChecked[index] ? colors.zinc450 : colors.zinc400)}
                    onPress={() => checkLunch(index)}
                  />
                </View>

                {/* dinner */}
                <View className="flex flex-row justify-center items-center bg-zinc400 h-1/2 w-full">
                  <Icon
                    name={isDinnerChecked[index] ? "checkbox" : "square-outline"}
                    size={16}
                    color={selectedList.map(item => item.meal).includes("DINNER " + new Date(weekRange[index])) ? colors.zinc700 : (isDinnerChecked[index] ? colors.zinc500 : colors.zinc450)}
                    onPress={() => checkDinner(index)}
                  />
                </View>
              </View>
              

              {/* Details */}
              <View className={`w-1/6 justify-center items-center h-full space-y-1 border-l border-black ${weekRange[index] && today.dateString === weekRange[index].toLocaleDateString('en-CA') ? "bg-zinc500" : "bg-theme600"}`}>
                
                {/* calories */}
                <Text className="text-white text-[12px]">
                { // if both meals' prepCal are valid (not NaN)
                    !(isNaN((new Fractional(data?.meals?.lunch?.prepData?.prepCal)).numerator) && isNaN((new Fractional(data?.meals?.lunch?.prepData?.prepCal)).denominator)
                    && isNaN((new Fractional(data?.meals?.dinner?.prepData?.prepCal)).numerator) && isNaN((new Fractional(data?.meals?.dinner?.prepData?.prepCal)).denominator)) 
                    ? // case 1: only lunch prepCal is valid - only show lunch prepCal
                      data?.meals?.lunch?.prepData?.prepCal && !data?.meals?.dinner?.prepData ? data?.meals?.lunch?.prepData?.prepCal
                    : // case 2: only dinner prepCal is valid - only show dinner prepCal
                      !data?.meals?.lunch?.prepData?.prepCal && data?.meals?.dinner?.prepData ? data?.meals?.dinner?.prepData?.prepCal
                    : // case 3: both prepCal are valid - add both
                      ((new Fractional(data?.meals?.lunch?.prepData?.prepCal).add(new Fractional(data?.meals?.dinner?.prepData?.prepCal))).numerator 
                        / (new Fractional(data?.meals?.lunch?.prepData?.prepCal).add(new Fractional(data?.meals?.dinner?.prepData?.prepCal))).denominator)
                        .toFixed(0)
                    ?? // otherwise, 0
                      "0" : "0"
                    } {"cal"}
                </Text>

                {/* price */}
                <Text className="text-white text-[12px]">
                  {"$"}
                  { // if both meals' prepPrice are valid (not NaN)
                    !(isNaN((new Fractional(data?.meals?.lunch?.prepData?.prepPrice)).numerator) && isNaN((new Fractional(data?.meals?.lunch?.prepData?.prepPrice)).denominator)
                    && isNaN((new Fractional(data?.meals?.dinner?.prepData?.prepPrice)).numerator) && isNaN((new Fractional(data?.meals?.dinner?.prepData?.prepPrice)).denominator)) 
                    ? // case 1: only lunch prepPrice is valid - only show lunch prepPrice
                      data?.meals?.lunch?.prepData?.prepPrice && !data?.meals?.dinner?.prepData ? data?.meals?.lunch?.prepData?.prepPrice
                    : // case 2: only dinner prepPrice is valid - only show dinner prepPrice
                      !data?.meals?.lunch?.prepData?.prepPrice && data?.meals?.dinner?.prepData ? data?.meals?.dinner?.prepData?.prepPrice
                    : // case 3: both prepCal are valid - add both
                    ((new Fractional(data?.meals?.lunch?.prepData?.prepPrice).add(new Fractional(data?.meals?.dinner?.prepData?.prepPrice))).numerator 
                      / (new Fractional(data?.meals?.lunch?.prepData?.prepPrice).add(new Fractional(data?.meals?.dinner?.prepData?.prepPrice))).denominator)
                      .toFixed(2)
                    ?? // otherwise, 0
                      "0.00" : "0.00"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>


      {/* WARNING MODAL */}
      {warningModalVisible &&
        <RadioWarningModal
          prepName={warningModalType === "LUNCH" ? warningModalDocSnap.data().meals.lunch.prepData.prepName : warningModalDocSnap.data().meals.dinner.prepData.prepName}
          prepDate={(warningModalType === "LUNCH" ? "Lunch " : "Dinner ") + formatDateShort(weekRange[warningModalIndex])}
          modalVisible={warningModalVisible}
          setModalVisible={setWarningModalVisible}
          closeModal={closeWarningModal}
          submitModal={submitWarningModal}
        />
      }


      {/* MEAL PREP SELECTION SECTION */}
      <View className="flex flex-row justify-center items-center h-[50px]">

        {/* Buttons */}
        {(isLunchChecked.indexOf(true) !== -1 || isDinnerChecked.indexOf(true) !== -1) &&
        <View className="flex flex-col bg-zinc300 py-1 px-1 mr-2 rounded">    

          {/* Submit */}
          {(selectedPrepId !== null && selectedPrepId !== "") &&
          <Icon
            name="checkmark-circle"
            size={20}
            color={colors.theme600}
            onPress={() => submitCheckedPrep()}
          />
          }

          {/* Swap */}
          {isLunchChecked.filter(value => value === true).length + isDinnerChecked.filter(value => value === true).length === 2 &&
            <Icon
              name="sync-circle"
              size={20}
              color={colors.theme600}
              onPress={() => swapCheckedPrep()}
            />
          }

          {/* Clear */}
          <Icon
            name="close-circle"
            size={20}
            color={colors.theme600}
            onPress={() => clearCheckedPrep()}
          />
        </View>
        }

        {/* Meal Prep Search */}
        <View className="flex flex-col w-1/2 h-[70px] space-y-1 justify-center items-center">
          {/* dropdown */}
          <DropDownPicker 
            open={prepDropdownOpen}
            setOpen={setPrepDropdownOpen}
            value={selectedPrepId}
            setValue={setSelectedPrepId}
            items={ prepDropdownOpen ?
              // if dropdown is open, display the amounts
              dropdownItems
            : // if not, just display the names
              prepData.map((prep) => ({
                label: prep.prepName,
                value: prep.id,
                key: prep.id,
                labelStyle: { color: 'black' },
                containerStyle: {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.zinc50,
              }}))
            }
            placeholder=""
            style={{ height: 50, backgroundColor: colors.zinc600, borderWidth: 1, borderColor: colors.zinc800, justifyContent: 'center', }}
            dropDownContainerStyle={{ borderLeftWidth: 1, borderRightWidth: 1, borderTopWidth: 1, borderColor: colors.zinc500, borderRadius: 0, }}
            textStyle={{ color: prepData.length === 0 ? colors.theme200 : "white", fontWeight: 500, textAlign: 'center', fontSize: 13, }}
            listItemContainerStyle={{ borderBottomWidth: 0.5, borderBottomColor: colors.zinc450, }}
            ArrowDownIconComponent={() => {
              return (
                <Icon
                  size={18}
                  color={ colors.theme100 }
                  name="chevron-down"
                />
              );
            }}
            ArrowUpIconComponent={() => {
              return (
                <Icon
                  size={18}
                  color={ colors.theme100 }
                  name="chevron-up"
                />
              );
            }}
          />
        </View>


        {/* Amounts Section */}
        {(selectedPrepId !== null && selectedPrepId !== "") &&
        <TouchableOpacity
          className="flex flex-col justify-evenly items-left pl-2 ml-3 w-[27.5%] h-[45px] bg-theme700 rounded border-[1.5px] border-theme900"
          onPress={() => displayPrep(selectedPrepId)}
        >
          
          {/* available */}
          <Text className="text-white text-[11px] font-bold italic">
            {"AVAILABLE: "}{selectedPrepId !== null ? currAvailable : "0"}
          </Text>

          {/* remaining */}
          <Text className="text-white text-[11px] font-bold italic">
            {"REMAINING: "}{selectedPrepId !== null ? currRemaining : "0"}
          </Text>

          {/* 'x' button - to clear selection */}
          <View className="absolute top-0 right-0">
            <Icon
              name="close"
              size={16}
              color="white"
              onPress={() => {
                setSelectedPrepId("");
                setCurrAvailable(0);
                setCurrRemaining(0);
              }}
            />
          </View>
        </TouchableOpacity>
        }

        {/* Selected Checkbox */}
        {(selectedPrepId !== null && selectedPrepId !== "" 
        && weekData.filter(data => data?.meals?.lunch?.prepId === selectedPrepId).length + weekData.filter(data => data?.meals?.dinner?.prepId === selectedPrepId).length !== 0) &&
        <View className="flex pl-1">
          <Icon
            name="checkbox"
            size={20}
            color={colors.zinc600}
            onPress={() => checkCurrent()}
          />
        </View>
        }
      </View>
    </View>
  );
}