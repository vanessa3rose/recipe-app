///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';

import colors from '../../assets/colors';
import Icon from 'react-native-vector-icons/Ionicons';

// Fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';
import validateFractionInput from '../../components/Validation/validateFractionInput';
import validateWholeNumberInput from '../Validation/validateWholeNumberInput';

import extractUnit from '../Validation/extractUnit';

// Initialize Firebase App
import { getFirestore, updateDoc, doc, collection } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const MealDetailsModal = ({ 
  date, dispDate, data, snapshot, 
  modalVisible, setModalVisible, closeModal,
}) => {


  ///////////////////////////////// DEEP SEARCH /////////////////////////////////

  // recursively sorts the array by keys alphabetically
  const sortObjectKeys = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
    } else if (obj !== null && typeof obj === "object") {
        const sortedObj = {};
        Object.keys(obj).sort().forEach((key) => {
            sortedObj[key] = sortObjectKeys(obj[key]);
        });
        return sortedObj;
    }
    return obj;
  };

  // to get the index of the object from the array of arrays
  function deepIndexOf(arr, obj) {

    // loops over all objects in the array of arrays
    for (let i = 0; i < arr.length; i++) {
      if (JSON.stringify(sortObjectKeys(arr[i])) === JSON.stringify(sortObjectKeys(obj))) {
        return i;
      }
    }

    // returns -1 if the value isn't found
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
        prepCal: prepCal === "" ? "0" : prepCal, 
        prepPrice: prepPrice === "" ? "0.00" : prepPrice, 
        currentData: [null, null, null, null, null, null, null, null, null, null, null, null], 
        currentIds: ["", "", "", "", "", "", "", "", "", "", "", ""], 
        currentAmounts: ["", "", "", "", "", "", "", "", "", "", "", ""], 
        currentCals: ["", "", "", "", "", "", "", "", "", "", "", ""], 
        currentPrices: ["", "", "", "", "", "", "", "", "", "", "", ""],
      };

      // current meal info
      const meal = date.split(" ")[0];
      const [month, day, year] = date.split(" ")[1].split("/");
      const formattedDate = `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

      // prepares the doc data
      const docData = {
        prepId: date,          
        prepData: newData,
      };

      if (meal === "LUNCH") { updateDoc(doc(db, 'plans', formattedDate), { "meals.lunch": docData }); } 
      else if (meal === "DINNER") { updateDoc(doc(db, 'plans', formattedDate), { "meals.dinner": docData }); }
      
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
        prepCal: prepCal === "" ? "0" : prepCal, 
        prepPrice: prepPrice === "" ? "0.00" : prepPrice, 
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
      const docData = {
        prepId: doc(collection(db, 'prep')).id,          
        prepData: newData,
      };

      if (meal === "LUNCH") { updateDoc(doc(db, 'plans', formattedDate), { "meals.lunch": docData }); } 
      else if (meal === "DINNER") { updateDoc(doc(db, 'plans', formattedDate), { "meals.dinner": docData }); }
      
      // closes the modal, indicating that a custom prep was made
      closeModal(true);
      exitModal();
    }
  }

  ///////////////////////////////// GETTING DB DATA /////////////////////////////////

  const [uniquePrepIds, setUniquePrepIds] = useState(null);
  const [uniquePrepData, setUniquePrepData] = useState(null);
  const [recentPrepDates, setRecentPrepDates] = useState(null);
  const [recentPrepMeals, setRecentPrepMeals] = useState(null);

  // gets the collection of meal preps
  const loadPreps = async () => {

    // current meal info
    const meal = date.split(" ")[0];
    const [month, day, year] = date.split(" ")[1].split("/");
    const formattedDate = `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    // the selected date's data
    const prepDoc = snapshot.docs.find((doc) => doc.id === formattedDate);
    
    // stores values in state
    setCopyMeal(meal);
    setCopyDate(formattedDate);
    setCopyData(meal === "LUNCH" ? prepDoc?.data()?.meals?.lunch : prepDoc?.data()?.meals?.dinner);

    // to get the unique list of preps
    let prepIds = [];
    let prepData = [];
    let prepDates = [];
    let prepMeals = [];
    
    // loops through all the plans
    snapshot.docs.map((plan, index) => {

      // LUNCH PREPS
      const lunchIndex = deepIndexOf(prepData, plan.data().meals?.lunch?.prepData);
      if (plan.data().meals.lunch.prepData !== null) {
        
        // new
        if ((!plan.data().meals.lunch.prepId.includes("LUNCH") && !prepIds.includes(plan.data().meals.lunch.prepId))
          || (plan.data().meals.lunch.prepId.includes("LUNCH") && lunchIndex === -1)
          || (!plan.data().meals.lunch.prepId.includes("LUNCH") && plan.data().meals.lunch.prepData.prepName !== prepData[prepIds.indexOf(plan.data().meals.lunch.prepId)].prepName)
        ) {
          prepIds.push(plan.data().meals.lunch.prepId); 
          prepData.push(plan.data().meals.lunch.prepData); 
          prepDates.push(plan.id);
          prepMeals.push("LUNCH");
        
        // existing meal prep
        } else if (!plan.data().meals.lunch.prepId.includes("LUNCH") && prepIds.includes(plan.data().meals.lunch.prepId)) {
          const index = prepIds.indexOf(plan.data().meals.lunch.prepId);
          prepDates[index] = plan.id;
          prepMeals[index] = "LUNCH";
        
        // existing custom prep
        } else if (plan.data().meals.lunch.prepId.includes("LUNCH") && lunchIndex !== -1) {
          prepDates[lunchIndex] = plan.id;
          prepMeals[lunchIndex] = "LUNCH";
        }
      }


      // DINNER PREPS
      const dinnerIndex = deepIndexOf(prepData, plan.data().meals.dinner.prepData);
      if (plan.data().meals.dinner.prepData !== null) {
        
        // new
        if ((!plan.data().meals.dinner.prepId.includes("DINNER") && !prepIds.includes(plan.data().meals.dinner.prepId))
          || (plan.data().meals.dinner.prepId.includes("DINNER") && dinnerIndex === -1)
          || (!plan.data().meals.dinner.prepId.includes("DINNER") && plan.data().meals.dinner.prepData.prepName !== prepData[prepIds.indexOf(plan.data().meals.dinner.prepId)].prepName)
        ) {
          prepIds.push(plan.data().meals.dinner.prepId); 
          prepData.push(plan.data().meals.dinner.prepData); 
          prepDates.push(plan.id);
          prepMeals.push("DINNER");
        
        // existing meal prep
        } else if (!plan.data().meals.dinner.prepId.includes("DINNER") && prepIds.includes(plan.data().meals.dinner.prepId)) {
          const index = prepIds.indexOf(plan.data().meals.dinner.prepId);
          prepDates[index] = plan.id;
          prepMeals[index] = "DINNER";
          
        // existing custom prep
        } else if (plan.data().meals.dinner.prepId.includes("DINNER") && dinnerIndex !== -1) {
          prepDates[dinnerIndex] = plan.id;
          prepMeals[dinnerIndex] = "DINNER";
        }
      }
    })
    
    // combined data to sort
    let combined = prepIds.map((id, index) => ({
      prepId: id,
      prepData: prepData[index],
      prepDate: prepDates[index],
      prepMeal: prepMeals[index]
    }));
    
    // sorts based on prepData.prepName
    combined.sort((a, b) => a.prepData.prepName.localeCompare(b.prepData.prepName));
    
    // stores extracted, sorted values
    setUniquePrepIds(combined.map(item => item.prepId));
    setUniquePrepData(combined.map(item => item.prepData));
    setRecentPrepDates(combined.map(item => item.prepDate));
    setRecentPrepMeals(combined.map(item => item.prepMeal));

    setFilteredPrepData(combined.map(item => item.prepData));
    setFilteredPrepIds(combined.map(item => item.prepId));
    setFilteredPrepDates(combined.map(item => item.prepDate));
    setFilteredPrepMeals(combined.map(item => item.prepMeal));
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

  const [copyDate, setCopyDate] = useState("");
  const [copyMeal, setCopyMeal] = useState("");
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
    const prepDoc = snapshot.docs.find((doc) => doc.id === date);
    
    // stores the data according to the selected meal
    if (meal === "LUNCH") { setCopyData(prepDoc.data().meals.lunch); } 
    else if (meal === "DINNER") { setCopyData(prepDoc.data().meals.dinner); }
  }

  // to submit copying data
  const submitCopy = () => {

    // current meal info
    const meal = date.split(" ")[0];
    const [month, day, year] = date.split(" ")[1].split("/");
    const formattedDate = `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    
    if (meal === "LUNCH") { updateDoc(doc(db, 'plans', formattedDate), { "meals.lunch": copyData }); }
    else if (meal === "DINNER") { updateDoc(doc(db, 'plans', formattedDate), { "meals.dinner": copyData }); }
    
    // closes the modal, and indicates whether a custom prep was submitted
    closeModal(copyData.prepId.includes("LUNCH") || copyData.prepId.includes("DINNER"));
    exitModal();
  }


  ///////////////////////////////// SEARCH SECTION /////////////////////////////////

  const [showSearchSection, setShowSearchSection] = useState(false);
  const [prepKeywordQuery, setPrepKeywordQuery] = useState("");
  const [prepTypeFilter, setPrepTypeFilter] = useState("");

  const [openPrepIndex, setOpenPrepIndex] = useState(-1);
  const [openCustomIndex, setOpenCustomIndex] = useState(-1);

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
    setOpenCustomIndex(-1);

    // to get the unique list of preps
    let prepIds = [];
    let prepData = [];
    let prepDates = [];
    let prepMeals = [];

    // adds the data to the prep lists that matches the filtering
    uniquePrepData.map((prep, index) => {
      if (searchQuery.split(' ').every(keyword => prep.prepName.toLowerCase().includes(keyword.toLowerCase()))
        && (typeFilter === "" 
           || (typeFilter === "prep" && !(uniquePrepIds[index].includes("LUNCH") || uniquePrepIds[index].includes("DINNER")))
           || (typeFilter === "custom" && (uniquePrepIds[index].includes("LUNCH") || uniquePrepIds[index].includes("DINNER"))))
      ) {
        prepIds.push(uniquePrepIds[index]);
        prepData.push(prep);
        prepDates.push(recentPrepDates[index]);
        prepMeals.push(recentPrepMeals[index]);
      }
    })

    // stores the data
    setFilteredPrepIds(prepIds);
    setFilteredPrepData(prepData);
    setFilteredPrepDates(prepDates);
    setFilteredPrepMeals(prepMeals);
  }

  // when a prep from the filter search list is selected
  const storePrepCopy = (index) => {

    // retrieves the data map
    const newData = {
      prepData: filteredPrepData[index],
      prepId: filteredPrepIds[index],
    }
    
    // stores values in state
    setCopyMeal(filteredPrepMeals[index]);
    setCopyDate(filteredPrepDates[index]);
    setCopyData(newData);

    // goes back to calendar section
    setOpenPrepIndex(-1);
    setOpenCustomIndex(-1);
    setShowSearchSection(false);
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
        <TouchableOpacity onPress={() => setModalVisible(false)} className="absolute bg-black opacity-50 w-full h-full"/>
        
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
                onPress={() => setIsEditing(!isEditing)}
              />
            }
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>


          {/* WHEN VIEWING */}
          {!isEditing ?
          <>
            {/* OVERALL DETAILS */}
            {!(Array.isArray(data?.currentData) && data?.currentData.every(item => item === null))
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
                            {data?.currentData[index]?.ingredientData?.ingredientName || ""}
                          </Text>
                        </View>
                      </View>
                      
                      {/* amount */}
                      <View className="flex flex-row px-1 items-center justify-center bg-zinc100 w-1/4 border-b-0.5 border-b-zinc400 border-r-0.5 border-r-zinc300">
                        {data?.currentData[index]?.ingredientData[`${data.currentData[index].ingredientStore}Unit`] &&
                          <Text className="text-[10px] text-center">
                            {data?.currentAmounts[index] || "?"}{` ${extractUnit(data?.currentData[index]?.ingredientData[`${data.currentData[index].ingredientStore}Unit`], data?.currentAmounts[index]) || ""}`}
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
                <View className="flex flex-row justify-evenly content-center mb-4 w-full h-[65px] px-5">
                  {/* Prep Name Input */}
                  <View className="flex justify-center items-center h-full w-1/2 bg-white rounded-md py-1 px-2 border-0.5 border-zinc500">
                    <TextInput
                      className="text-center mb-1 text-[14px] leading-[16px]"
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
              </>
            : option === "CREATE" && createComplex
            ?
              <>
                {/* create with ingredients */}
                <View className="flex flex-col justify-center items-center px-4 w-full mb-2">

                  {/* TOP ROW */}
                  <View className="flex flex-row items-center justify-center border-0.5 mb-1 bg-zinc600">
                    
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
                  <View className="flex flex-col z-10 border-[1px] border-zinc700">
                      
                    {/* Frozen Columns */}
                    {[0,1,2,3,4,5,6,7,8,9,10,11].map((index) => index < numIngredients && 
                      <View key={`frozen-${index}`} className="flex flex-row h-[30px] bg-white">

                        {/* current */}
                        <View className="bg-black w-full flex-row">
    
                          {/* ingredient names */}
                          <View className="flex items-center justify-center w-7/12 bg-theme600 border-b-0.5 border-r-0.5 border-zinc700 z-10">
                            <View className="flex flex-wrap flex-row">
                              {/* Input */}
                              <TextInput
                                className="text-white font-semibold text-[10px] text-center px-2"
                                placeholder="ingredient name"
                                placeholderTextColor={colors.zinc350}
                                value={prepCurrentData[index]?.ingredientData?.ingredientName || ""}
                                onChangeText={(value) => {
                                  setPrepCurrentData((prev) => {
                                    const updated = [...prev];
                                    // if null or undefined, initialize it
                                    if (!updated[index]) {
                                      updated[index] = {
                                        amountLeft: "?",
                                        amountTotal: "",
                                        archive: false,
                                        check: false,
                                        containerPrice: "",
                                        ingredientData: {
                                          CalServing: "",
                                          ServingSize: "",
                                          Unit: "",
                                          ingredientName: value,
                                        },
                                        ingredientId: "",
                                        ingredientStore: "",
                                        unitPrice: ""
                                      };
                                    // if already initialized, update ingredientName only
                                    } else {
                                      updated[index] = {
                                        ...updated[index],
                                        ingredientData: {
                                          ...updated[index].ingredientData,
                                          ingredientName: value,
                                        },
                                      };
                                    }
                                    return updated;
                                  });
                                }}
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
                            />
                            {/* Unit Input */}
                            <TextInput
                              className="text-[9px] text-center"
                              placeholder="unit(s)"
                              placeholderTextColor={colors.zinc450}
                              value={prepCurrentData[index]?.ingredientData?.Unit || ""}
                              onChangeText={(value) => {
                                setPrepCurrentData((prev) => {
                                  const updated = [...prev];
                                  // if null or undefined, initialize it
                                  if (!updated[index]) {
                                    updated[index] = {
                                      amountLeft: "?",
                                      amountTotal: "",
                                      archive: false,
                                      check: false,
                                      containerPrice: "",
                                      ingredientData: {
                                        CalServing: "",
                                        ServingSize: "",
                                        Unit: value,
                                        ingredientName: "",
                                      },
                                      ingredientId: "",
                                      ingredientStore: "",
                                      unitPrice: ""
                                    };
                                  // if already initialized, update ingredientName only
                                  } else {
                                    updated[index] = {
                                      ...updated[index],
                                      ingredientData: {
                                        ...updated[index].ingredientData,
                                        Unit: value
                                      }
                                    };
                                  }
                                  return updated;
                                });
                              }}
                            />
                          </View>
    
                          {/* calories */}
                          <View className="flex flex-row px-3 space-x-0.5 items-center justify-center bg-white w-1/6 border-b-0.5 border-b-zinc400">
                            
                            {/* Amount Input */}
                            <TextInput
                              className="text-[9px] text-center"
                              placeholder="_"
                              placeholderTextColor={colors.zinc400}
                              value={prepCurrentCals[index]}
                              onChangeText={(value) => {
                                setPrepCurrentCals((prev) => {
                                  const updated = [...prev];
                                  updated[index] = value;
                                  return updated;
                                });
                              }}
                            />

                            {/* Label */}
                            <Text className="text-[9px] text-center">
                              {"cal"}
                            </Text>
                          </View>
                        </View>

                        {/* Delete Current Ingredient */}
                        <View className="flex justify-center items-center h-full w-[20px] absolute right-[-20px]">
                          <Icon
                            name="close"
                            size={15}
                            color={colors.zinc600}
                            onPress={() => deletePrepIngredient(index)}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                  }

                  {/* Add Another Ingredient Row */}
                  {numIngredients < 12 && 
                  <TouchableOpacity 
                    className="flex justify-center items-center w-full bg-zinc350 py-0.5 border-x-[1px] border-b-[1px] border-zinc400"
                    onPress={() => setNumIngredients(numIngredients + 1)}
                  >
                    <Icon
                      name="add"
                      size={14}
                      color={colors.zinc900}
                    />
                  </TouchableOpacity>
                  }
                </View>
              </>

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
                      className="flex-1 w-5/6 bg-white radius-[5px] border-[1px] border-zinc300 pl-2.5 pr-10 py-1.5 rounded-md text-[14px] leading-[16px]"
                    />
        
                    {/* BUTTONS */}
                    <View className="flex flex-row absolute right-6 h-[30px] items-center justify-center">

                      {/* type filtering */}
                      <Icon
                        name={prepTypeFilter === "prep" ? "information-circle" : prepTypeFilter === "custom" ? "ellipse" : "ellipse-outline"}
                        color={colors.zinc700}
                        size={18}
                        onPress={() => filterPreps(prepKeywordQuery, prepTypeFilter === "prep" ? "custom" : prepTypeFilter === "custom" ? "" : "prep")}
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
                          
                          {/* name */}
                          <View className="flex flex-wrap w-7/12 bg-theme300 py-2 justify-center items-center px-2">
                            <Text className="text-[13px] italic">
                              {prep.prepName}
                            </Text>
                          </View>

                          {/* date */}
                          <View className="flex flex-col w-1/4 bg-theme400 py-2 justify-center items-center">
                            <Text className="text-[12px] font-medium">
                              {filteredPrepMeals[index]}
                            </Text>
                            <Text className="text-[13px] font-medium">
                              {formatDateShort(filteredPrepDates[index])}
                            </Text>
                          </View>

                          {/* open ingredients button */}
                          {!(Array.isArray(prep.currentData) && prep.currentData.length === 12 && prep.currentData.every((item) => item === null)) 
                          ?
                            <View className="flex w-1/12 py-2 justify-center items-center bg-zinc350">
                              <Icon
                                name="information-circle"
                                color={colors.zinc800}
                                size={20}
                                onPress={() => {
                                  setOpenPrepIndex(openPrepIndex === index ? -1 : index)
                                  setOpenCustomIndex(-1)
                                }}
                              />
                            </View>
                          : // if custom
                          <View className="flex w-1/12 py-2 justify-center items-center bg-zinc350">
                            <Icon
                              name="ellipse"
                              color={colors.zinc400}
                              size={18}
                              onPress={() => {
                                setOpenCustomIndex(openCustomIndex === index ? -1 : index)
                                setOpenPrepIndex(-1)
                              }}
                            />
                          </View>
                          }
                        </View>

                        {/* INGREDIENT DETAILS */}
                        {openPrepIndex === index && (
                          <View className="flex flex-row w-full bg-zinc300">
                            <View className="flex w-1/12"/>

                            {/* Ingredient List */}
                            <View className="flex w-2/3 bg-zinc300 py-1 items-start justify-center">
                              {prep.currentData.slice()
                              .sort((a, b) => a?.ingredientData?.ingredientName?.localeCompare(b?.ingredientData?.ingredientName)).map((current, i) => 
                                current !== null && (
                                  <View key={i} className="flex flex-row w-full pl-2 pr-5 space-x-1">
                                    {/* current ingredient name */}
                                    <Text className="text-zinc800 text-[11px] text-center">
                                      {"-"}
                                    </Text>
                                    <Text className="text-zinc800 text-[11px] text-left">
                                      {current.ingredientData.ingredientName}
                                    </Text>
                                  </View>
                                )
                              )}
                            </View>

                            {/* Details */}
                            <View className="flex flex-col w-1/4 bg-zinc350 justify-center space-y-0.5 py-1">
                              {/* total calories */}
                              <Text className="text-theme900 font-medium text-[11px] text-center">
                                {prep.prepCal} {"cal"}
                              </Text>
                              {/* total price */}
                              <Text className="text-theme900 font-medium text-[11px] text-center">
                                {"$"}{prep.prepPrice}
                              </Text>
                            </View>
                          </View>
                        )}
                        
                        {/* CUSTOM DETAILS */}
                        {openCustomIndex === index && (
                          <View className="flex flex-row w-full bg-zinc300 justify-center items-center space-x-5 py-1">
                            {/* total calories */}
                            <Text className="text-theme900 font-medium text-[11px] text-center">
                              {prep.prepCal} {"cal"}
                            </Text>
                            {/* total price */}
                            <Text className="text-theme900 font-medium text-[11px] text-center">
                              {"$"}{prep.prepPrice}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </ScrollView>
                </View>
              }
              </>
            }
              
            {/* BOTTOM ROW */}
            {(option === "COPY" && copyData?.prepData?.prepName || option === "CREATE") && 
            <>
              {/* Divider */}
              <View className="h-[1px] bg-zinc400 w-full my-2"/>

              <View className="flex flex-row items-center justify-between w-full">
                
                {/* Warning if no name is given */}
                {isNameValid ? "" : 
                  <Text className="text-pink-600 italic">
                    meal prep name is required
                  </Text>
                }
    
                {/* BUTTONS */}
                <View className="flex flex-row justify-center items-center ml-auto">
    
                  {/* Check */}
                  <Icon 
                    size={24}
                    color={'black'}
                    name="checkmark"
                    onPress={() => {
                      option === "CREATE" ? 
                        createComplex ? submitNewComplex()
                        : submitNewSimple()
                      : // option === "COPY"
                        submitCopy()
                    }}
                  />
                </View>
              </View>
            </>
            }
          </View>
          }
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default MealDetailsModal;