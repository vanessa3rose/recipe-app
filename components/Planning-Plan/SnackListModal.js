///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect } from 'react';

// UI components
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, Keyboard } from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// fractions
var Fractional = require('fractional').Fraction;

// validation
import extractUnit from '../Validation/extractUnit';
import validateFractionInput from '../../components/Validation/validateFractionInput';
import validateDecimalInput from '../../components/Validation/validateDecimalInput';
import validateWholeNumberInput from '../Validation/validateWholeNumberInput';
import { deepSnackIndexOf } from '../Validation/deepSnackSearch';

// initialize firebase app
import { getFirestore, updateDoc, setDoc, getDoc, doc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const SnackListModal = ({ 
  date, dispDate, data, snapshot, 
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


  ///////////////////////////////// SETUP /////////////////////////////////

  const [snackTitle, setSnackTitle] = useState("SNACKS");
  const [snackData, setSnackData] = useState(null);
  const [snackCal, setSnackCal] = useState("");
  const [snackPrice, setSnackPrice] = useState("");

  // stores data on open
  useEffect(() => {
    if (modalVisible) {
      setSnackTitle(data?.snackTitle || "SNACKS");
      setSnackData(data?.snackData || null);
      setIsEditing(data === null || data.snackData === null || data?.snackData?.length === 0);
    }
  }, [modalVisible]);
  
  // recalculates the total calories and price
  useEffect(() => {
    if (snackData) {
  
      // sums together all of the calories
      setSnackCal(
        (snackData.map(snack => new Fractional(snack.cal).numerator / new Fractional(snack.cal).denominator)
                  .filter(cal => !isNaN(cal))
                  .reduce((sum, cal) => sum + cal, 0))
        .toFixed(0)
      );
  
      // sums together all of the prices
      setSnackPrice(
        (snackData.map(snack => new Fractional(snack.price).numerator / new Fractional(snack.price).denominator)
                  .filter(price => !isNaN(price))
                  .reduce((sum, price) => sum + price, 0))
        .toFixed(2)
      );
    }
  }, [snackData]);


  ///////////////////////////////// CHANGE SNACKS /////////////////////////////////

  const [isEditing, setIsEditing] = useState(false);

  // to add another snack
  const addSnack = () => {
    
    // makes data have one empty snack if null
    if (snackData === null) {
      setSnackData([{
        name: "",
        amount: "",
        unit: "",
        cal: "",
        price: "",
      }])
    
    // adds empty snack otherwise
    } else {
      setSnackData((prev) => {
        const updated = [...prev];
        updated[snackData.length] = {
          name: "",
          amount: "",
          unit: "",
          cal: "",
          price: "",
        }
        return updated;
      })
    }
  }

  // to delete or clear the pressed snack
  const deleteSnack = (index) => {

    // if the number of filled in ingredients is 1, simply clear
    if (snackData.length === 1) {
      setSnackData((prev) => {
        const updated = [...prev];
        updated[index] = {
          name: "",
          amount: "",
          unit: "",
          cal: "",
          price: "",
        };
        return updated;
      });
    

    // if there is more than one, delete
    } else {
      setSnackData((prev) =>
        prev.filter((_, i) => i !== index)
      );
    }
  }

  // to clear everything
  const clearData = () => {
    setSnackTitle("SNACKS");
    setSnackData(null);
    setSnackCal("");
    setSnackPrice("");
  }


  ///////////////////////////////// SUBMIT /////////////////////////////////

  // to change the current snack list
  const submitSnacks = async () => {
    
    // current meal info
    const [month, day, year] = date.split("/");
    const formattedDate = `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    
    // figures out if snack data is empty and should be null
    const isEmpty = JSON.stringify(sortObjectKeys(snackData)) === JSON.stringify(sortObjectKeys([{"amount":"","price":"","name":"","cal":"","unit":""}])) || JSON.stringify(sortObjectKeys(snackData)) === null;

    // refactored snackData
    const newSnackData = snackData?.map((snack) => ({
      ...snack,
      amount: snack.amount === ""
        ? "1" : snack.amount,
      cal: (isNaN(snack.cal) || snack.cal === "")
        ? "0" : snack.cal,
      price: (isNaN(snack.price) || snack.price === "")
        ? "0.00"
        : ((new Fractional(snack.price)).numerator / (new Fractional(snack.price)).denominator).toFixed(2),
      unit: snack.unit === "" 
        ? extractUnit("serving(s)", snack.amount === "" ? "1" : snack.amount)
        : snack.unit
    })).filter((snack => snack.name !== ""));
    
    // compiled data
    const compiledData = {
      snackTitle: snackTitle === "" ? "SNACKS" : snackTitle,
      snackData: isEmpty ? null : newSnackData || null,
      snackCal: snackCal === "" ? "0" : snackCal,
      snackPrice: snackPrice === "" ? "0.00" : snackPrice,
    };
    
    // retrieves the current doc data
    const currData = await getDoc(doc(db, 'PLANS', formattedDate));

    // if it exists, just set the snacks
    if (currData.exists()) {
      updateDoc(doc(db, 'PLANS', formattedDate), { "snacks": compiledData });

    // otherwise, create a null doc first
    } else {
      const docData = { 
        date: formattedDate,
        meals: {
          lunch: {
            prepId: null,          
            prepData: null,
          },
          dinner: {
            prepId: null,         
            prepData: null,
          },
        },
        snacks: compiledData,
      };
      setDoc(doc(db, 'PLANS', formattedDate), docData);
    }
    
    // closes the modal, indicating that a custom prep was made
    closeModal();
    setModalVisible(false);
  }
  
  
  ///////////////////////////////// SNACK SEARCH /////////////////////////////////
  
  const [openIndex, setOpenIndex] = useState(-1);
  const [showSpecifics, setShowSpecifics] = useState(false);
  const [currIndex, setCurrIndex] = useState(0);

  const [showSnackSearch, setShowSnackSearch] = useState(false);
  
  // gets the snapshot if null
  useEffect(() => {
    if (snapshot !== null) {
      fetchSnacks();
    }
  }, [snapshot])
  
  // getting DB data - SNACKS
  const [uniqueSnackNames, setUniqueSnackNames] = useState(null);
  const [uniqueSnackData, setUniqueSnackData] = useState(null);

  // getting DB data - TITLE
  const [uniqueTitleNames, setUniqueTitleNames] = useState(null);
  const [uniqueTitleData, setUniqueTitleData] = useState(null);
  

  // gets the collection of snacks
  const fetchSnacks = async () => {

    // to get the unique list of snacks
    let snackNames = [];
    let snackData = [];
    let snackDates = [];

    let titleNames = [];
    let titleData = [];
    let titleDates = [];


    // loops through all the plans
    snapshot.docs.map((plan) => {
      
      // SNACKS
      if (plan.data().snacks?.snackData) {

        plan.data().snacks.snackData.map((snack) => {
          const snackNameIndex = snackNames.indexOf(snack.name);
          
          // completely new
          if (snackNameIndex === -1) {
            snackNames.push(snack.name); 
            snackData.push([snack]); 
            snackDates.push([[plan.id]]);
            
          // otherwise - exact match or alternate found
          } else {
            const snackDataIndex = deepSnackIndexOf(snackData[snackNameIndex], snack);
  
            // alternative found
            if (snackDataIndex === -1) {
              snackData[snackNameIndex].push(snack);
              snackDates[snackNameIndex].push([plan.id]);
            
            // exact match found
            } else {
              snackDates[snackNameIndex][snackDataIndex].push(plan.id);
            }
          }
        })
      
        // TITLES
        if (plan.data().snacks?.snackTitle !== "SNACKS") {
          const titleNameIndex = titleNames.indexOf(plan.data().snacks?.snackTitle);
          
          // completely new
          if (titleNameIndex === -1) {
            titleNames.push(plan.data().snacks?.snackTitle); 
            titleData.push([plan.data().snacks]); 
            titleDates.push([[plan.id]]);
            
          // otherwise - exact match or alternate found
          } else {
            const titleDataIndex = deepSnackIndexOf(titleData[titleNameIndex], plan.data().snacks);
  
            // alternative found
            if (titleDataIndex === -1) {
              titleData[titleNameIndex].push(plan.data().snacks);
              titleDates[titleNameIndex].push([plan.id]);
            
            // exact match found
            } else {
              titleDates[titleNameIndex][titleDataIndex].push(plan.id);
            }
          }
        }
      }
    })
    
    // SNACKS: combined data to sort
    let combinedSnacks = snackNames.map((name, index) => ({
      name: name,
      data: snackData[index],
      date: snackDates[index],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
    
    // stores extracted, sorted values
    setUniqueSnackNames(combinedSnacks.map(item => item.name));
    setUniqueSnackData(combinedSnacks.map(item => item.data));
    
    // TITLES: combined data to sort
    let combinedTitles = titleNames.map((name, index) => ({
      name: name,
      data: titleData[index],
      date: titleDates[index],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
    
    // stores extracted, sorted values
    setUniqueTitleNames(combinedTitles.map(item => item.name));
    setUniqueTitleData(combinedTitles.map(item => item.data));
    
    // initial filtered values are based on snacks, not titles
    setFilteredNames(combinedSnacks.map(item => item.name));
    setFilteredData(combinedSnacks.map(item => item.data));
  }
  
  // for filtering
  const [snackKeywordQuery, setSnackKeywordQuery] = useState("");
  
  const [filteredNames, setFilteredNames] = useState(null);
  const [filteredData, setFilteredData] = useState(null);

  const [keywordType, setKeywordType] = useState("snack");
  
  // to filter the list of snacks in the search section
  const filterSnacks = (searchQuery, type) => {
    setKeywordType(type);
    setSnackKeywordQuery(searchQuery);
    setOpenIndex(-1);

    // to get the unique list of snacks
    let names = [];
    let data = [];

    if (type === "snack") {

      // adds the data to the snack lists that matches the filtering
      uniqueSnackNames.map((name, index) => {
        
        // if the keywords match, push the data
        if (searchQuery.split(" ").every((word) => name.toLowerCase().includes(word.toLowerCase()))) {
          // adds the name to the filtered names
          names.push(uniqueSnackNames[index]);
          data.push(uniqueSnackData[index]);
        }
      })
    
    } else if (type === "snack title") {

      // adds the data to the snack lists that matches the filtering
      uniqueTitleNames.map((name, index) => {
        
        // if the keywords match, push the data
        if (searchQuery.split(" ").every((word) => name.toLowerCase().includes(word.toLowerCase()))) {
          // adds the name to the filtered names
          names.push(uniqueTitleNames[index]);
          data.push(uniqueTitleData[index]);
        }
      })
    }

    // stores the data
    setFilteredNames(names);
    setFilteredData(data);
  }


  ///////////////////////////////// SNACK COPY /////////////////////////////////

  // to copy a snack from the snack search
  const copySnack = (variantIndex) => {
    
    // makes data have one empty snack if null
    if (snackData === null) {
      setSnackData([filteredData[openIndex][variantIndex]])
    
    // adds empty snack otherwise
    } else {
      setSnackData((prev) => {
        const updated = [...prev];
        updated[snackData.length] = filteredData[openIndex][variantIndex];
        return updated;
      })
    }

    // resets states
    setOpenIndex(-1);
    setShowSpecifics(false);
    setCurrIndex(0);
    setShowSnackSearch(false);
    setSnackKeywordQuery("");
    setKeywordType("snack");
  }

  // to copy a title from the snack search
  const copyTitle = () => {
    setSnackTitle(filteredData[openIndex][currIndex].snackTitle);
    setSnackData(filteredData[openIndex][currIndex].snackData);

    // resets states
    setOpenIndex(-1);
    setShowSpecifics(false);
    setCurrIndex(0);
    setShowSnackSearch(false);
    setSnackKeywordQuery("");
    setKeywordType("snack");
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
        <View className="absolute bg-black opacity-50 w-full h-full"/>
        
        {/* Modal Content */}
        <View className="flex w-5/6 py-5 px-5 bg-zinc200 rounded-2xl z-50">

          {/* TOP ROW */}
          <View className="flex flex-row justify-between items-center px-2">
            {/* Date */}
            <Text className="text-[20px] font-bold">
              {dispDate}
            </Text>

            {/* Set Editing */}
            <Icon
              name={isEditing ? "backspace" : "create"}
              size={20}
              color={colors.zinc800}
              onPress={() => setIsEditing(!isEditing)}
            />
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>


          {!showSnackSearch
          ? 
            // VIEWING / EDITING
            <View className="flex flex-col justify-center items-center w-full ml-[-10px] mb-2">

              {/* TOP ROW */}
              <View className="flex flex-row items-center justify-center border-0.5 ml-[20px] mb-2 bg-zinc600">

                {/* Title */}
                <View className="flex justify-center items-center px-1.5 py-1 w-1/2 border-r-0.5 bg-zinc700">
                  <TextInput
                    className="w-full text-center mb-1 font-semibold text-[12px] text-white leading-[15px]"
                    placeholder={snackTitle === "SNACKS" ? "SNACKS" : snackTitle}
                    placeholderTextColor={colors.zinc400}
                    multiline={true}
                    blurOnSubmit={true}
                    value={snackTitle}
                    onChangeText={setSnackTitle}
                    editable={isEditing}
                  />
                </View>

                {/* Meal Details */}
                <View className="flex flex-row space-x-4 justify-center items-center w-1/2 py-1">

                  {/* calories */}
                  <Text className="text-[11px] text-white">
                      {snackCal === "" ? "0" : snackCal || "0"}{" cal"}
                  </Text>

                  {/* price */}
                  <Text className="text-[11px] text-white">
                    {"$"}{snackPrice === "" ? "0.00" : snackPrice || "0.00"}
                  </Text>
                </View>

                {/* Clearing Data */}
                {isEditing && (
                  <View className="absolute right-[-20px]">
                    <Icon
                      name="trash"
                      size={18}
                      color={colors.mauve500}
                      onPress={() => clearData()}
                    />
                  </View>
                )}
              </View> 

              {/* GRID */}
              {(snackData !== null) && (
                <ScrollView 
                  className={`flex flex-col w-full mr-[-40px] z-10 ${(keyboardType === "grid" && isKeyboardOpen) && "max-h-[100px]"}`}
                  scrollEnabled={keyboardType === "grid" && isKeyboardOpen}
                >
                    
                  {/* Frozen Columns */}
                  {snackData?.map((snack, index) =>  
                    <View key={`frozen-${index}`} className="flex flex-row min-h-[30px]">
                    
                      {/* snack */}
                      <View className={`flex-1 flex-row bg-zinc500 border-x-[1px] ${(index === 0) && "border-t-[1px]"} ${(index === snackData.length - 1) && "border-b-[1px]"} border-zinc700`}>
                        
                        {/* snack names */}
                        <View className="flex items-center justify-center w-1/2 bg-theme600 border-b-0.5 border-r-0.5 border-zinc700 z-10">
                          <View className="flex flex-wrap flex-row">
                            {/* Input */}
                            <TextInput
                              className="w-full text-white font-semibold text-[10px] text-center px-2 pb-1"
                              placeholder="snack name"
                              placeholderTextColor={colors.zinc350}
                              value={snack.name || ""}
                              onChangeText={(value) => {
                                setSnackData((prev) => {
                                  const updated = [...prev];
                                  updated[index] = {
                                    ...updated[index],
                                    name: value
                                  };
                                  return updated;
                                });
                              }}
                              multiline={true}
                              blurOnSubmit={true}
                              onFocus={() => setKeyboardType("grid")}
                              onBlur={() => setKeyboardType("")}
                              editable={isEditing}
                            />
                          </View>
                        </View>

                        {/* amount */}
                        <View className="flex flex-row px-2 w-1/3 space-x-1 items-center justify-center bg-zinc100 border-b-0.5 border-b-zinc400 border-r-0.5 border-r-zinc300">
                          {/* Amount Input */}
                          <TextInput
                            className="text-[9px] flex text-center h-full pl-4"
                            placeholder="_"
                            placeholderTextColor={colors.zinc450}
                            value={snack.amount}
                            onChangeText={(value) => {
                              setSnackData((prev) => {
                                const updated = [...prev];
                                updated[index] = {
                                  ...updated[index],
                                  amount: validateFractionInput(value)
                                };
                                return updated;
                              });
                            }}
                            onFocus={() => setKeyboardType("grid")}
                            onBlur={() => setKeyboardType("")}
                            editable={isEditing}
                          />
                          {/* Unit Input */}
                          <TextInput
                            className="text-[9px] leading-[12px] flex text-center pr-4 py-1"
                            placeholder="unit(s)"
                            placeholderTextColor={colors.zinc450}
                            value={snack.unit}
                            onChangeText={(value) => {
                              setSnackData((prev) => {
                                const updated = [...prev];
                                updated[index] = {
                                  ...updated[index],
                                  unit: value
                                };
                                return updated;
                              });
                            }}
                            multiline={true}
                            blurOnSubmit={true}
                            onFocus={() => setKeyboardType("grid")}
                            onBlur={() => setKeyboardType("")}
                            editable={isEditing}
                          />
                        </View>
                        
                        {/* Details */}
                        <View className="flex flex-col w-1/6 items-center justify-center py-1.5 px-1 space-y-0.5 bg-white border-b-0.5 border-zinc400">

                          {/* calories */}
                          <View className="flex flex-row w-full space-x-0.5 justify-center items-center bg-white">
                            
                            {/* Amount Input */}
                            <TextInput
                              className="text-[8px] flex-auto text-right"
                              placeholder="_"
                              placeholderTextColor={colors.zinc400}
                              value={snack.cal}
                              onChangeText={(value) => {
                                setSnackData((prev) => {
                                  const updated = [...prev];
                                  updated[index] = {
                                    ...updated[index],
                                    cal: validateWholeNumberInput(value)
                                  };
                                  return updated;
                                });
                              }}
                              onFocus={() => setKeyboardType("grid")}
                              onBlur={() => setKeyboardType("")}
                              editable={isEditing}
                            />

                            {/* Label */}
                            <Text className="text-[8px] flex-auto text-left">
                              {"cal"}
                            </Text>
                          </View>

                          {/* price */}
                          <View className="flex flex-row w-full justify-center items-center bg-white">

                            {/* Label */}
                            <Text className="text-[8px] flex-auto text-right">
                              {"$"}
                            </Text>
                            
                            {/* Amount Input */}
                            <TextInput
                              className="text-[8px] flex-auto text-left"
                              placeholder="_"
                              placeholderTextColor={colors.zinc400}
                              value={snack.price}
                              onChangeText={(value) => {
                                setSnackData((prev) => {
                                  const updated = [...prev];
                                  updated[index] = {
                                    ...updated[index],
                                    price: validateDecimalInput(value)
                                  };
                                  return updated;
                                });
                              }}
                              onFocus={() => setKeyboardType("grid")}
                              onBlur={() => {
                                setKeyboardType("");
                                setSnackData((prev) => {
                                  const updated = [...prev];
                                  updated[index] = {
                                    ...updated[index],
                                    price: snackData[index].price === "" ? "" : (new Fractional(snackData[index].price) * 1).toFixed(2)
                                  };
                                  return updated;
                                });
                              }}
                              editable={isEditing}
                            />
                          </View>
                        </View>
                      </View>

                      {/* Delete Current Snack */}
                      <View className="flex w-[20px] z-50 justify-center items-center">
                        {isEditing && (
                          <Icon
                            name="close"
                            size={15}
                            color={colors.zinc600}
                            onPress={() => deleteSnack(index)}
                          />
                        )}
                      </View>
                    </View>
                  )}
                </ScrollView>
              )}

              {/* Add Another Snack Row */}
              {isEditing && (
                <View className="flex flex-row items-center justify-center ml-[20px]">
                  <TouchableOpacity 
                    className="flex justify-center items-center bg-zinc350 w-full py-0.5 border-b-[1px] border-x-[1px] border-zinc400"
                    onPress={() => addSnack()}
                  >
                    <Icon
                      name="add"
                      size={14}
                      color={colors.zinc900}
                    />
                  </TouchableOpacity>
                </View>
              )}
              
              {/* SEARCH TOGGLE */}
              {isEditing && (
                <TouchableOpacity 
                  className={`flex flex-row justify-center items-center px-5 py-1 mt-4 ml-[20px] ${(keyboardType === "grid" && isKeyboardOpen) && "mb-6"} rounded-full space-x-1 bg-theme200 border-[1px] border-zinc350`}
                  onPress={() => setShowSnackSearch(true)}
                >
                  {/* search button */}
                  <Icon
                    name="search"
                    size={11}
                    color={colors.zinc900}
                  />
                  {/* text */}
                  <Text className="text-[12px] font-medium">
                    SNACKS
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          : 
            // SEARCHING
            <View className="flex w-full mb-2">
                      
              {/* Snack Filtering */}
              <View className="flex flex-row w-full h-[30px] pl-8 pr-10 mb-2 items-center justify-center">

                {/* back button */}
                <View className="pr-1">
                  <Icon 
                    size={24}
                    color={colors.zinc700}
                    name="caret-back"
                    onPress={() => setShowSnackSearch(false)}
                  />
                </View>
      
                {/* filter input */}
                <View className="flex bg-white w-full border-0.5 h-full border-zinc500 rounded-l-md justify-center items-start pl-2 pr-6">
                  <TextInput
                    className="w-full text-left text-[14px]"
                    value={snackKeywordQuery}
                    onChangeText={(value) => filterSnacks(value, keywordType)}
                    placeholder="search for snack"
                    placeholderTextColor={colors.zinc400}
                  />
      
                  {/* clear button */}
                  <View className="absolute right-1 h-full items-center flex flex-row">
                    <Icon 
                      size={20}
                      color="black"
                      name="close-outline"
                      onPress={() => setSnackKeywordQuery("")}
                    />
                  </View>
                </View>
                            
                {/* Keyword Type Selector */}
                <View className="h-full justify-center bg-zinc300 px-1 rounded-r-md">
                  <Icon
                    name={keywordType === "snack title" ? "code-working" : keywordType === "snack" && "list"}
                    color={colors.theme900}
                    size={20}
                    onPress={() => filterSnacks(snackKeywordQuery, keywordType === "snack title" ? "snack" : "snack title") }
                  />
                </View>
              </View>
            
              {/* Filtered List of Snacks */}
              {filteredData?.length > 0 
              ?
                <ScrollView
                  vertical
                  scrollEventThrottle={16}
                  contentContainerStyle={{ flexDirection: 'column' }}
                  className="max-h-[200px] bg-zinc500 border-2 border-zinc600 space-y-2 my-2"
                >
                  {filteredData?.map((snack, index) =>
                    <View
                      key={index}
                      className="flex flex-col items-center justify-center"
                    >
                      {/* GENERAL DETAILS */}
                      <View className="flex flex-row border-y-[1px] border-zinc600">
                      
                        {/* Copy Title Button */}
                        {(keywordType === "snack title" && openIndex === index) && (
                          <View className="flex w-[10%] bg-zinc100 justify-center items-center">
                            <Icon
                              name="play-skip-back"
                              color="black"
                              size={16}
                              onPress={() => copyTitle()}
                            />
                          </View>
                        )}
                        
                        {/* Overall Name Display */}
                        <View className={`flex flex-row bg-theme300 py-2 pl-2 pr-1 space-x-2 items-center justify-between ${(keywordType === "snack title" && openIndex === index) ? "w-3/4" : "w-[85%]"}`}>
                          {/* name */}
                          <View className="flex-1">
                            <Text className="text-left text-[13px] italic">
                              {filteredNames[index]}
                            </Text>
                          </View>
                                        
                          {/* indicator of selected option */}
                          {(keywordType === "snack" || (keywordType === "snack title" && !showSpecifics && (openIndex !== index)))
                          ? 
                            // (#)
                            <View>
                              <Text className="text-[12px] font-semibold text-theme900">
                                {`(${snack.length})`}
                              </Text>
                            </View>
                          : 
                            // #/#
                            <TouchableOpacity 
                              onPress={() => setCurrIndex((currIndex + 1) % snack.length)}
                            >
                              <Text className="text-[12px] font-semibold text-theme900">
                                {`${currIndex + 1}/${snack.length}`}
                              </Text>
                            </TouchableOpacity>
                          }
                        </View>

                        {/* open information button */}
                        <View className="flex py-2 justify-center items-center bg-theme400 w-[15%]">
                          <Icon
                            name="information-circle"
                            color={colors.zinc800}
                            size={18}
                            onPress={() => setOpenIndex(openIndex === index ? -1 : index)}
                          />
                        </View>
                      </View>

                      {/* DETAILS */}
                      {(openIndex === index) && (
                        <View className="bg-zinc300 w-full justify-center items-center">

                          {/* Snack */}
                          {keywordType === "snack" 
                          ?
                            <ScrollView
                              horizontal
                              scrollEventThrottle={16}
                              contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                              className="flex flex-row p-2 space-x-2"
                            >
                              {snack.map((variant, i) => (
                                <TouchableOpacity 
                                  key={i}
                                  onPress={() => copySnack(i)}
                                  className="flex flex-col bg-zinc200 space-y-0.5 w-[100px] justify-center items-center px-2 py-1 border border-dashed rounded-lg"
                                >
                                  {/* amount */}
                                  <Text className="text-theme900 font-medium text-[11px] text-center">
                                    {`${variant.amount} ${extractUnit(variant.unit, variant.amount)}`}
                                  </Text>
                                  {/* DIVIDER */}
                                  <View className="h-[1px] bg-zinc400 w-5/6 mb-0.5"/>
                                  {/* calories */}
                                  <Text className="text-zinc700 font-medium text-[10px] text-center">
                                    {`${variant.cal} cal`}
                                  </Text>
                                  {/* price */}
                                  <Text className="text-zinc700 font-medium text-[10px] text-center">
                                  {`$${variant.price}`}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          : keywordType === "snack title"
                          &&
                            <View className="flex flex-row w-full bg-black">

                              {/* Ingredient List */}
                              {!showSpecifics
                              ? // not showing specific amounts
                              <View className="flex flex-col w-3/4 bg-zinc300 py-1 items-start justify-center">
                                {snack[currIndex]?.snackData?.map((current, i) => 
                                  current !== null && (
                                    <View key={i} className="flex flex-row w-full pl-2 pr-5 space-x-1">
                                      {/* current ingredient name */}
                                      <Text className="text-zinc800 text-[11px] text-center">
                                        {"⁃"}
                                      </Text>
                                      <Text className="text-zinc800 text-[11px] text-left pr-2">
                                        {current.name}
                                      </Text>
                                    </View>
                                  )
                                )}
                              </View>
                              : 
                              // showing specific amounts
                              <View className="flex w-full bg-zinc300 items-start justify-center">
                                <>
                                {snack[currIndex]?.snackData?.map((current, i) => 
                                  current !== null && (
                                    <View key={i} className="flex flex-row">

                                      {/* INGREDIENT NAME */}
                                      <View className={`${(i === 0) && "pt-1"} ${(i === snack[currIndex].snackData.filter(curr => curr !== null).length - 1) && "pb-1"} w-3/4 flex flex-row pl-2 pr-5 space-x-1`}>
                                        <Text className="text-zinc800 text-[11px] text-center">
                                          {"⁃"}
                                        </Text>
                                        <Text className="text-zinc800 text-[11px] text-left pr-2">
                                          {`${current.name}`}
                                        </Text>
                                      </View>

                                      {/* INGREDIENT AMOUNT */}
                                      <View className={`${(i === 0) && "pt-1"} ${(i === snack[currIndex].snackData.filter(curr => curr !== null).length - 1) && "pb-1"} w-1/4 justify-center items-center bg-zinc350`}>
                                        <Text className="text-theme900 font-medium text-[9px] text-center">
                                          {`${current.amount} ${current.unit}`}
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
                                    {snack[currIndex].snackCal} {"cal"}
                                  </Text>
                                  {/* total price */}
                                  <Text className="text-theme900 font-medium text-[11px] text-center">
                                    {"$"}{snack[currIndex].snackPrice}
                                  </Text>
                                </View>
                              )}
                            </View>
                          }
                        </View>
                      )}
                    </View>
                  )}
                </ScrollView>
              :
                <View className="py-1 px-3 bg-zinc500 border-2 border-zinc600">
                  <Text className="italic text-center text-white font-medium">
                    no snacks match the current filter
                  </Text>
                </View>
              }
            </View>
          }
                        

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 w-full my-2"/>

          {/* BOTTOM ROW */}
          <View className="flex flex-row items-center justify-between w-full">

            {/* Buttons */}
            <View className="flex flex-row justify-center items-center space-x-[-2px] ml-auto">

              {/* submit */}
              <Icon 
                size={24}
                color="black"
                name="checkmark"
                onPress={() => submitSnacks()}
              />

              {/* Close */}
              <Icon
                size={24}
                color="black"
                name="close-outline"
                onPress={() => setModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default SnackListModal;