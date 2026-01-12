///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect, useRef } from 'react';

// UI components
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, Keyboard, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// store lists
import storeKeys from '../../assets/storeKeys';
import storeImages from '../../assets/storeImages';

// fractions
var Fractional = require('fractional').Fraction;

// validation
import extractUnit from '../Validation/extractUnit';
import validateFractionInput from '../../components/Validation/validateFractionInput';
import validateDecimalInput from '../../components/Validation/validateDecimalInput';
import validateWholeNumberInput from '../Validation/validateWholeNumberInput';
import { deepPrepIndexOf } from '../Validation/deepPrepSearch';

// initialize firebase app
import { getFirestore, setDoc, updateDoc, getDoc, getDocs, doc, collection } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const MealDetailsModal = ({ 
  date, dispDate, data, id, ogSelected, plansSnapshot,
  modalVisible, setModalVisible, closeModal,
}) => {


  ///////////////////////////////// KEYBOARD /////////////////////////////////

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardType, setKeyboardType] = useState("");

  // keyboard listener
  useEffect(() => {

    // listens for keyboard show event
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setIsKeyboardOpen(true);
    });

    // listens for keyboard hide event
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardOpen(false);
    });

    // cleans up listeners on unmount
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [keyboardType]);


  ///////////////////////////////// SETUP /////////////////////////////////

  const [isEditing, setIsEditing] = useState(false);
  const [option, setOption] = useState("CREATE");

  // stores whether a prep is being edited on open
  useEffect(() => {
    if (modalVisible) {
      setIsEditing(data === null);

      // gets the copy data
      const currDate = date.split(" ");
      const [month, day, year] = currDate[1].split("/");
      getCopyData(currDate[0], new Date(Number(year) + 2000, month - 1, day).toISOString().slice(0, 10));

      // stores data for later editing
      if (data !== null) {
        // simple editing
        setPrepName(data.prepName);
        setPrepPrice(data.prepPrice);
        setPrepCal(data.prepCal);
        setPrepNote(data.prepNote);
        
        // complex editing
        setPrepCurrentAmounts(data.currentAmounts);
        setPrepCurrentCals(data.currentCals);
        setPrepCurrentData(data.currentData);
        setNumIngredients(data.currentData?.length || 0);
      }
    }
  }, [modalVisible]);

  // to close the modal
  const exitModal = () => {
    setModalVisible(false);
    setPrepName("");
    setPrepPrice("");
    setPrepCal("");
    setPrepNote("");
  };


  ///////////////////////////////// CREATE /////////////////////////////////

  const [createComplex, setCreateComplex] = useState(false);
  const [isNameValid, setIsNameValid] = useState(true);
  const [prepName, setPrepName] = useState("");
  const [prepPrice, setPrepPrice] = useState("");

  // for simple
  const [prepCal, setPrepCal] = useState("");
  const [prepNote, setPrepNote] = useState("");

  // to create a new meal prep without ingredients
  const submitNewSimple = async () => {

    if (prepName === "") { setIsNameValid(false); }

    else {
      setIsNameValid(true);

      // data for the new prep
      const newData = {
        prepName: prepName,
        prepNote: prepNote,
        prepMult: 0,
        prepCal: prepCal === "" ? "0" : ((new Fractional(prepCal).numerator) / (new Fractional(prepCal).denominator)).toFixed(0), 
        prepPrice: prepPrice === "" ? "0.00" : ((new Fractional(prepPrice).numerator) / (new Fractional(prepPrice).denominator)).toFixed(2), 
        currentData: [], 
        currentIds: [], 
        currentAmounts: [], 
        currentCals: [], 
        currentPrices: [],
        currentIncluded: [],
      };

      // current meal info
      const meal = date.split(" ")[0];
      const [month, day, year] = date.split(" ")[1].split("/");
      const formattedDate = `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

      // prepares the doc data
      const mealData = {
        prepId: date,          
        prepData: newData,
      };

      // retrieves the current doc data
      const currData = await getDoc(doc(db, 'PLANS', formattedDate));

      // if it exists, just set the new meal
      if (currData.exists()) {
        if (meal === "LUNCH") { updateDoc(doc(db, 'PLANS', formattedDate), { "meals.lunch": mealData }); } 
        else if (meal === "DINNER") { updateDoc(doc(db, 'PLANS', formattedDate), { "meals.dinner": mealData }); }

      // otherwise, create a null doc first
      } else {
        const docData = { 
          date: formattedDate,
          meals: {
            lunch: {
              prepId: meal === "LUNCH" ? mealData.prepId : null,          
              prepData: meal === "LUNCH" ? mealData.prepData : null,
            },
            dinner: {
              prepId: meal === "DINNER" ? mealData.prepId : null,         
              prepData: meal === "DINNER" ? mealData.prepData : null,
            },
          },
        };
        setDoc(doc(db, 'PLANS', formattedDate), docData);
      }
      
      // closes the modal, indicating that a custom prep was made
      closeModal(true);
      exitModal();
    }
  }

  // for complex
  const [prepCurrentData, setPrepCurrentData] = useState([]);
  const [prepCurrentAmounts, setPrepCurrentAmounts] = useState([]);
  const [prepCurrentCals, setPrepCurrentCals] = useState([]);
  
  // for shifting
  const [showNewIndex, setShowNewIndex] = useState(false);
  const [numIngredients, setNumIngredients] = useState(0);

  // to add an ingredient
  const addPrepIngredient = (index) => {

    // null new data to set
    let newData = Array(numIngredients + 1).fill(null);
    let newAmounts = Array(numIngredients + 1).fill("");
    let newCals = Array(numIngredients + 1).fill("");

    // loops over and shifts the ingredients accordingly
    for (let i = 0; i < numIngredients; i++) {
      if (i < index) {
        newData[i] = prepCurrentData[i];
        newAmounts[i] = prepCurrentAmounts[i];
        newCals[i] = prepCurrentCals[i];
      
      } else if (i >= index) {
        newData[i + 1] = prepCurrentData[i];
        newAmounts[i + 1] = prepCurrentAmounts[i];
        newCals[i + 1] = prepCurrentCals[i];
      }
    }

    // stores shifts
    setPrepCurrentData(newData);        // the current's data
    setPrepCurrentAmounts(newAmounts);  // the current's amounts
    setPrepCurrentCals(newCals);        // the current's calories

    // increments the number of ingredients
    setNumIngredients(numIngredients + 1);
    setShowNewIndex(false);
  }

  // to delete or clear the pressed ingredient
  const deletePrepIngredient = (index) => {

    // the current's data
    setPrepCurrentData((prev) => prev.filter((_, i) => i !== index));
    // the current's amounts
    setPrepCurrentAmounts((prev) => prev.filter((_, i) => i !== index));
    // the current's calories
    setPrepCurrentCals((prev) => prev.filter((_, i) => i !== index));

    // decrements the number of ingredients
    setNumIngredients(numIngredients - 1);
  }

  // recalculates the prep's total calories for complex editing
  useEffect(() => {
    if (createComplex) {

      // sums together all of the current's calories
      setPrepCal(prepCurrentCals === null ? "0" :
        (prepCurrentCals.map(cal => new Fractional(cal).numerator / new Fractional(cal).denominator)
          .filter(cal => !isNaN(cal)).reduce((sum, cal) => sum + cal, 0)).toFixed(0)
      );
    }
  }, [prepCurrentCals, createComplex]);

  // to create a new meal prep with ingredients
  const submitNewComplex = async () => {
    
    if (prepName === "") { setIsNameValid(false); }

    else {
      setIsNameValid(true);

      // fixes units and amounts
      let newCurrentData = [...prepCurrentData];
      let newCurrentAmounts = [...prepCurrentAmounts];
      prepCurrentData.forEach((curr, index) => {

        // for empty units and amounts
        if (curr?.ingredientData?.[curr?.ingredientStore]?.unit === "" && prepCurrentAmounts?.[index] === "") {
          newCurrentData[index].ingredientData[newCurrentData[index].ingredientStore].unit = "serving";
          newCurrentAmounts[index] = "1";

        // for empty units
        } else if (curr?.ingredientData?.[curr?.ingredientStore]?.unit === "") {
          newCurrentData[index].ingredientData[newCurrentData[index].ingredientStore].unit = extractUnit("serving(s)", prepCurrentAmounts[index]);
        }

        // fixes a () unit
        if (curr?.ingredientData?.[curr?.ingredientStore]?.unit.includes("(") && curr?.ingredientData?.[curr?.ingredientStore]?.unit.includes(")")) {
          newCurrentData[index].ingredientData[newCurrentData[index].ingredientStore].unit = extractUnit(curr?.ingredientData?.[curr?.ingredientStore]?.unit, prepCurrentAmounts[index]);
        }
      });

      // data for the new prep
      const newData = {
        prepName: prepName,
        prepNote: "",
        prepMult: 0,
        prepCal: prepCal === "" ? "0" : ((new Fractional(prepCal).numerator) / (new Fractional(prepCal).denominator)).toFixed(0), 
        prepPrice: prepPrice === "" ? "0.00" : ((new Fractional(prepPrice).numerator) / (new Fractional(prepPrice).denominator)).toFixed(2), 
        currentData: newCurrentData, 
        currentIds: Array(newCurrentData.length).fill(""), 
        currentAmounts: newCurrentAmounts, 
        currentCals: prepCurrentCals.map(cal => !isNaN(new Fractional(cal).numerator / new Fractional(cal).denominator) ? new Fractional(cal).numerator / new Fractional(cal).denominator : 0), 
        currentPrices: Array(newCurrentData.length).fill(""),
        currentIncluded: Array(newCurrentData.length).fill(""),
      };
      
      // current meal info
      const meal = date.split(" ")[0];
      const [month, day, year] = date.split(" ")[1].split("/");
      const formattedDate = `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

      // prepares the doc data
      const mealData = {
        prepId: "." + doc(collection(db, 'PREPS')).id,          
        prepData: newData,
      };

      // retrieves the current doc data
      const currData = await getDoc(doc(db, 'PLANS', formattedDate));

      // if it exists, just set the new meal
      if (currData.exists()) {
        if (meal === "LUNCH") { updateDoc(doc(db, 'PLANS', formattedDate), { "meals.lunch": mealData }); } 
        else if (meal === "DINNER") { updateDoc(doc(db, 'PLANS', formattedDate), { "meals.dinner": mealData }); }

      // otherwise, create a null doc first
      } else {
        const docData = { 
          date: formattedDate,
          meals: {
            lunch: {
              prepId: meal === "LUNCH" ? mealData.prepId : null,          
              prepData: meal === "LUNCH" ? mealData.prepData : null,
            },
            dinner: {
              prepId: meal === "DINNER" ? mealData.prepId : null,         
              prepData: meal === "DINNER" ? mealData.prepData : null,
            },
          },
        };
        setDoc(doc(db, 'PLANS', formattedDate), docData);
      }
      
      // closes the modal, indicating that a custom prep was made
      closeModal(true);
      exitModal();
    }
  }

  ///////////////////////////////// GETTING DB DATA /////////////////////////////////
  
  // getting DB data
  const [uniquePrepIds, setUniquePrepIds] = useState(null);
  const [uniquePrepNames, setUniquePrepNames] = useState(null);
  const [uniquePrepData, setUniquePrepData] = useState(null);
  const [uniquePrepDates, setUniquePrepDates] = useState(null);
  const [uniquePrepMeals, setUniquePrepMeals] = useState(null);


  // gets the collection of meal preps
  const loadPreps = async () => {
    
    // to get the unique list of preps
    let prepNames = [];
    let prepIds = [];
    let prepData = [];
    let prepDates = [];
    let prepMeals = [];


    // loops through all the plans
    plansSnapshot.docs.map((plan) => {
      

      // LUNCH PREPS
      if (plan.data().meals.lunch.prepData) {
        const lunchNameIndex = prepNames.indexOf(plan.data().meals.lunch.prepData.prepName);

        // completely new
        if (lunchNameIndex === -1) {
          prepNames.push(plan.data().meals.lunch.prepData.prepName); 
          prepIds.push([plan.data().meals.lunch.prepId]);
          prepData.push([plan.data().meals.lunch.prepData]); 
          prepDates.push([[plan.id]]);
          prepMeals.push([["LUNCH"]]);

        // otherwise - exact match or alternate found
        } else {
          
          const lunchDataIndex = deepPrepIndexOf(prepData[lunchNameIndex], plan.data().meals.lunch.prepData);

          // alternative found
          if (lunchDataIndex === -1) {
            prepIds[lunchNameIndex].push(plan.data().meals.lunch.prepId);
            prepData[lunchNameIndex].push(plan.data().meals.lunch.prepData);
            prepDates[lunchNameIndex].push([plan.id]);
            prepMeals[lunchNameIndex].push(["LUNCH"]);
          
          // exact match found
          } else {
            prepDates[lunchNameIndex][lunchDataIndex].push(plan.id);
            prepMeals[lunchNameIndex][lunchDataIndex].push("LUNCH");
          }
        }
      }

      // DINNER PREPS
      if (plan.data().meals.dinner.prepData) {
        const dinnerNameIndex = prepNames.indexOf(plan.data().meals.dinner.prepData.prepName);

        // completely new
        if (dinnerNameIndex === -1) {
          prepNames.push(plan.data().meals.dinner.prepData.prepName); 
          prepIds.push([plan.data().meals.dinner.prepId]);
          prepData.push([plan.data().meals.dinner.prepData]); 
          prepDates.push([[plan.id]]);
          prepMeals.push([["DINNER"]]);

        // otherwise - exact match or alternate found
        } else {
          const dinnerDataIndex = deepPrepIndexOf(prepData[dinnerNameIndex], plan.data().meals.dinner.prepData);

          // alternative found
          if (dinnerDataIndex === -1) {
            prepIds[dinnerNameIndex].push(plan.data().meals.dinner.prepId);
            prepData[dinnerNameIndex].push(plan.data().meals.dinner.prepData);
            prepDates[dinnerNameIndex].push([plan.id]);
            prepMeals[dinnerNameIndex].push(["DINNER"]);
          
          // exact match found
          } else {
            prepDates[dinnerNameIndex][dinnerDataIndex].push(plan.id);
            prepMeals[dinnerNameIndex][dinnerDataIndex].push("DINNER");
          }
        }
      }
    })
    
    // combined data to sort
    let combined = prepNames.map((name, index) => ({
      name: name,
      id: prepIds[index],
      data: prepData[index],
      date: prepDates[index],
      meal: prepMeals[index],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
    
    // stores extracted, sorted values
    setUniquePrepNames(combined.map(item => item.name));
    setUniquePrepIds(combined.map(item => item.id));
    setUniquePrepData(combined.map(item => item.data));
    setUniquePrepDates(combined.map(item => item.date));
    setUniquePrepMeals(combined.map(item => item.meal));

    setFilteredPrepNames(combined.map(item => item.name));
    setFilteredPrepIds(combined.map(item => item.id));
    setFilteredPrepData(combined.map(item => item.data));
    setFilteredPrepDates(combined.map(item => item.date));
    setFilteredPrepMeals(combined.map(item => item.meal));
  }


  ///////////////////////////////// COPY /////////////////////////////////

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

  const [copyDate, setCopyDate] = useState(today.dateString);
  const [copyMeal, setCopyMeal] = useState("LUNCH");
  const [copyData, setCopyData] = useState(null);

  // when the option is changed to COPY
  useEffect(() => {
    if (option === "COPY") {
      setIsNameValid(true);
      loadPreps();
    }
  }, [option]);


  // when the meal or date is changed, get the new copy data
  const getCopyData = async (meal, date) => {
    
    // stores parameters in state
    setCopyMeal(meal);
    setCopyDate(date);
    
    // the selected date's data
    const prepDoc = plansSnapshot.docs.find((doc) => doc.id === date);
    
    // gets the data according to the selected meal
    let data = null;

    // if valid data
    if (prepDoc) {
      if (meal === "LUNCH") { data = prepDoc.data()?.meals?.lunch || null; } 
      else if (meal === "DINNER") { data = prepDoc.data()?.meals?.dinner || null; }

      // stores it for copying
      setCopyData(data); 
      // stores it for creating (simple)
      setPrepName(data.prepData.prepName);
      setPrepCal(data.prepData.prepCal);
      setPrepPrice(data.prepData.prepPrice);
      setPrepNote(data.prepData.prepNote);
      // stores it for creating (complex)
      setPrepCurrentAmounts(data.prepData.currentAmounts);
      setPrepCurrentData(data.prepData.currentData);
      setPrepCurrentCals(data.prepData.currentCals.map(cal => cal === "" ? "" : Math.round(cal)));
      setNumIngredients(data.prepData.currentData?.length || 0);
    
    // otherwise, not valid
    } else { setCopyData(null); }
  }

  // to submit copying data
  const submitCopy = async () => {
    
    // reformatting date
    const [year1, month1, day1] = copyDate.split().map(Number);
    const longDate = copyMeal + " " + new Date(year1, month1- 1, day1);
    
    // determines whether the radio will be checked
    const isCustom = copyData.prepId.includes("LUNCH") || copyData.prepId.includes("DINNER");
    
    // current meal info
    const meal = date.split(" ")[0];
    const [month2, day2, year2] = date.split(" ")[1].split("/");
    const formattedDate = `20${year2}-${month2.padStart(2, "0")}-${day2.padStart(2, "0")}`;

    // retrieves the current doc data
    const currData = await getDoc(doc(db, 'PLANS', formattedDate));

    // if it exists, just set the new meal
    if (currData.exists()) {
      // lunch
      if (meal === "LUNCH") { 
        updateDoc(doc(db, 'PLANS', formattedDate), { 
          "meals.lunch.prepData": copyData.prepData, 
          "meals.lunch.prepId": isCustom ? date : copyData.prepId,
        }); 
      // dinner
      } else if (meal === "DINNER") { 
        updateDoc(doc(db, 'PLANS', formattedDate), { 
          "meals.dinner.prepData": copyData.prepData, 
          "meals.dinner.prepId": isCustom ? date : copyData.prepId,
        }); 
      }

    // otherwise, create a null doc first
    } else {
      const docData = { 
        date: formattedDate,
        meals: {
          lunch: {
            prepId: meal === "LUNCH" ? (isCustom ? date : copyData.prepId) : null,          
            prepData: meal === "LUNCH" ? copyData.prepData : null,
          },
          dinner: {
            prepId: meal === "DINNER" ? (isCustom ? date : copyData.prepId) : null,         
            prepData: meal === "DINNER" ? copyData.prepData : null,
          },
        },
      };
      setDoc(doc(db, 'PLANS', formattedDate), docData);
    }
    
    // closes the modal, and indicates whether a custom prep was submitted
    closeModal(isCustom || ogSelected.filter(item => item.meal === longDate).length === 0);
    exitModal();
  }


  ///////////////////////////////// SEARCH SECTION /////////////////////////////////

  const [currIndex, setCurrIndex] = useState(0);
  const [showSearchSection, setShowSearchSection] = useState(false);

  const [prepKeywordQuery, setPrepKeywordQuery] = useState("");
  const [prepTypeFilter, setPrepTypeFilter] = useState("");
  const [keywordType, setKeywordType] = useState("meal prep");
  const [prepRestaurantFilter, setPrepRestaurantFilter] = useState("bag-outline");

  const [openPrepIndex, setOpenPrepIndex] = useState(-1);
  const [openSimpleIndex, setOpenSimpleIndex] = useState(-1);
  const [openComplexIndex, setOpenComplexIndex] = useState(-1);
  const [showSpecifics, setShowSpecifics] = useState(false);
  
  const [filteredPrepNames, setFilteredPrepNames] = useState(null);
  const [filteredPrepIds, setFilteredPrepIds] = useState(null);
  const [filteredPrepData, setFilteredPrepData] = useState(null);
  const [filteredPrepDates, setFilteredPrepDates] = useState(null);
  const [filteredPrepMeals, setFilteredPrepMeals] = useState(null);

  // to format the given date as "mm/dd/yy"
  const formatDateShort = (currDate) => {
    currDate = new Date(currDate + "T00:00:00");
    
    const mm = currDate.getMonth() + 1; // Months are 0-based
    const dd = currDate.getDate();
    const yy = currDate.getFullYear() % 100;
    
    return `${mm}/${dd}/${yy}`;
  };
  
  // to filter the list of preps in the search section
  const filterPreps = (keyword, searchQuery, typeFilter, restaurantFilter) => {
    setPrepKeywordQuery(searchQuery);
    setPrepTypeFilter(typeFilter);
    setPrepRestaurantFilter(restaurantFilter);
    setOpenPrepIndex(-1);
    setOpenSimpleIndex(-1);
    setOpenComplexIndex(-1);
    setShowSpecifics(false);
    setCurrIndex(0);

    // to get the unique list of preps
    let prepNames = [];
    let prepIds = [];
    let prepData = [];
    let prepDates = [];
    let prepMeals = [];

    // helper function for keyword & restaurant filtering
    const matchesKeywordFilter = (i, index) => {
      // meal prep keyword - checks the meal prep name
      if (keyword === "meal prep") {
        return (
          // restaurant
          restaurantFilter === "bag-add" ? uniquePrepNames[index].includes(":") : restaurantFilter === "bag-remove" ? !uniquePrepNames[index].includes(":") : true
          &&
          // keyword
          searchQuery.split(" ").every((word) =>  uniquePrepNames[index].toLowerCase().includes(word.toLowerCase() ))
        );
      }
      // ingredient keyword - checks each ingredient's name
      if (keyword === "ingredient") {
        return (
          // restaurant
          restaurantFilter === "bag-add" ? uniquePrepNames[index].includes(":") : restaurantFilter === "bag-remove" ? !uniquePrepNames[index].includes(":") : true
          &&
          // keyword
          uniquePrepData[index][i]?.currentData?.some(current =>
            searchQuery.split(" ").every(word => current?.ingredientName?.toLowerCase().includes(word.toLowerCase()) )
          )
        );
      }
      // otherwise
      return false;
    };

    // helper function for type filtering
    const matchesTypeFilter = (id) => {
      return (
        typeFilter === "" ||
        (typeFilter === "prep" && !(id.includes("LUNCH") || id.includes("DINNER") || id.includes("."))) ||
        (typeFilter === "complex" && id.includes(".")) ||
        (typeFilter === "simple" && (id.includes("LUNCH") || id.includes("DINNER")))
      );
    };

    // adds the data to the prep lists that matches the filtering
    uniquePrepNames?.map((name, index) => {
      
      // if the type and keywords match
      if (uniquePrepIds[index].some((id, i) => matchesTypeFilter(id) && matchesKeywordFilter(i, index))) {
        // adds the name to the filtered names
        prepNames.push(name); 

        // uses type and keyword filtering for specific indices
        const keepIndices = uniquePrepIds[index]
          .map((id, i) => (matchesTypeFilter(id) && matchesKeywordFilter(i, index)) ? i : -1)
          .filter(i => i !== -1);

        // adds the data after filtering
        prepIds.push(keepIndices.map((i) => uniquePrepIds[index][i]));
        prepData.push(keepIndices.map((i) => uniquePrepData[index][i]));
        prepDates.push(keepIndices.map((i) => uniquePrepDates[index][i]));
        prepMeals.push(keepIndices.map((i) => uniquePrepMeals[index][i]));
      }
    })

    // stores the data
    setFilteredPrepNames(prepNames);
    setFilteredPrepIds(prepIds);
    setFilteredPrepData(prepData);
    setFilteredPrepDates(prepDates);
    setFilteredPrepMeals(prepMeals);
  }

  // when a prep from the filter search list is selected
  const storePrepCopy = (index) => {
    
    // retrieves the data map
    const newData = {
      prepData: filteredPrepData[index][currIndex],
      prepId: filteredPrepIds[index][currIndex],
    }
    
    // stores values in state
    setCopyMeal(filteredPrepMeals[index][currIndex][filteredPrepMeals[index][currIndex]?.length - 1]);
    setCopyDate(filteredPrepDates[index][currIndex][filteredPrepMeals[index][currIndex]?.length - 1]);

    // stores data for copying
    setCopyData(newData);
    // stores data for creating (simple)
    setPrepName(newData.prepData.prepName);
    setPrepCal(newData.prepData.prepCal);
    setPrepPrice(newData.prepData.prepPrice);
    setPrepNote(newData.prepData.prepNote);
    // stores data for creating (complex)
    setPrepCurrentAmounts(newData.prepData.currentAmounts);
    setPrepCurrentData(newData.prepData.currentData);
    setPrepCurrentCals(newData.prepData.currentCals.map(cal => Math.round(cal)));
    setNumIngredients(newData?.prepData?.currentData?.length || 0);
    
    // goes back to calendar section
    setOpenPrepIndex(-1);
    setOpenSimpleIndex(-1);
    setOpenComplexIndex(-1);
    setShowSpecifics(false);
    setCurrIndex(0);
    setShowSearchSection(false);
  }


  ///////////////////////////////// CHANGING CURRENT DATA /////////////////////////////////

  // to change the current name at the given index
  const changeName = (index, value) => {
    
    setPrepCurrentData((prev) => {
      const updated = [...prev];

      // if null or undefined, initialize it
      if (!updated[index]) {

        let data = { '-': { calServing: "", servingSize: "", unit: "" } };
        storeKeys.forEach(storeKey => { data[storeKey] = { brand: "", calContainer: "", calServing: "", link: "", priceContainer: "", priceServing: "", servingContainer: "", servingSize: "", totalYield: "", unit: "" }; }); 

        updated[index] = {
          amountLeft: "?", 
          amountTotal: "", 
          archive: false, 
          check: false, 
          containerPrice: "", 
          ingredientData: data, 
          ingredientId: "", 
          ingredientName: value, 
          ingredientStore: "-", 
          ingredientTypes: [], 
          unitPrice: "",
        };

      // if already initialized, update ingredientName only
      } else {
        updated[index] = {
          ...updated[index],
          ingredientName: value,
        };
      }

      return updated;
    });
  }

  // to change the current unit at the given index
  const changeUnit = (index, value) => {

    setPrepCurrentData((prev) => {
      const updated = [...prev];

      // if null or undefined, initialize it
      if (!updated[index]) {

        let data = { '-': { calServing: "", servingSize: "", unit: value } };
        storeKeys.forEach(storeKey => { data[storeKey] = { brand: "", calContainer: "", calServing: "", link: "", priceContainer: "", priceServing: "", servingContainer: "", servingSize: "", totalYield: "", unit: "" }; }); 

        updated[index] = {
          amountLeft: "?", 
          amountTotal: "", 
          archive: false, 
          check: false, 
          containerPrice: "", 
          ingredientData: data, 
          ingredientId: "", 
          ingredientName: "", 
          ingredientStore: "-", 
          ingredientTypes: [], 
          unitPrice: "",
        };

      // if already initialized, update ingredientName only
      } else {
        updated[index] = {
          ...updated[index],
          ingredientData: {
            ...updated[index].ingredientData,
            '-': {
              ...updated[index].ingredientData['-'],
              unit: value,
            },
          }
        };
      }
      
      return updated;
    });
  }


  ///////////////////////////////// INGREDIENT SEARCH /////////////////////////////////

  const [showIngredientSearch, setShowIngredientSearch] = useState(false)
  const [ingredientsSnapshot, setIngredientsSnapshot] = useState(null);
  const [filteredIngredients, setFilteredIngredients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');   
  const [selectedStore, setSelectedStore] = useState(storeKeys[0]);  

  // gets the snapshot if null
  useEffect(() => {
    if (showIngredientSearch && ingredientsSnapshot === null) {
      fetchIngredients();
    }
  }, [showIngredientSearch])

  // gets all of the ingredients
  const fetchIngredients = async () => {
    const querySnapshot = await getDocs(collection(db, 'INGREDIENTS'));
    setIngredientsSnapshot(querySnapshot);

    // original data
    let dataToUse = querySnapshot.docs.map((ingredient) => {
      return {
        id: ingredient.id,    
        ...ingredient.data(),  
      };
    });

    // alphabetizes by ingredient name
    dataToUse.sort((a, b) => 
      a.ingredientName.localeCompare(b.ingredientName)
    );

    // stores initial
    setFilteredIngredients(dataToUse);
  }

  // filters data based on query
  const filterIngredientData = async (queryToUse) => {

    // original data
    let dataToUse = ingredientsSnapshot.docs.map((ingredient) => {
      return {
        id: ingredient.id,    
        ...ingredient.data(),  
      };
    });

    // filters by search query
    const queryWords = queryToUse
      .toLowerCase()
      .split(" ")
      .filter((word) => word.trim() !== "");
  
    dataToUse = dataToUse.filter((ingredient) =>
      queryWords.every((word) =>
        ingredient.ingredientName.toLowerCase().includes(word)
      )
    );

    // alphabetizes by ingredient name
    dataToUse.sort((a, b) => 
      a.ingredientName.localeCompare(b.ingredientName)
    );
    
    // sets the filtered data in the state
    setFilteredIngredients(dataToUse);
  }

  // refilters when search query changes
  useEffect(() => {
    filterIngredientData(searchQuery);
  }, [searchQuery])
  
  // decides the next store
  const changeSelectedStore = () => {
    setSelectedStore(storeKeys[(storeKeys.indexOf(selectedStore) + 1) % storeKeys.length]); 
  }


  ///////////////////////////////// HTML /////////////////////////////////
  
  return (

    <Modal
      transparent={true}
      animationType="slide"
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View className="flex-1 justify-center items-center">
      
        {/* Background Overlay */}
        <TouchableOpacity 
          onPress={isEditing ? undefined : () => setModalVisible(false)} 
          activeOpacity={isEditing && 0.5}
          className="absolute bg-black opacity-50 w-full h-full"
        />
        
        {/* Modal Content */}
        <View className="flex w-5/6 py-5 px-5 bg-zinc200 rounded-2xl z-50">

          {/* TOP ROW */}
          <View className="flex flex-row justify-between items-center px-2">
            {/* Date */}
            <Text className="text-[20px] font-bold">
              {dispDate}
            </Text>
            
            {/* BUTTON */}
            {(data !== null) && (
              <Icon 
                size={24}
                color={colors.zinc800}
                name={isEditing ? "backspace" : "create"}
                onPress={() => {
                  setIsEditing(!isEditing)
                  setPrepCurrentCals(!isEditing ? prepCurrentCals?.map(cal => cal === "" ? "" : Math.round(cal)) || [] : prepCurrentCals)
                  setCreateComplex(!(id.includes("LUNCH") || id.includes("DINNER")))
                }}
              />
            )}
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>


          {/* WHEN VIEWING */}
          {!isEditing ?
          <>
            {/* OVERALL DETAILS */}
            {!(id?.includes("LUNCH") || id?.includes("DINNER"))
            ? // if filled in
            <>
              <View className="flex flex-row items-center justify-center border-0.5 h-[50px] mb-1">
                
                {/* Meal Name */}
                <View className="flex justify-center items-center px-1.5 w-7/12 h-full border-r-0.5 bg-zinc700">
                  <Text className="text-[13px] font-semibold text-white text-center">
                      {data?.prepName?.toUpperCase() || ""}
                  </Text>
                </View>

                {/* Meal Details */}
                <View className="flex justify-center items-center w-5/12 h-full bg-zinc600">
                  <Text className="text-[11px] text-white">
                      {data?.prepCal || "0"}{" cal, $"}{data?.prepPrice || "0.00"}
                  </Text>
                </View>
              </View>

              {/* GRID */}
              <ScrollView className="flex flex-col max-h-1/2 z-10 border-[1px] bg-zinc700 border-zinc700">
                  
                {/* Frozen Columns */}
                {Array.from({ length: numIngredients }, (_, index) => (
                  <View key={`frozen-${index}`} className="flex flex-row min-h-[30px] bg-white">
                    <View className="bg-black w-full flex-row">

                      {/* ingredient names */}
                      <View className="flex py-1 items-center justify-center w-7/12 bg-theme600 border-b-0.5 border-r-0.5 border-zinc700 z-10">
                        <Text className="text-white font-semibold text-[10px] text-center px-2">
                          {data?.currentData?.[index]?.ingredientName || ""}
                        </Text>
                      </View>
                      
                      {/* amount */}
                      <View className="flex py-1 px-1 w-1/4 items-center justify-center bg-zinc100 border-b-0.5 border-b-zinc400 border-r-0.5 border-r-zinc300">
                        {data?.currentData?.[index]?.ingredientData?.[data?.currentData?.[index]?.ingredientStore]?.unit && (
                          <Text className="text-[10px] text-center">
                            {data?.currentAmounts[index] || "?"}{` ${extractUnit(data?.currentData[index].ingredientData[data?.currentData[index].ingredientStore].unit, data?.currentAmounts[index]) || ""}`}
                          </Text>
                        )}
                      </View>

                      {/* details */}
                      <View className="flex flex-col items-center justify-evenly bg-white w-1/6 border-b-0.5 border-b-zinc400">
                        
                        {/* calories */}
                        {data?.currentCals?.[index] !== "" ? 
                          <Text className="text-[10px] text-center">
                            {!isNaN(Number(data?.currentCals?.[index])) ? Number(data?.currentCals?.[index]).toFixed(0) : "0"} {"cal"}
                          </Text>
                        : null}

                        {/* price */}
                        {data?.currentPrices?.[index] !== "" ? 
                          <Text className="text-[10px] text-center">
                            {"$"}{!isNaN(Number(data?.currentCals?.[index])) ? Number(data?.currentPrices?.[index]).toFixed(2) : "0.00"}
                          </Text>
                        : null}
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </>

            : // if not filled in
            <View className="flex flex-col items-center justify-center mb-1 space-y-2">
              
              {/* Meal Name */}
              <View className="flex px-2 justify-center items-center w-full min-h-[30px] py-1 border-0.5 bg-theme600">
                <Text className="text-[13px] font-semibold text-white text-center">
                    {data?.prepName || ""}
                </Text>
              </View>
              
              {/* Meal Specifics */}
              {data?.prepNote === "" 
              ? // no notes
                <View className="flex flex-row justify-center items-center w-full h-[20px] bg-zinc500">
                  <Text className="text-[11px] text-zinc100 italic">
                      {data?.prepCal || "0"}{" cal, $"}{data?.prepPrice || "0.00"}
                  </Text>
                </View>
              : 
              (data?.prepCal === "0" && data?.prepPrice === "0.00")
              ? // no price / cal
                <View className="flex flex-row justify-center items-center w-full py-2 bg-zinc450">
                  <Text className="text-[11px] text-center text-zinc100 italic">
                      {data?.prepNote}
                  </Text>
                </View>
              :
                <View className="flex flex-row bg-black">

                  {/* Meal Details */}
                  <View className="flex flex-col justify-center items-center w-1/2 py-2 bg-zinc500">
                    <Text className="text-[11px] text-zinc100 italic">
                        {`${data?.prepCal || "0"} cal`}
                    </Text>
                    <Text className="text-[11px] text-zinc100 italic">
                        {`$${data?.prepPrice || "0.00"}`}
                    </Text>
                  </View>

                  {/* Meal Note */}
                  <View className="flex justify-center items-center w-1/2 py-2 bg-zinc450">
                    <Text className="text-[10px] text-center text-white font-medium">
                        {data?.prepNote}
                    </Text>
                  </View>
                </View>
              }
            </View>
            }
          </>
          
          : // WHEN EDITING
          <View className="flex flex-col items-center justify-center">

            {/* Top Row */}
            <View className="flex flex-row">
            
              {/* Arrow Indicating Other Option */}
              <View className="bg-theme500 text-zinc200 pl-1 justify-center items-center text-[18px]">
                <Icon
                  name={option === "CREATE" ? "arrow-down" : "arrow-up"}
                  size={20}
                  color={colors.zinc200}
                />
              </View>

              {/* Option Seletion - COPY OR CREATE */}
              <View className="flex w-5/6 px-5">
                <Picker
                  selectedValue={option}
                  onValueChange={setOption}
                  style={{ height: 30, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -20, paddingRight: 15, backgroundColor: colors.theme500, }}
                  itemStyle={{ color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 16, }}
                >
                  {(["CREATE", "COPY"]).map((item) => (
                      <Picker.Item
                        key={item}
                        label={item + " MEAL PREP"}
                        value={item}
                      />
                    ))
                  }
                </Picker>

                {/* Create Type Selector */}
                {(option === "CREATE") && (
                  <View className="absolute flex h-full justify-center items-center right-1">
                    <Icon
                      name={createComplex ? "information-circle" : "information-circle-outline"}
                      color={"black"}
                      size={20}
                      onPress={() => setCreateComplex(!createComplex)}
                    />
                  </View>
                )}
              </View> 
            </View>

            {/* Divider */}
            <View className="h-[0.5px] bg-zinc400 w-11/12 m-4"/>

            {(option === "CREATE" && !createComplex)
            ?
              <>
                {/* simple create without ingredients */}
                <View className="flex flex-col w-full justify-center items-center">
                  <View className="flex flex-row justify-evenly content-center mb-4 w-full h-[65px] px-5">
                    
                    {/* Prep Name Input */}
                    <View className="flex justify-center items-center h-full w-1/2 bg-white rounded-md py-1 px-2 border-0.5 border-zinc500">
                      <TextInput
                        className="w-full text-center mb-1 text-[14px] leading-[17px]"
                        placeholder={prepName === "" ? "meal prep name" : prepName}
                        placeholderTextColor={colors.zinc400}
                        multiline={true}
                        blurOnSubmit={true}
                        value={prepName}
                        onChangeText={setPrepName}
                      />
                    </View>
                    
                    
                    {/* DETAILS */}
                    <View className="flex flex-col justify-center items-center w-1/2 h-full space-y-2 pl-5">
          
                      {/* Calories */}
                      <View className="flex flex-row h-[25px] w-full space-x-1 px-2 justify-center items-center border-[1px] border-zinc450 bg-zinc400">
                        {/* amount input */}
                        <TextInput
                          className="flex-auto text-right bg-transparent italic text-[12px] leading-[15px]"
                          placeholder={prepCal === "" ? "0" : prepCal}
                          placeholderTextColor='black'
                          value={prepCal}
                          onChangeText={(value) => setPrepCal(validateWholeNumberInput(value))}
                        />
                        {/* label */}
                        <Text className="flex-auto text-left italic text-[12px]">
                          calories
                        </Text>
                      </View>
          
                      {/* Price */}
                      <View className="flex flex-row w-full h-[25px] justify-center items-center border-[1px] border-zinc450 bg-zinc400">
                        {/* label */}
                        <Text className="flex-auto text-right justify-center pl-1 italic text-[12px]">
                          $
                        </Text>
                        
                        {/* price input */}
                        <TextInput
                          className="flex-auto bg-transparent text-left pr-1 italic text-[12px] leading-[15px]"
                          placeholder={prepPrice === "" ? "0.00" : prepPrice}
                          placeholderTextColor='black'
                          value={prepPrice}
                          onChangeText={(value) => setPrepPrice(validateDecimalInput(value))}
                          onBlur={() => {
                            setPrepPrice((prev) => {
                              const num = parseFloat(prev);
                              return isNaN(num) ? "0.00" : num.toFixed(2);
                            });
                          }}
                        />
                      </View>
                    </View>
                  </View>
                    
                  {/* Prep Note Input */}
                  <View className="flex w-11/12 mb-4 bg-theme100 rounded-md py-0 px-2 border-[1px] border-theme200">
                    <TextInput
                      className="w-full text-center mb-1 italic text-[12px] text-zinc900"
                      placeholder={prepNote === "" ? "meal prep notes" : prepNote}
                      placeholderTextColor={colors.theme600}
                      multiline={true}
                      onFocus={() => setKeyboardType("note")}
                      onBlur={() => setKeyboardType("")}
                      value={prepNote}
                      onChangeText={setPrepNote}
                    />

                    {(keyboardType === "note") && (
                      <View className="absolute right-1.5 bottom-0.5">
                        <Icon
                          name="chevron-down"
                          size={14}
                          color={colors.zinc900}
                          onPress={() => {
                            Keyboard.dismiss()
                            setIsKeyboardOpen(false)
                            setKeyboardType("")
                          }}
                        />
                      </View>
                    )}
                  </View>

                  {/* WARNING FOR PREP */}
                  {(copyData === null 
                    ? !(id === null || id?.includes("LUNCH") || id?.includes("DINNER") || id?.includes("."))
                    : !(copyData?.prepId === null || copyData?.prepId?.includes("LUNCH") || copyData?.prepId?.includes("DINNER") || copyData?.prepId?.includes(".")))
                  && (
                    <View className="w-full px-2 mb-2">
                      {/* divider */}
                      <View className="h-[1px] bg-zinc350 mb-4"/>
                      {/* text */}
                      <Text className="text-mauve600 italic text-center text-[12px]">
                        {'modifying this meal prep is not recommended\nand may lead to inaccurate calculations'}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            : (option === "CREATE" && createComplex)
            ? !showIngredientSearch
            ?
              <>
                {/* create with ingredients */}
                <View className="flex flex-col justify-center items-center w-full mb-2 ml-[-5px]">

                  {/* TOP ROW */}
                  <View className="flex flex-row items-center justify-center border-0.5 mb-1 ml-[15px] mr-[10px] bg-zinc600">
                    
                    {/* Meal Name Input */}
                    <View className="flex justify-center items-center px-1.5 w-7/12 border-r-0.5 bg-zinc700">
                      <TextInput
                        className="w-full text-[13px] font-semibold text-white text-center py-2 px-1 leading-[16px]"
                        placeholder={prepName === "" ? "meal prep name" : prepName}
                        placeholderTextColor={colors.zinc400}
                        multiline={true}
                        blurOnSubmit={true}
                        value={prepName}
                        onChangeText={setPrepName}
                      />
                    </View>
    
                    {/* Meal Details */}
                    <View className="flex flex-row px-1 space-x-3 justify-center items-center w-5/12">

                      {/* calories */}
                      <View className="flex-auto items-end pl-2">
                        <Text className="text-center text-[11px] text-white">
                            {prepCal === "" ? "0" : prepCal || "0"}{" cal"}
                        </Text>
                      </View>

                      {/* price */}
                      <View className="flex flex-auto flex-row pr-2">
                        <Text className={`flex text-right text-[11px] ${prepPrice === "" ? "text-zinc400" : "text-white"}`}>
                          $
                        </Text>
                        <TextInput
                          className="flex text-left text-[11px] text-white leading-[13px]"
                          placeholder={prepPrice === "" ? "0.00" : prepPrice}
                          placeholderTextColor={colors.zinc400}
                          value={prepPrice}
                          onChangeText={(text) => setPrepPrice(validateDecimalInput(text))}
                          onBlur={() => {
                            setPrepPrice((prev) => {
                              const num = parseFloat(prev);
                              return isNaN(num) ? "0.00" : num.toFixed(2);
                            });
                          }}
                        />
                      </View>
                    </View>

                    {/* First Index Add Indicator */}
                    <View className="absolute w-[20px] left-[-15px] top-[32.5px] pr-1 z-50 justify-end items-center">
                      {(showNewIndex && numIngredients !== 0) && (
                        <Icon
                          name="send"
                          size={10}
                          color={colors.zinc600}
                          onPress={() => addPrepIngredient(0)}
                        />
                      )}
                    </View>   
                  </View> 
    
                  {/* GRID */}
                  {(numIngredients !== 0) && (
                    <ScrollView className={`flex flex-col w-full mr-[-10px] z-10 ${(keyboardType === "grid" && isKeyboardOpen) ? "max-h-[100px]" : "max-h-[430px]"}`}>
                      
                      {/* Frozen Columns */}
                      {Array.from({ length: numIngredients }, (_, index) => index < numIngredients && (
                        <View key={`frozen-${index}`} className="flex flex-row min-h-[30px]">

                          {/* Add Indicator */}
                          <View className="w-[20px] h-[10px] mt-[-5px] mx-[-5px] pr-1 z-50 justify-end items-center">
                            {(index !== 0 && showNewIndex) && (
                              <Icon
                                name="send"
                                size={10}
                                color={colors.zinc600}
                                onPress={() => addPrepIngredient(index)}
                              />
                            )}
                          </View>      

                          {/* current */}
                          <View className={`flex-1 flex-row bg-zinc500 border-x-[1px] ${(index === 0) && "border-t-[1px]"} ${(index === numIngredients - 1) && "border-b-[1px]"} border-zinc700`}>
      
                            {/* ingredient names */}
                            <View className="flex items-center justify-center w-7/12 bg-theme600 border-b-0.5 border-r-0.5 border-zinc700 z-10">     
                              <View className="flex flex-wrap flex-row">
                                {/* Input */}
                                <TextInput
                                  className="w-full text-white font-semibold text-[10px] text-center px-2 py-2"
                                  placeholder="ingredient name"
                                  placeholderTextColor={colors.zinc350}
                                  value={prepCurrentData?.[index]?.ingredientName || ""}
                                  onChangeText={(value) => changeName(index, value)}
                                  multiline={true}
                                  blurOnSubmit={true}
                                  onFocus={() => setKeyboardType("grid")}
                                  onBlur={() => setKeyboardType("")}
                                />
                              </View>
                            </View>
                            
                            {/* amount */}
                            <View className="flex flex-row px-1 space-x-0.5 items-center justify-center bg-zinc100 w-1/4 border-b-0.5 border-b-zinc400 border-r-0.5 border-r-zinc400">
                              {/* Amount Input */}
                              <TextInput
                                className="text-[9px] flex text-center h-full pl-4"
                                placeholder="_"
                                placeholderTextColor={colors.zinc450}
                                value={prepCurrentAmounts?.[index]}
                                onChangeText={(value) => {
                                  setPrepCurrentAmounts((prev) => {
                                    const updated = [...prev];
                                    updated[index] = validateFractionInput(value);
                                    return updated;
                                  });
                                }}
                                onFocus={() => setKeyboardType("grid")}
                                onBlur={() => setKeyboardType("")}
                              />
                              
                              {/* Unit Input */}
                              <TextInput
                                className="text-[9px] leading-[12px] text-center pr-4 py-1"
                                placeholder="unit(s)"
                                placeholderTextColor={colors.zinc450}
                                value={prepCurrentData?.[index]?.ingredientData[prepCurrentData?.[index]?.ingredientStore]?.unit || ""}
                                onChangeText={(value) => changeUnit(index, value)}
                                multiline={true}
                                blurOnSubmit={true}
                                onFocus={() => setKeyboardType("grid")}
                                onBlur={() => setKeyboardType("")}
                              />
                            </View>
      
                            {/* calories */}
                            <View className="flex flex-row px-1 space-x-0.5 items-center justify-center bg-white w-1/6 border-b-0.5 border-b-zinc400">
                              
                              {/* Amount Input */}
                              <TextInput
                                className="text-[9px] flex-auto text-right"
                                placeholder="_"
                                placeholderTextColor={colors.zinc400}
                                value={prepCurrentCals?.[index]?.toString()}
                                onChangeText={(value) => {
                                  setPrepCurrentCals((prev) => {
                                    const updated = [...prev];
                                    updated[index] = validateWholeNumberInput(value);
                                    return updated;
                                  });
                                }}
                                onFocus={() => setKeyboardType("grid")}
                                onBlur={() => setKeyboardType("")}
                              />

                              {/* Label */}
                              <Text className="text-[9px] flex-auto text-left">
                                {"cal"}
                              </Text>
                            </View>
                          </View>

                          {/* Delete Button */}
                          <View className="flex w-[20px] mx-[-2.5px] pl-1 z-50 justify-center items-center">
                            <Icon
                              name="close"
                              size={15}
                              color={colors.zinc600}
                              onPress={() => deletePrepIngredient(index)}
                            />
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  )}

                  {/* Add Another Ingredient Row */}
                  {(copyData === null 
                    ? (id === null || id?.includes("LUNCH") || id?.includes("DINNER") || id?.includes("."))
                    : (copyData?.prepId === null || copyData?.prepId?.includes("LUNCH") || copyData?.prepId?.includes("DINNER") || copyData?.prepId?.includes(".")))
                  && (
                    <View className="flex flex-row items-center justify-center ml-[15px] mr-[10px]">

                      {/* Last Index Add Indicator */}
                      <View className="absolute w-[20px] left-[-15px] pr-1 top-[-5px] z-50 justify-end items-center">
                        {showNewIndex && (
                          <Icon
                            name="send"
                            size={10}
                            color={colors.zinc600}
                            onPress={() => addPrepIngredient(numIngredients)}
                          />
                        )}
                      </View>   

                      <TouchableOpacity 
                        className="flex justify-center items-center bg-zinc350 w-full py-0.5 border-b-[1px] border-x-[1px] border-zinc400"
                        onPress={() => setShowNewIndex(!showNewIndex)}
                      >
                        <Icon
                          name={!showNewIndex ? "add" : "close-outline"}
                          size={14}
                          color={colors.zinc900}
                        />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* SEARCH TOGGLE */}
                  <TouchableOpacity 
                    className={`flex flex-row justify-center items-center px-3 py-1 mt-4 ml-[20px] ${(keyboardType === "grid" && isKeyboardOpen) && "mb-6"} rounded-full space-x-1 bg-theme200 border-[1px] border-zinc350`}
                    onPress={() => setShowIngredientSearch(true)}
                  >
                    {/* search button */}
                    <Icon
                      name="search"
                      size={11}
                      color={colors.zinc900}
                    />
                    {/* text */}
                    <Text className="text-[12px] font-medium">
                      INGREDIENTS
                    </Text>
                  </TouchableOpacity>

                  {/* WARNING FOR PREP */}
                  {(copyData === null 
                    ? !(id === null || id?.includes("LUNCH") || id?.includes("DINNER") || id?.includes("."))
                    : !(copyData?.prepId === null || copyData?.prepId?.includes("LUNCH") || copyData?.prepId?.includes("DINNER") || copyData?.prepId?.includes(".")))
                  && (
                    <View className="w-full mt-2 ml-[20px] px-2">
                      {/* divider */}
                      <View className="h-[1px] bg-zinc350 m-4"/>
                      {/* text */}
                      <Text className="text-mauve600 italic text-center text-[12px]">
                        {'modifying this meal prep is not recommended\nand may lead to inaccurate calculations'}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            :
            <View className="flex w-full mb-2">
                      
              {/* Ingredient Filtering */}
              <View className="flex flex-row w-full h-[30px] pl-8 pr-10 mb-2 items-center justify-center">

                {/* back button */}
                <View className="pr-1">
                  <Icon 
                    size={24}
                    color={colors.zinc700}
                    name="caret-back"
                    onPress={() => setShowIngredientSearch(false)}
                  />
                </View>
      
                {/* filter input */}
                <View className="flex bg-white w-full border-0.5 h-full border-zinc500 rounded-md justify-center items-start pl-2 pr-6">
                  <TextInput
                    className="w-full mb-1 text-left text-[14px] leading-[17px]"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="search for ingredient"
                    placeholderTextColor={colors.zinc400}
                    multiline={true}
                    blurOnSubmit={true}
                  />
      
                  {/* clear button */}
                  <View className="absolute right-1 h-full items-center flex flex-row">
                    <Icon 
                      size={20}
                      color="black"
                      name="close-outline"
                      onPress={() => setSearchQuery("")}
                    />
                  </View>
                </View>

                {/* Store Selection */}
                <TouchableOpacity 
                  className="pl-2 justify-center items-center"
                  onPress={() => changeSelectedStore()}
                >
                  <Image
                    source={storeImages[selectedStore]?.src || null}
                    alt="store"
                    style={{
                      width: storeImages[selectedStore]?.width,
                      height: storeImages[selectedStore]?.height,
                    }}
                  />
                </TouchableOpacity>
              </View>

              {/* MAP OF INGREDIENTS */}
              <View className="px-3">
                {filteredIngredients.length > 0 
                ?
                <FlatList
                  className="flex w-full h-[300px] border-4 border-zinc300 bg-zinc300"
                  data={filteredIngredients}
                  keyExtractor={(_, index) => index.toString()}
                  renderItem={({ item: ingredient, index }) => (
                    <View className={`flex flex-row w-full justify-between mb-1 ${(index % 2 === 0) ? "bg-theme300 border-b-zinc600" : "bg-theme400 border-b-zinc700"}`}>

                      {/* ingredient name */}
                      <View className="flex-1 flex-wrap justify-center items-center py-1 px-2">
                        <Text className="text-[12px] text-black font-medium">
                          {ingredient?.ingredientName}
                        </Text>
                      </View>
                      
                      {/* servings */}
                      <View className={`justify-center items-end flex py-1 px-2 ${(index % 2 === 0) ? "bg-zinc350 border-b-zinc600" : "bg-zinc400 border-b-zinc700"}`}>
                        <Text className="text-[10px] text-right text-black font-medium">
                          {`${ingredient?.ingredientData[selectedStore].servingSize} ${ingredient?.ingredientData[selectedStore].unit}`}
                        </Text>
                        <Text className="text-[10px] text-right text-black font-medium">
                          {(ingredient?.ingredientData[selectedStore].calServing !== "") && `${ingredient?.ingredientData[selectedStore].calServing} cal`}
                        </Text>
                      </View>
                    </View>
                  )}
                />
                :
                // empty snack list after filtering
                <View className="flex w-full justify-center items-center h-[300px] border-4 border-zinc300 bg-zinc350">
                  <Text className="italic text-center text-theme900 font-semibold">
                    no ingredients match the current filter
                  </Text>
                </View>
                }
              </View>
            </View>

            : // option === "COPY"
              <>
              {!showSearchSection
              ?
                <View className="flex flex-col w-full justify-center items-center">
    
                  {/* row above calendar */}
                  <View className="flex flex-row w-4/5">
    
                    {/* Meal Selection */}
                    <View className="flex-1">
                      <Picker
                        selectedValue={copyMeal}
                        onValueChange={(value) => getCopyData(value, copyDate)}
                        style={{ height: 30, justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.zinc400, }}
                        itemStyle={{ color: 'black', fontWeight: 'bold', textAlign: 'center', fontSize: 14, fontStyle: 'italic', }}
                      >
                        {(["LUNCH", "DINNER"]).map((item) => (
                            <Picker.Item
                              key={item}
                              label={item}
                              value={item}
                            />
                          ))
                        }
                      </Picker>
                    </View>
    
                    {/* Search Button */}
                    <View className="absolute h-full right-0 justify-center items-center px-1 bg-zinc600">
                      <Icon
                        name="search"
                        color="white"
                        size={18}
                        onPress={() => setShowSearchSection(true)}
                      />
                    </View>
                  </View>
    
                  {/* Date Selection */}
                  <View className="flex w-4/5">
                    <Calendar
                      key={copyDate}
                      current={copyDate}           
                      onDayPress={(value) => getCopyData(copyMeal, value.dateString)}
                      markedDates={{
                        [copyDate]: { 
                          selected: true, 
                          marked: true, 
                          selectedColor: copyDate === today?.dateString ? colors.zinc400 : colors.theme500 
                        },
                      }}
                      theme={{
                        todayTextColor: colors.theme500,
                        todayBackgroundColor: colors.zinc200,
                        arrowColor: colors.theme400,
                        monthTextColor: 'black',
                      }}
                    />
                  </View>
    
                  {/* Meal Display */}
                  <View className="flex flex-col w-11/12 space-y-1 -mx-5 mt-4 mb-2 px-2 justify-center items-center bg-theme100 py-1 border-2 border-zinc350">
                    {copyData?.prepData?.prepName 
                    ?
                      <>
                        <Text className="font-bold text-theme900 text-center">
                          SELECTED MEAL PREP:
                        </Text>
                        <View className="flex w-full">
                          <Text className="flex italic text-center">
                            {copyData.prepData.prepName}
                          </Text>
                        </View>
                      </>
                    
                    : // invalid data
                      <Text className="font-bold text-theme800 italic">
                        no meal prep matches this selection
                      </Text>
                    }
                  </View>
                </View>
              :
                <View className="flex flex-col w-full">
                  
                  {/* RECIPE FILTERING SECTION */}
                  <View className="flex flex-row w-full px-3 justify-between items-center mb-[20px]">
                    <View className="flex flex-row w-[85%]">

                      {/* Keyword Type Selector */}
                      <View className="bg-zinc300 px-1 py-1 rounded-l-md h-[30px] items-center justify-center">
                        <Icon
                          name={keywordType === "meal prep" ? "code-working" : keywordType === "ingredient" && "list"}
                          color={colors.zinc900}
                          size={20}
                          onPress={() => {
                            const keyword = keywordType === "meal prep" ? "ingredient" : "meal prep";
                            setKeywordType(keyword)
                            filterPreps(keyword, "", prepTypeFilter, prepRestaurantFilter)
                          }}
                        />
                      </View>

                      {/* text input */}
                      <TextInput
                        value={prepKeywordQuery}
                        onChangeText={(value) => filterPreps(keywordType, value, prepTypeFilter, prepRestaurantFilter)}
                        placeholder={`${keywordType} keyword(s)`}
                        placeholderTextColor={colors.zinc400}
                        className="flex-1 w-5/6 bg-white rounded-r-md border-[1px] border-zinc300 pl-2.5 pr-[50px] py-1.5 text-[14px] leading-[17px]"
                      />
          
                      {/* BUTTONS */}
                      <View className="flex flex-row absolute right-1 h-[30px] items-center justify-center">

                        {/* type filtering */}
                        <Icon
                          name={prepTypeFilter === "prep" ? "information-circle" : prepTypeFilter === "complex" ? "stop-circle" : prepTypeFilter === "simple" ? "ellipse" : "ellipse-outline"}
                          color={colors.zinc700}
                          size={18}
                          onPress={() => filterPreps(keywordType, prepKeywordQuery, prepTypeFilter === "prep" ? "complex" : prepTypeFilter === "complex" ? "simple" : prepTypeFilter === "simple" ? "" : "prep", prepRestaurantFilter)}
                        />

                        {/* clear */}
                        <Icon
                          name="close-outline"
                          size={20}
                          color="black"
                          onPress={() => {
                            setPrepKeywordQuery("");
                            setOpenPrepIndex(-1);
                            setOpenComplexIndex(-1);
                            setOpenSimpleIndex(-1);
                            setShowSpecifics(false);
                            filterPreps(keywordType, "", prepTypeFilter, prepRestaurantFilter);
                          }}
                        />
                      </View>
                    </View>
                    
                    {/* Restaurant Indicator */}
                    <View className="p-1 absolute right-2">
                      <Icon
                        name={prepRestaurantFilter}
                        size={20}
                        color={colors.theme800}
                        onPress={() => filterPreps(keywordType, prepKeywordQuery, prepTypeFilter, 
                          prepRestaurantFilter === "bag-outline" ? "bag-add" : prepRestaurantFilter === "bag-add" ? "bag-remove" : prepRestaurantFilter === "bag-remove" && "bag-outline", 
                          uniquePrepNames, uniquePrepIds, uniquePrepData, uniquePrepDates, uniquePrepMeals
                        )}
                      />
                    </View>
                  </View>
                  
                  {/* Filtered List of Preps */}
                  {filteredPrepData?.length > 0 
                  ?
                  <ScrollView
                    vertical
                    scrollEventThrottle={16}
                    contentContainerStyle={{ flexDirection: 'column' }}
                    className="max-h-[200px] bg-zinc500 border-2 border-zinc600 space-y-2 mb-3"
                  >
                    {filteredPrepData?.map((prep, index) =>
                      <View
                        key={index}
                        className="flex flex-col items-center justify-center"
                      >
                        {/* GENERAL DETAILS */}
                        <View className="flex flex-row border-y-[1px] border-zinc600">

                          {/* use this date button */}
                          <View className="flex w-1/12 bg-zinc100 justify-center items-center">
                            <Icon
                              name="play-skip-back"
                              color="black"
                              size={16}
                              onPress={() => storePrepCopy(index)}
                            />
                          </View>
                          
                          {/* Overall Name Display */}
                          <View className="flex flex-row w-7/12 bg-theme300 py-2 pl-2 pr-1 space-x-2 items-center justify-between">
                            {/* name */}
                            <View className="flex-1">
                              <Text className="text-left text-[13px] italic">
                                {filteredPrepNames?.[index]}
                              </Text>
                            </View>
                                          
                            {/* indicator of selected option */}
                            <TouchableOpacity 
                              className="" 
                              onPress={(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? () => {
                                setCurrIndex((currIndex + 1) % prep.length); 
                                setOpenSimpleIndex(
                                  filteredPrepIds[index]?.[(currIndex + 1) % prep.length]?.includes("LUNCH") || filteredPrepIds[index]?.[(currIndex + 1) % prep.length]?.includes("DINNER") ? index : -1);
                                setOpenPrepIndex(
                                  (filteredPrepIds[index]?.[(currIndex + 1) % prep.length]?.includes(".")) ? index : -1); 
                                setOpenComplexIndex(
                                  !(filteredPrepIds[index]?.[(currIndex + 1) % prep.length]?.includes("LUNCH") || filteredPrepIds[index]?.[(currIndex + 1) % prep.length]?.includes("DINNER"))
                                    && !(filteredPrepIds[index]?.[(currIndex + 1) % prep.length]?.includes("."))
                                  ? index : -1
                                );
                              } : undefined}
                              activeOpacity={!(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) && 1}
                            >
                              <Text className="text-[12px] font-semibold text-theme900">
                                {(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index)
                                ? `${currIndex + 1}/${prep.length}`
                                : `(${prep.length})`}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {/* date */}
                          <View className="flex flex-col w-1/4 bg-theme400 py-2 justify-center items-center">
                            <Text className="text-[12px] font-medium">
                              {filteredPrepMeals[index]
                                ?.[(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0]
                                ?.[filteredPrepMeals[index]?.[(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0]?.length - 1]
                              }
                            </Text>
                            <Text className="text-[13px] font-medium">
                              {formatDateShort(
                                filteredPrepDates[index]
                                  ?.[(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0]
                                  ?.[filteredPrepMeals[index]?.[(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0]?.length - 1]
                              )}
                            </Text>
                          </View>
                          
                          {/* open ingredients button */}
                          {(filteredPrepIds[index]?.[(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0]?.includes("LUNCH") 
                            || filteredPrepIds[index]?.[(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0]?.includes("DINNER")) 
                          ? // if simple custom
                          <View className="flex w-1/12 py-2 justify-center items-center bg-zinc350">
                            <Icon
                              name="ellipse"
                              color={colors.zinc400}
                              size={18}
                              onPress={() => {
                                setCurrIndex((openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0)
                                setOpenSimpleIndex(openSimpleIndex === index ? -1 : index)
                                setOpenComplexIndex(-1)
                                setOpenPrepIndex(-1)
                                setShowSpecifics(false)
                              }}
                            />
                          </View>
                          : (filteredPrepIds[index]?.[(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0]?.includes("."))
                          ? // if complex custom
                          <View className="flex w-1/12 py-2 justify-center items-center bg-zinc350">
                            <Icon
                              name="stop-circle"
                              color={colors.zinc450}
                              size={20}
                              onPress={() => {
                                setCurrIndex((openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0)
                                setOpenComplexIndex(openComplexIndex === index ? -1 : index)
                                setOpenSimpleIndex(-1)
                                setOpenPrepIndex(-1)
                                setShowSpecifics(false)
                              }}
                            />
                          </View>
                          : // if original
                          <View className="flex w-1/12 py-2 justify-center items-center bg-zinc350">
                            <Icon
                              name="information-circle"
                              color={colors.zinc800}
                              size={20}
                              onPress={() => {
                                setCurrIndex((openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0)
                                setOpenPrepIndex(openPrepIndex === index ? -1 : index)
                                setOpenComplexIndex(-1)
                                setOpenSimpleIndex(-1)
                                setShowSpecifics(false)
                              }}
                            />
                          </View>
                          }
                        </View>
                        
                        {/* COMPLEX DETAILS */}
                        {(openPrepIndex === index || openComplexIndex === index) && (
                          <View className="flex flex-row w-full">
                          {/* Ingredient List */}

                            {!showSpecifics
                            ? // not showing specific amounts
                            <View className="flex flex-col w-3/4 bg-zinc300 py-1 items-start justify-center">
                              {prep[currIndex]?.currentData.map((current, i) => 
                                current !== null && (
                                  <View key={i} className="flex flex-row w-full pl-2 pr-5 space-x-1">
                                    {/* current ingredient name */}
                                    <Text className="text-zinc800 text-[11px] text-center">
                                      {"⁃"}
                                    </Text>
                                    <Text className="text-zinc800 text-[11px] text-left pr-2">
                                      {current.ingredientName}
                                    </Text>
                                  </View>
                                )
                              )}
                            </View>
                            : 
                            // showing specific amounts
                            <View className="flex w-full bg-zinc300 items-start justify-center">
                              <>
                              {prep[currIndex].currentData.map((current, i) => 
                                current !== null && (
                                  <View key={i} className="flex flex-row">

                                    {/* INGREDIENT NAME */}
                                    <View className={`${(i === 0) && "pt-1"} ${(i === prep[currIndex].currentData.filter(curr => curr !== null).length - 1) && "pb-1"} w-3/4 flex flex-row pl-2 pr-5 space-x-1`}>
                                      <Text className="text-zinc800 text-[11px] text-center">
                                        {"⁃"}
                                      </Text>
                                      <Text className="text-zinc800 text-[11px] text-left pr-2">
                                        {`${current.ingredientName}`}
                                      </Text>
                                    </View>

                                    {/* INGREDIENT AMOUNT */}
                                    <View className={`${(i === 0) && "pt-1"} ${(i === prep[currIndex].currentData.filter(curr => curr !== null).length - 1) && "pb-1"} w-1/4 justify-center items-center bg-zinc350`}>
                                      <Text className="text-theme900 font-medium text-[9px] text-center">
                                        {`${prep[currIndex].currentAmounts[i]} ${extractUnit(current.ingredientData[current.ingredientStore].unit, prep[currIndex].currentAmounts[i])}`}
                                      </Text>
                                    </View>
                                  </View>
                                )
                              )}
                              </>

                              {/* collapse specifics */}
                              <View className="absolute w-1/4 right-0 mr-[20px] z-20 h-full items-start justify-center">
                                <Icon
                                  name="chevron-collapse"
                                  color={colors.zinc900}
                                  size={16}
                                  onPress={() => setShowSpecifics(false)}
                                />
                              </View>
                            </View>
                            }
                                                
                            {/* Details */}
                            {!showSpecifics && (
                              <View className="flex flex-col w-1/4 bg-zinc350 justify-center space-y-0.5 py-1">
                              
                                {/* expand specifics */}
                                <View className="absolute left-[-20px] h-full items-center justify-center">
                                  <Icon
                                    name="resize"
                                    color={colors.zinc900}
                                    size={16}
                                    onPress={() => setShowSpecifics(true)}
                                  />
                                </View>

                                {/* total calories */}
                                <Text className="text-theme900 font-medium text-[11px] text-center">
                                  {prep[currIndex]?.prepCal} {"cal"}
                                </Text>
                                {/* total price */}
                                <Text className="text-theme900 font-medium text-[11px] text-center">
                                  {"$"}{prep[currIndex]?.prepPrice}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                        
                        {/* SIMPLE DETAILS */}
                        {(openSimpleIndex === index) && (
                          <View className={`flex flex-row w-full ${prep[currIndex]?.prepNote !== "" ? "bg-zinc200" : "bg-zinc300"}`}>

                            {/* Notes, if available */}
                            {(prep[currIndex]?.prepNote !== "") && (
                              <View className={`py-1 justify-center items-center bg-zinc200 ${(prep[currIndex]?.prepCal !== "0" || prep[currIndex]?.prepPrice !== "0.00") ? "w-2/3" : "w-full"}`}>
                                <Text className="text-zinc800 font-medium text-[11px] text-center">
                                  {prep[currIndex]?.prepNote}
                                </Text>
                              </View>
                            )}
                            
                            {/* Details, if not empty */}
                            {(prep[currIndex]?.prepCal !== "0" || prep[currIndex]?.prepPrice !== "0.00") && (
                              <View className={`flex flex-row py-1 bg-zinc300 items-center justify-center ${(prep[currIndex]?.prepNote !== "") ? "w-1/3" : "w-full"} ${prep[currIndex]?.prepNote !== "" ? "w-1/3 justify-evenly" : "space-x-5"}`}>
                                {/* total calories */}
                                <Text className="text-theme900 font-medium text-[11px] text-center">
                                  {prep[currIndex]?.prepCal} {"cal"}
                                </Text>
                                {/* total price */}
                                <Text className="text-theme900 font-medium text-[11px] text-center">
                                  {"$"}{prep[currIndex]?.prepPrice}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                  </ScrollView>
                  :
                  <View className="py-1 px-3 bg-zinc500 border-2 border-zinc600">
                    <Text className="italic text-center text-white font-medium">
                      no meal preps match the current filter
                    </Text>
                  </View>
                  }
                </View>
              }
              </>
            }
              
            {/* BOTTOM ROW */}
            <>
              {/* Divider */}
              <View className="h-[1px] bg-zinc400 w-full my-2"/>

              <View className="flex flex-row items-center justify-between w-full">
                
                {/* Warning if no name is given */}
                {isNameValid ? "" : 
                  <Text className="text-mauve600 italic">
                    meal prep name is required
                  </Text>
                }
                    
                {/* Button to stop searching */}
                {showSearchSection && (
                  <Icon
                    name="backspace"
                    size={24}
                    color={colors.zinc700}
                    onPress={() => setShowSearchSection(false)}
                  />
                )}
    
                {/* BUTTONS */}
                <View className="flex flex-row justify-center items-center space-x-[-2px] ml-auto">
    
                  {/* Check */}
                  {(option === "COPY" && copyData?.prepData?.prepName || option === "CREATE") && (
                    <Icon 
                      size={24}
                      color="black"
                      name="checkmark"
                      onPress={() => {
                        option === "CREATE" ? 
                          createComplex 
                          ? submitNewComplex()
                          : submitNewSimple()
                        : // option === "COPY"
                          submitCopy()
                      }}
                    />
                  )}

                  {/* Close */}
                  <Icon
                    size={24}
                    color="black"
                    name="close-outline"
                    onPress={() => setModalVisible(false)} 
                  />
                </View>
              </View>
            </>
          </View>
          }
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default MealDetailsModal;