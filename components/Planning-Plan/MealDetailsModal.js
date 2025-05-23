///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect } from 'react';

// UI components
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, Keyboard, Image } from 'react-native';
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

// initialize firebase app
import { getFirestore, setDoc, updateDoc, getDoc, getDocs, doc, collection } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const MealDetailsModal = ({ 
  date, dispDate, data, id, ogSelected, plansSnapshot,
  modalVisible, setModalVisible, closeModal,
}) => {


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


  ///////////////////////////////// DEEP SEARCH /////////////////////////////////

  // checks if two preps' data are equal
  function deepPrepEqual(a, b) {
    const ignoredKeys = [
      "prepNote", "prepMult", 
      "amountLeft", "amountTotal", "archive", "check", 
      "ingredientData", "ingredientId", "ingredientStore", "ingredientTypes", 
      "id", "containerPrice", "unitPrice"
    ];

    if (a === b) return true;
  
    if (typeof a !== typeof b || a === null || b === null) return false;
  
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, i) => deepPrepEqual(item, b[i]));
    }
  
    if (typeof a === 'object') {
      const aKeys = Object.keys(a).filter(key => !ignoredKeys.includes(key));
      const bKeys = Object.keys(b).filter(key => !ignoredKeys.includes(key));
  
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every(key => deepPrepEqual(a[key], b[key]));
    }
  
    return false;
  }

  // finds a specific prep within a list
  function deepPrepIndexOf(array, target) {
    for (let i = 0; i < array.length; i++) {
      if (deepPrepEqual(array[i], target)) {
        return i;
      }
    }
    return -1;
  }  


  ///////////////////////////////// SETUP /////////////////////////////////

  const [isEditing, setIsEditing] = useState(false);
  const [option, setOption] = useState("CREATE");

  // stores whether a prep is being edited on open
  useEffect(() => {
    if (modalVisible) {
      setIsEditing(data === null);

      // stores data for later editing
      if (data !== null) {
        // simple editing
        setPrepName(data.prepName);
        setPrepPrice(data.prepPrice);
        setPrepCal(data.prepCal);
        
        // complex editing
        setPrepCurrentAmounts(data.currentAmounts);
        setPrepCurrentCals(data.currentCals);
        setPrepCurrentData(data.currentData);
        setNumIngredients(data.currentData.filter(current => current !== null).length);
      }
    }
  }, [modalVisible]);

  // to close the modal
  const exitModal = () => {
    setModalVisible(false);
    setPrepName("");
    setPrepPrice("");
    setPrepCal("");
  };


  ///////////////////////////////// CREATE /////////////////////////////////

  const [createComplex, setCreateComplex] = useState(false);
  const [isNameValid, setIsNameValid] = useState(true);
  const [prepName, setPrepName] = useState("");
  const [prepPrice, setPrepPrice] = useState("");

  // for simple
  const [prepCal, setPrepCal] = useState("");

  // to create a new meal prep without ingredients
  const submitNewSimple = async () => {

    if (prepName === "") { setIsNameValid(false); }

    else {
      setIsNameValid(true);

      // data for the new prep
      const newData = {
        prepName: prepName,
        prepNote: "",
        prepMult: 0,
        prepCal: prepCal === "" ? "0" : ((new Fractional(prepCal).numerator) / (new Fractional(prepCal).denominator)).toFixed(0), 
        prepPrice: prepPrice === "" ? "0.00" : ((new Fractional(prepPrice).numerator) / (new Fractional(prepPrice).denominator)).toFixed(2), 
        currentData: prepCurrentData, 
        currentIds: ["", "", "", "", "", "", "", "", "", "", "", ""], 
        currentAmounts: prepCurrentAmounts, 
        currentCals: prepCurrentCals.map(cal => !isNaN(new Fractional(cal).numerator / new Fractional(cal).denominator) ? new Fractional(cal).numerator / new Fractional(cal).denominator : ""), 
        currentPrices: ["", "", "", "", "", "", "", "", "", "", "", ""],
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
  const [prepCurrentData, setPrepCurrentData] = useState([null, null, null, null, null, null, null, null, null, null, null, null]);
  const [prepCurrentAmounts, setPrepCurrentAmounts] = useState(["", "", "", "", "", "", "", "", "", "", "", ""]);
  const [prepCurrentCals, setPrepCurrentCals] = useState(["", "", "", "", "", "", "", "", "", "", "", ""]);
  const [numIngredients, setNumIngredients] = useState(1);

  // to delete or clear the pressed ingredient
  const deletePrepIngredient = (index) => {

    // if the number of filled in ingredients is 1, simply clear
    if (numIngredients === 1) {

      // the current's data
      setPrepCurrentData((prev) => {
        const updated = [...prev];
        updated[index] = null;
        return updated;
      });
      
      // the current's amounts
      setPrepCurrentAmounts((prev) => {
        const updated = [...prev];
        updated[index] = "";
        return updated;
      });
      
      // the current's calories
      setPrepCurrentCals((prev) => {
        const updated = [...prev];
        updated[index] = "";
        return updated;
      });
    

    // if there is more than one, delete
    } else {

      // the current's data
      setPrepCurrentData((prev) =>
        prev.filter((_, i) => i !== index)
      );
  
      // the current's amounts
      setPrepCurrentAmounts((prev) =>
        prev.filter((_, i) => i !== index)
      );
      
      // the current's calories
      setPrepCurrentCals((prev) =>
        prev.filter((_, i) => i !== index)
      );
  
      // decrements the number of ingredients
      setNumIngredients(numIngredients - 1);
    }
  }

  // recalculates the prep's total calories for complex editing
  useEffect(() => {
    if (createComplex) {

      // sums together all of the current's calories
      setPrepCal(
        (prepCurrentCals.map(cal => new Fractional(cal).numerator / new Fractional(cal).denominator)
                       .filter(cal => !isNaN(cal))
                       .reduce((sum, cal) => sum + cal, 0))
        .toFixed(0)
      );
    }
  }, [prepCurrentCals, createComplex]);

  // to create a new meal prep with ingredients
  const submitNewComplex = async () => {
    
    if (prepName === "") { setIsNameValid(false); }

    else {
      setIsNameValid(true);

      // data for the new prep
      const newData = {
        prepName: prepName,
        prepNote: "",
        prepMult: 0,
        prepCal: prepCal === "" ? "0" : ((new Fractional(prepCal).numerator) / (new Fractional(prepCal).denominator)).toFixed(0), 
        prepPrice: prepPrice === "" ? "0.00" : ((new Fractional(prepPrice).numerator) / (new Fractional(prepPrice).denominator)).toFixed(2), 
        currentData: prepCurrentData, 
        currentIds: ["", "", "", "", "", "", "", "", "", "", "", ""], 
        currentAmounts: prepCurrentAmounts, 
        currentCals: prepCurrentCals.map(cal => !isNaN(new Fractional(cal).numerator / new Fractional(cal).denominator) ? new Fractional(cal).numerator / new Fractional(cal).denominator : ""), 
        currentPrices: ["", "", "", "", "", "", "", "", "", "", "", ""],
      };
      
      // current meal info
      const meal = date.split(" ")[0];
      const [month, day, year] = date.split(" ")[1].split("/");
      const formattedDate = `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

      // prepares the doc data
      const mealData = {
        prepId: doc(collection(db, 'PREPS')).id + "!",          
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
    
    // stores the data according to the selected meal
    if (meal === "LUNCH") { setCopyData(prepDoc.data().meals.lunch); } 
    else if (meal === "DINNER") { setCopyData(prepDoc.data().meals.dinner); }
  }

  // to submit copying data
  const submitCopy = async () => {

    // reformatting date
    const [year1, month1, day1] = copyDate.split("-").map(Number);
    const longDate = copyMeal + " " + new Date(year1, month1- 1, day1);
    
    // determines whether the radio will be checked
    const isCustom = copyData.prepId.includes("LUNCH") || copyData.prepId.includes("DINNER") || ogSelected.filter(item => item.meal === longDate).length === 0;

    // current meal info
    const meal = date.split(" ")[0];
    const [month2, day2, year2] = date.split(" ")[1].split("/");
    const formattedDate = `20${year2}-${month2.padStart(2, "0")}-${day2.padStart(2, "0")}`;

    // retrieves the current doc data
    const currData = await getDoc(doc(db, 'PLANS', formattedDate));

    // if it exists, just set the new meal
    if (currData.exists()) {
      if (meal === "LUNCH") { updateDoc(doc(db, 'PLANS', formattedDate), { "meals.lunch": copyData }); } 
      else if (meal === "DINNER") { updateDoc(doc(db, 'PLANS', formattedDate), { "meals.dinner": copyData }); }

    // otherwise, create a null doc first
    } else {
      const docData = { 
        date: formattedDate,
        meals: {
          lunch: {
            prepId: meal === "LUNCH" ? copyData.prepId : null,          
            prepData: meal === "LUNCH" ? copyData.prepData : null,
          },
          dinner: {
            prepId: meal === "DINNER" ? copyData.prepId : null,         
            prepData: meal === "DINNER" ? copyData.prepData : null,
          },
        },
      };
      setDoc(doc(db, 'PLANS', formattedDate), docData);
    }
    
    // closes the modal, and indicates whether a custom prep was submitted
    closeModal(isCustom);
    exitModal();
  }


  ///////////////////////////////// SEARCH SECTION /////////////////////////////////

  const [currIndex, setCurrIndex] = useState(0);
  const [showSearchSection, setShowSearchSection] = useState(false);

  const [prepKeywordQuery, setPrepKeywordQuery] = useState("");
  const [prepTypeFilter, setPrepTypeFilter] = useState("");

  const [openPrepIndex, setOpenPrepIndex] = useState(-1);
  const [openSimpleIndex, setOpenSimpleIndex] = useState(-1);
  const [openComplexIndex, setOpenComplexIndex] = useState(-1);
  
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
  const filterPreps = (searchQuery, typeFilter) => {
    
    setPrepKeywordQuery(searchQuery);
    setPrepTypeFilter(typeFilter);
    setOpenPrepIndex(-1);
    setOpenSimpleIndex(-1);
    setOpenComplexIndex(-1);
    setCurrIndex(0);

    // to get the unique list of preps
    let prepNames = [];
    let prepIds = [];
    let prepData = [];
    let prepDates = [];
    let prepMeals = [];

    // adds the data to the prep lists that matches the filtering
    uniquePrepNames.map((name, index) => {
      if (searchQuery.split(' ').every(keyword => name.toLowerCase().includes(keyword.toLowerCase()))
        && (typeFilter === "" 
          || (typeFilter === "prep" && !(uniquePrepIds[index][0].includes("LUNCH") || uniquePrepIds[index][0].includes("DINNER") || uniquePrepIds[index][0].includes("!")))
          || (typeFilter === "complex" && uniquePrepIds[index][0].includes("!"))
          || (typeFilter === "simple" && (uniquePrepIds[index][0].includes("LUNCH") || uniquePrepIds[index][0].includes("DINNER"))))
      ) {
        prepNames.push(name);
        prepIds.push(uniquePrepIds[index]);
        prepData.push(uniquePrepData[index]);
        prepDates.push(uniquePrepDates[index]);
        prepMeals.push(uniquePrepMeals[index]);
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
    setCopyData(newData);
    
    // goes back to calendar section
    setOpenPrepIndex(-1);
    setOpenSimpleIndex(-1);
    setOpenComplexIndex(-1);
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
            unit: value,
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
            {data !== null &&
              <Icon 
                size={24}
                color={colors.zinc800}
                name={isEditing ? "backspace" : "create"}
                onPress={() => {
                  setIsEditing(!isEditing)
                  setCreateComplex(!(id.includes("LUNCH") || id.includes("DINNER")))
                }}
              />
            }
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
              <View className="flex flex-col z-10 border-[1px] border-zinc700">
                  
                {/* Frozen Columns */}
                {Array.from({ length: 12 }, (_, index) => (
                  <View key={`frozen-${index}`} className="flex flex-row h-[30px] bg-white">
                    <View className="bg-black w-full flex-row">

                      {/* ingredient names */}
                      <View className="flex items-center justify-center w-7/12 bg-theme600 border-b-0.5 border-r-0.5 border-zinc700 z-10">
                        <View className="flex flex-wrap flex-row">
                          <Text className="text-white font-semibold text-[10px] text-center px-2">
                            {data?.currentData[index]?.ingredientName || ""}
                          </Text>
                        </View>
                      </View>
                      
                      {/* amount */}
                      <View className="flex flex-row px-1 items-center justify-center bg-zinc100 w-1/4 border-b-0.5 border-b-zinc400 border-r-0.5 border-r-zinc300">
                        {data?.currentData[index]?.ingredientData[data.currentData[index].ingredientStore].unit &&
                          <Text className="text-[10px] text-center">
                            {data?.currentAmounts[index] || "?"}{` ${extractUnit(data?.currentData[index]?.ingredientData[data.currentData[index].ingredientStore].unit, data?.currentAmounts[index]) || ""}`}
                          </Text>
                        }
                      </View>

                      {/* details */}
                      <View className="flex flex-col items-center justify-evenly bg-white w-1/6 border-b-0.5 border-b-zinc400">
                        
                        {/* calories */}
                        {data?.currentCals[index] ? 
                          <Text className="text-[10px] text-center">
                            {data.currentCals[index].toFixed(0)} {"cal"}
                          </Text>
                        : null}

                        {/* price */}
                        {data?.currentPrices[index] ? 
                          <Text className="text-[10px] text-center">
                            {"$"}{data.currentPrices[index].toFixed(2)}
                          </Text>
                        : null}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </>

            : // if not filled in
            <View className="flex flex-col items-center justify-center mb-1 space-y-2">
              
              {/* Meal Name */}
              <View className="flex justify-center items-center w-full h-[30px] border-0.5 bg-theme600">
                <Text className="text-[13px] font-semibold text-white text-center">
                    {data?.prepName || ""}
                </Text>
              </View>

              {/* Meal Details */}
              <View className="flex justify-center items-center w-full h-[20px] bg-zinc500">
                <Text className="text-[11px] text-white italic">
                    {data?.prepCal || "0"}{" cal, $"}{data?.prepPrice || "0.00"}
                </Text>
              </View>
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
                {option === "CREATE" && data?.id === undefined &&
                <View className="absolute flex h-full justify-center items-center right-1">
                  <Icon
                    name={createComplex ? "information-circle" : "information-circle-outline"}
                    color={"black"}
                    size={20}
                    onPress={() => setCreateComplex(!createComplex)}
                  />
                </View>
                }
              </View> 
            </View>

            {/* Divider */}
            <View className="h-[0.5px] bg-zinc400 w-11/12 m-4"/>

            {option === "CREATE" && !createComplex
            ?
              <>
                {/* simple create without ingredients */}
                <View className="flex flex-col justify-center items-center">
                  <View className="flex flex-row justify-evenly content-center mb-4 w-full h-[65px] px-5">
                    
                    {/* Prep Name Input */}
                    <View className="flex justify-center items-center h-full w-1/2 bg-white rounded-md py-1 px-2 border-0.5 border-zinc500">
                      <TextInput
                        className="text-center mb-1 text-[14px] leading-[17px]"
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
                      <View className="flex flex-row h-[25px] w-full space-x-1 justify-center items-center border-[1px] border-zinc450 bg-zinc400">
                        {/* amount input */}
                        <TextInput
                          className="bg-transparent text-center italic text-[12px] leading-[15px]"
                          placeholder={prepCal === "" ? "0" : prepCal}
                          placeholderTextColor='black'
                          value={prepCal}
                          onChangeText={(text) => {
                            if (/^\d*$/.test(text)) { // only allows digits
                              setPrepCal(text);
                            }
                          }}
                        />
                        {/* label */}
                        <Text className="flex justify-center items-center text-center italic text-[12px]">
                          calories
                        </Text>
                      </View>
          
                      {/* Price */}
                      <View className="flex flex-row h-[25px] w-full justify-center items-center border-[1px] border-zinc450 bg-zinc400">
                        {/* label */}
                        <Text className="flex justify-center items-center text-center italic text-[12px]">
                          $
                        </Text>
                        {/* price input */}
                        <TextInput
                          className="bg-transparent text-center italic text-[12px] leading-[15px]"
                          placeholder={prepPrice === "" ? "0.00" : prepPrice}
                          placeholderTextColor='black'
                          value={prepPrice}
                          onChangeText={(text) => {
                            if (/^\d*\.?\d*$/.test(text)) { // only allows digits and "."
                              setPrepPrice(text);
                            }
                          }}
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

                  {/* WARNING FOR PREP */}
                  {!(id === null || id?.includes("LUNCH") || id?.includes("DINNER") || id?.includes("!")) &&
                  <View className="w-full px-2 mb-2">
                    {/* divider */}
                    <View className="h-[1px] bg-zinc350 mb-4"/>
                    {/* text */}
                    <Text className="text-mauve600 italic text-center text-[12px]">
                      {'modifying this meal prep is not recommended\nand may lead to inaccurate calculations'}
                    </Text>
                  </View>
                  }
                </View>
              </>
            : option === "CREATE" && createComplex
            ? !showIngredientSearch
            ?
              <>
                {/* create with ingredients */}
                <View className="flex flex-col justify-center items-center w-full ml-[-20px] mb-2">

                  {/* TOP ROW */}
                  <View className="flex flex-row items-center justify-center border-0.5 ml-[20px] mb-1 bg-zinc600">
                    
                    {/* Meal Name Input */}
                    <View className="flex justify-center items-center px-1.5 w-7/12 border-r-0.5 bg-zinc700">
                      <TextInput
                        className="text-[13px] font-semibold text-white text-center py-2 leading-[16px]"
                        placeholder={prepName === "" ? "meal prep name" : prepName}
                        placeholderTextColor={colors.zinc400}
                        multiline={true}
                        blurOnSubmit={true}
                        value={prepName}
                        onChangeText={setPrepName}
                      />
                    </View>
    
                    {/* Meal Details */}
                    <View className="flex flex-row space-x-2 justify-center items-center w-5/12">

                      {/* calories */}
                      <Text className="text-[11px] text-white">
                          {prepCal === "" ? "0" : prepCal || "0"}{" cal"}
                      </Text>

                      {/* price */}
                      <View className="flex flex-row justify-center items-center">
                        <Text className={`text-[11px] ${prepPrice === "" ? "text-zinc400" : "text-white"}`}>
                          $
                        </Text>
                        <TextInput
                          className="text-[11px] text-white leading-[13px]"
                          placeholder={prepPrice === "" ? "0.00" : prepPrice}
                          placeholderTextColor={colors.zinc400}
                          value={prepPrice}
                          onChangeText={(text) => {
                            if (/^\d*\.?\d*$/.test(text)) { // only allows digits and "."
                              setPrepPrice(text);
                            }
                          }}
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
    
                  {/* GRID */}
                  {numIngredients !== 0 &&
                  <ScrollView 
                    className={`flex flex-col w-full mr-[-40px] z-10 ${(keyboardType === "grid" && isKeyboardOpen) && "max-h-[100px]"}`}
                    scrollEnabled={keyboardType === "grid" && isKeyboardOpen}
                  >
                    
                    {/* Frozen Columns */}
                    {[0,1,2,3,4,5,6,7,8,9,10,11].map((index) => index < numIngredients && 
                      <View key={`frozen-${index}`} className="flex flex-row min-h-[30px]">

                        {/* current */}
                        <View className={`flex-1 flex-row bg-zinc500 border-x-[1px] ${index === 0 && "border-t-[1px]"} ${index === numIngredients - 1 && "border-b-[1px]"} border-zinc700`}>
    
                          {/* ingredient names */}
                          <View className="flex items-center justify-center w-7/12 bg-theme600 border-b-0.5 border-r-0.5 border-zinc700 z-10">
                            <View className="flex flex-wrap flex-row">
                              {/* Input */}
                              <TextInput
                                className="text-white font-semibold text-[10px] text-center px-2 py-2"
                                placeholder="ingredient name"
                                placeholderTextColor={colors.zinc350}
                                value={prepCurrentData[index]?.ingredientName || ""}
                                onChangeText={(value) => changeName(index, value)}
                                multiline={true}
                                blurOnSubmit={true}
                                onFocus={() => setKeyboardType("grid")}
                                onBlur={() => setKeyboardType("")}
                              />
                            </View>
                          </View>
                          
                          {/* amount */}
                          <View className="flex flex-row px-2 space-x-0.5 items-center justify-center bg-zinc100 w-1/4 border-b-0.5 border-b-zinc400 border-r-0.5 border-r-zinc400">
                            {/* Amount Input */}
                            <TextInput
                              className="text-[9px] text-center"
                              placeholder="_"
                              placeholderTextColor={colors.zinc450}
                              value={prepCurrentAmounts[index]}
                              onChangeText={(value) => {
                                setPrepCurrentAmounts((prev) => {
                                  const updated = [...prev];
                                  updated[index] = value;
                                  return updated;
                                });
                              }}
                              onFocus={() => setKeyboardType("grid")}
                              onBlur={() => setKeyboardType("")}
                            />
                            
                            {/* Unit Input */}
                            <TextInput
                              className="text-[9px] text-center"
                              placeholder="unit(s)"
                              placeholderTextColor={colors.zinc450}
                              value={prepCurrentData[index]?.ingredientData[prepCurrentData[index]?.ingredientStore]?.unit || ""}
                              onChangeText={(value) => changeUnit(index, value)}
                              onFocus={() => setKeyboardType("grid")}
                              onBlur={() => setKeyboardType("")}
                            />
                          </View>
    
                          {/* calories */}
                          <View className="flex flex-row px-3 space-x-0.5 items-center justify-center bg-white w-1/6 border-b-0.5 border-b-zinc400">
                            
                            {/* Amount Input */}
                            <TextInput
                              className="text-[9px] text-center"
                              placeholder="_"
                              placeholderTextColor={colors.zinc400}
                              value={prepCurrentCals[index].toString()}
                              onChangeText={(value) => {
                                setPrepCurrentCals((prev) => {
                                  const updated = [...prev];
                                  updated[index] = value;
                                  return updated;
                                });
                              }}
                              onFocus={() => setKeyboardType("grid")}
                              onBlur={() => setKeyboardType("")}
                            />

                            {/* Label */}
                            <Text className="text-[9px] text-center">
                              {"cal"}
                            </Text>
                          </View>
                        </View>

                        {/* Delete Button */}
                        <View className="flex w-[20px] z-50 justify-center items-center">
                          <Icon
                            name="close"
                            size={15}
                            color={colors.zinc600}
                            onPress={() => deletePrepIngredient(index)}
                          />
                        </View>
                      </View>
                    )}
                  </ScrollView>
                  }

                  {/* Add Another Ingredient Row */}
                  {numIngredients < 12 && 
                  <View className="flex flex-row items-center justify-center ml-[20px]">
                    <TouchableOpacity 
                      className="flex justify-center items-center bg-zinc350 w-full py-0.5 border-b-[1px] border-x-[1px] border-zinc400"
                      onPress={() => setNumIngredients(numIngredients + 1)}
                    >
                      <Icon
                        name="add"
                        size={14}
                        color={colors.zinc900}
                      />
                    </TouchableOpacity>
                  </View>
                  }

                  {/* SEARCH TOGGLE */}
                  <TouchableOpacity 
                    className={`flex flex-row justify-center items-center px-3 py-1 mt-4 ml-[20px] ${keyboardType === "grid" && isKeyboardOpen && "mb-6"} rounded-full space-x-1 bg-theme200 border-[1px] border-zinc350`}
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
                  {!(id === null || id?.includes("LUNCH") || id?.includes("DINNER") || id?.includes("!")) &&
                  <View className="w-full mt-2 ml-[20px] px-2">
                    {/* divider */}
                    <View className="h-[1px] bg-zinc350 m-4"/>
                    {/* text */}
                    <Text className="text-mauve600 italic text-center text-[12px]">
                      {'modifying this meal prep is not recommended\nand may lead to inaccurate calculations'}
                    </Text>
                  </View>
                  }
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
                    className="mb-1 text-left text-[14px] leading-[17px]"
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
                <ScrollView
                  vertical
                  scrollEventThrottle={16}
                  contentContainerStyle={{ flexDirection: 'column' }}
                  className="flex w-full h-[300px] border-4 border-zinc300 bg-zinc300"
                >
                  {filteredIngredients.map((ingredient, index) => (
                    <View key={index} className={`flex flex-row w-full justify-between mb-1 ${index % 2 === 0 ? "bg-theme300 border-b-zinc600" : "bg-theme400 border-b-zinc700"}
                    `}>

                      {/* ingredient name */}
                      <View className="flex flex-wrap justify-center items-center py-1 px-2">
                        <Text className="text-[12px] text-black font-medium">
                          {ingredient.ingredientName}
                        </Text>
                      </View>
                      
                      {/* servings */}
                      <View className={`justify-center items-end flex py-1 px-2 ${index % 2 === 0 ? "bg-zinc350 border-b-zinc600" : "bg-zinc400 border-b-zinc700"}`}>
                        <Text className="text-[10px] text-right text-black font-medium">
                          {`${ingredient.ingredientData[selectedStore].servingSize} ${ingredient.ingredientData[selectedStore].unit}`}
                        </Text>
                        <Text className="text-[10px] text-right text-black font-medium">
                          {ingredient.ingredientData[selectedStore].calServing !== "" && `${ingredient.ingredientData[selectedStore].calServing} cal`}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>

            : // option === "COPY"
              <>
              {!showSearchSection
              ?
                <View className="flex flex-col">
    
                  {/* row above calendar */}
                  <View className="flex flex-row">
    
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
    
                  {/* Divider */}
                  <View className="h-[1px] bg-zinc400 w-full my-2"/>
    
                  {/* Meal Display */}
                  {copyData?.prepData?.prepName 
                  ?
                    <View className="flex flex-col space-y-1 -mx-5 mb-2 justify-center items-center bg-theme100 py-1 border-2 border-zinc350">
                      <Text className="font-bold text-theme900">
                        SELECTED MEAL PREP:
                      </Text>
                      <Text className="italic">
                        {copyData.prepData.prepName}
                      </Text>
                    </View>
                  
                  : // invalid data
                    <View className="flex flex-col space-y-1 -mx-5 mb-2 justify-center items-center bg-theme100 py-1 border-2 border-zinc350">
                      <Text className="font-bold text-theme800 italic">
                        no meal prep matches this selection
                      </Text>
                    </View>
                  }
                </View>
              :
                <View className="flex flex-col">
                  
                  {/* RECIPE FILTERING SECTION */}
                  <View className="flex flex-row w-full px-5 justify-center items-center mb-[20px] space-x-2">

                    {/* Button to stop searching */}
                    <View className="flex w-1/12">
                      <Icon
                        name="backspace"
                        size={24}
                        color={colors.zinc700}
                        onPress={() => setShowSearchSection(false)}
                      />
                    </View>

                    {/* text input */}
                    <TextInput
                      value={prepKeywordQuery}
                      onChangeText={(value) => filterPreps(value, prepTypeFilter)}
                      placeholder="recipe keyword(s)"
                      placeholderTextColor={colors.zinc400}
                      className="flex-1 w-5/6 bg-white radius-[5px] border-[1px] border-zinc300 pl-2.5 pr-10 py-1.5 rounded-md text-[14px] leading-[17px]"
                    />
        
                    {/* BUTTONS */}
                    <View className="flex flex-row absolute right-6 h-[30px] items-center justify-center">

                      {/* type filtering */}
                      <Icon
                        name={prepTypeFilter === "prep" ? "information-circle" : prepTypeFilter === "complex" ? "stop-circle" : prepTypeFilter === "simple" ? "ellipse" : "ellipse-outline"}
                        color={colors.zinc700}
                        size={18}
                        onPress={() => filterPreps(prepKeywordQuery, prepTypeFilter === "prep" ? "complex" : prepTypeFilter === "complex" ? "simple" : prepTypeFilter === "simple" ? "" : "prep")}
                      />

                      {/* clear */}
                      <Icon
                        name="close-outline"
                        size={20}
                        color="black"
                        onPress={() => {
                          setPrepKeywordQuery("");
                          filterPreps("", prepTypeFilter);
                        }}
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
                              onPress={(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? () => setCurrIndex((currIndex + 1) % prep.length) : undefined}
                              activeOpacity={!(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) && 1}
                            >
                              <Text className="text-[12px] font-semibold text-theme900">
                                {
                                (openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index)
                                ? `${currIndex + 1}/${prep.length}`
                                : `(${prep.length})`
                                }
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
                              }}
                            />
                          </View>
                          : (filteredPrepIds[index]?.[(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0]?.includes("!"))
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
                              }}
                            />
                          </View>
                          }
                        </View>
                        
                        {/* COMPLEX DETAILS */}
                        {(openPrepIndex === index || openComplexIndex === index) && (
                          <View className="flex flex-row w-full">
                            {/* Ingredient List */}
                            <View className="flex flex-col w-3/4 bg-zinc300 py-1 items-start justify-center">
                              {prep[currIndex]?.currentData.slice().map((current, i) => 
                                current !== null && (
                                  <View key={i} className="flex flex-row w-full pl-2 pr-5 space-x-1">
                                    {/* current ingredient name */}
                                    <Text className="text-zinc800 text-[11px] text-center">
                                      {"⁃"}
                                    </Text>
                                    <Text className="text-zinc800 text-[11px] text-left">
                                      {current.ingredientName}
                                    </Text>
                                  </View>
                                )
                              )}
                            </View>
                                                
                            {/* Details */}
                            <View className="flex flex-col w-1/4 bg-zinc350 justify-center space-y-0.5 py-1">
                              {/* total calories */}
                              <Text className="text-theme900 font-medium text-[11px] text-center">
                                {prep[currIndex]?.prepCal} {"cal"}
                              </Text>
                              {/* total price */}
                              <Text className="text-theme900 font-medium text-[11px] text-center">
                                {"$"}{prep[currIndex]?.prepPrice}
                              </Text>
                            </View>
                          </View>
                        )}
                        
                        {/* SIMPLE DETAILS */}
                        {openSimpleIndex === index && (
                          <View className="flex flex-row w-full bg-zinc300 justify-center items-center space-x-5 py-1">
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
    
                {/* BUTTONS */}
                <View className="flex flex-row justify-center items-center space-x-[-2px] ml-auto">
    
                  {/* Check */}
                  {(option === "COPY" && copyData?.prepData?.prepName || option === "CREATE") &&
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
                  }

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