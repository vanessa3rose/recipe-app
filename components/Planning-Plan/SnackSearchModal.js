///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect, useRef } from 'react';

// UI components
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, Keyboard} from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// fractions
var Fractional = require('fractional').Fraction;

// validation
import extractUnit from '../../components/Validation/extractUnit';
import { deepSnackEqual, deepSnackIndexOf } from '../Validation/deepSnackSearch';
import validateFractionInput from '../Validation/validateFractionInput';
import validateDecimalInput from '../Validation/validateDecimalInput';
import validateWholeNumberInput from '../Validation/validateWholeNumberInput';

// initialize firebase app
import { getFirestore, doc, writeBatch } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const SnackSearchModal = ({ 
  snapshot, modalVisible, setModalVisible, closeModal
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


  ///////////////////////////////// ON OPEN /////////////////////////////////

  const [plansSnapshot, setPlansSnapshot] = useState(null);

  // loads data on open
  useEffect(() => {
    if (modalVisible) {
      loadSnacks( snapshot?.docs.map(doc => ({ id: doc.id, data: doc.data()})), "" );
    }
  }, [modalVisible]);

  // getting DB data - SNACKS
  const [uniqueSnackNames, setUniqueSnackNames] = useState(null);
  const [uniqueSnackData, setUniqueSnackData] = useState(null);
  const [uniqueSnackDates, setUniqueSnackDates] = useState(null);

  // getting DB data - TITLE
  const [uniqueTitleNames, setUniqueTitleNames] = useState(null);
  const [uniqueTitleData, setUniqueTitleData] = useState(null);
  const [uniqueTitleDates, setUniqueTitleDates] = useState(null);


  // gets the collection of snacks
  const loadSnacks = async (currSnapshot, name) => {
    setScrollName(name);
    setPlansSnapshot(currSnapshot);
    
    // to get the unique list of snacks
    let snackNames = [];
    let snackData = [];
    let snackDates = [];

    let titleNames = [];
    let titleData = [];
    let titleDates = [];


    // loops through all the plans
    currSnapshot.map((plan) => {
      
      // SNACKS
      if (plan.data.snacks?.snackData) {

        plan.data.snacks.snackData.map((snack) => {
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
        if (plan.data.snacks?.snackTitle !== "SNACKS") {
          const titleNameIndex = titleNames.indexOf(plan.data.snacks?.snackTitle);
          
          // completely new
          if (titleNameIndex === -1) {
            titleNames.push(plan.data.snacks?.snackTitle); 
            titleData.push([plan.data.snacks]); 
            titleDates.push([[plan.id]]);
            
          // otherwise - exact match or alternate found
          } else {
            const titleDataIndex = deepSnackIndexOf(titleData[titleNameIndex], plan.data.snacks);
  
            // alternative found
            if (titleDataIndex === -1) {
              titleData[titleNameIndex].push(plan.data.snacks);
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
    setUniqueSnackDates(combinedSnacks.map(item => item.date));
    
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
    setUniqueTitleDates(combinedTitles.map(item => item.date));

    // filters based on given argument
    const filtered = filterSnacks(snackKeywordQuery, keywordType, 
      keywordType === "snack" ? combinedSnacks.map(item => item.name) : combinedTitles.map(item => item.name), 
      keywordType === "snack" ? combinedSnacks.map(item => item.data) : combinedTitles.map(item => item.data), 
      keywordType === "snack" ? combinedSnacks.map(item => item.date) : combinedTitles.map(item => item.date)
    );

    // scrolls to change if applicable
    const idx = filtered.indexOf(name);
    if (idx !== -1) { 
      setTimeout(() => {
        verticalScrollRef.current?.scrollToIndex({ index: idx, animated: false }); 
      }, 1000);
    }
  }


  ///////////////////////////////// SHOWING DETAILS /////////////////////////////////

  const [openIndex, setOpenIndex] = useState(-1);
  const [infoType, setInfoType] = useState("details");

  const [showSpecifics, setShowSpecifics] = useState(false);
  const [currIndex, setCurrIndex] = useState(0);

  // to format the given date as "mm/dd/yy"
  const formatDateShort = (currDate) => {
    currDate = new Date(currDate + "T00:00:00");
    
    const mm = currDate.getMonth() + 1; // Months are 0-based
    const dd = currDate.getDate();
    const yy = currDate.getFullYear() % 100;
    
    return `${mm}/${dd}/${yy}`;
  };


  ///////////////////////////////// SEARCH SECTION /////////////////////////////////

  const [snackKeywordQuery, setSnackKeywordQuery] = useState("");

  const [filteredNames, setFilteredNames] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [filteredDates, setFilteredDates] = useState(null);

  const [keywordType, setKeywordType] = useState("snack");
  
  // to filter the list of snacks in the search section
  const filterSnacks = (searchQuery, type, uniqueNames, uniqueData, uniqueDates) => {
    setEditNameIndex(-1);
    setEditVariantIndices({"snack": -1, "variant": -1})
    setKeywordType(type);
    setSnackKeywordQuery(searchQuery);
    setOpenIndex(-1);

    // to get the unique list of snacks
    let names = [];
    let data = [];
    let dates = [];

    // adds the data to the snack/title lists that matches the filtering
    uniqueNames.map((name, index) => {
      
      // if the keywords match, push the data
      if (searchQuery.split(" ").every((word) => name.toLowerCase().includes(word.toLowerCase()))) {
        // adds the name to the filtered names
        names.push(uniqueNames[index]);
        data.push(uniqueData[index]);
        dates.push(uniqueDates[index]);
      }
    })

    // stores the data
    setFilteredNames(names);
    setFilteredData(data);
    setFilteredDates(dates);

    return names;
  }


  ///////////////////////////////// CHANGING NAMES /////////////////////////////////

  const [isEditing, setIsEditing] = useState(false);

  const [editNameIndex, setEditNameIndex] = useState(-1);
  const [editedName, setEditedName] = useState("");

  // to change the name of a snack
  const changeSnackName = async () => {

    // maps over all of the old plans
    const newSnapshot = plansSnapshot.map((plan) => {
      const newPlan = { ...plan };

      // maps over current snack data
      if (newPlan?.data?.snacks?.snackData) {
        const newSnackData = newPlan.data.snacks.snackData.map((snack) => {

          // updates the name if it matches the old one
          if (snack.name === filteredNames[editNameIndex]) {
            return { ...snack, name: editedName };
          }
          return snack;
        });

        // replaces snackData in the new plan
        newPlan.data = {
          ...newPlan.data,
          snacks: {
            ...newPlan.data.snacks,
            snackData: newSnackData,
          },
        };
      }

      return newPlan;
    });
    
    setEditedName("");
    setEditedVariant(null);

    // reloads data
    loadSnacks(newSnapshot, editedName);

    // closes the editor
    setEditNameIndex(-1);
  }

  // to change the title of a snack
  const changeSnackTitle = async () => {

    // maps over all of the old plans
    const newSnapshot = plansSnapshot.map((plan) => {
      const newPlan = { ...plan };

      // updates the title if it matches the old one
      if (newPlan?.data?.snacks?.snackTitle === filteredNames[editNameIndex]) {
        newPlan.data = {
          ...newPlan.data,
          snacks: {
            ...newPlan.data.snacks,
            snackTitle: editedName,
          },
        };
      }

      return newPlan;
    });
    
    setEditedName("");
    setEditedVariant(null);

    // reloads data
    loadSnacks(newSnapshot, editedName);

    // closes the editor
    setEditNameIndex(-1);
  }


  ///////////////////////////////// CHANGING VARIANTS /////////////////////////////////

  const [editVariantIndices, setEditVariantIndices] = useState({"snack": -1, "variant": -1});
  const [editedVariant, setEditedVariant] = useState(null);

  // to change the data of a snack
  const changeSnackNameData = async () => {

    // maps over all of the old plans
    const newSnapshot = plansSnapshot.map((plan) => {
      const newPlan = { ...plan };

      // maps over current snack data
      if (newPlan?.data?.snacks?.snackData) {
        const newSnackData = newPlan.data.snacks.snackData.map((snack) => {

          // updates the variant if it matches the old one
          if (deepSnackEqual(snack, filteredData[editVariantIndices.snack][editVariantIndices.variant])) {
            return {
              ...editedVariant,
              cal: Number(editedVariant?.cal).toFixed(0),
              price: Number(editedVariant?.price).toFixed(2),
            };
          }

          return snack;
        });

        // replaces snackData in the new plan
        newPlan.data = {
          ...newPlan.data,
          snacks: {
            ...newPlan.data.snacks,
            snackData: newSnackData,
            snackCal: newSnackData.reduce((sum, data) => { return sum + Number(data.cal || 0); }, 0).toFixed(0),
            snackPrice: newSnackData.reduce((sum, data) => { return sum + Number(data.price || 0); }, 0).toFixed(2),
          },
        };
      }

      return newPlan;
    });
    
    setEditedName("");
    setEditedVariant(null);

    // reloads data
    loadSnacks(newSnapshot, editedVariant.name);

    // closes the editor
    setEditVariantIndices({"snack": -1, "variant": -1});
  }

  // to change the data of a title
  const changeSnackTitleData = async () => {

    // maps over all of the old plans
    const newSnapshot = plansSnapshot.map((plan) => {
      const newPlan = { ...plan };

      if (deepSnackEqual(newPlan?.data?.snacks, filteredData[editVariantIndices.snack][editVariantIndices.variant])) {
        newPlan.data = {
          ...newPlan.data,
          snacks: {
            ...editedVariant,
            snackTitle: editedVariant?.snackTitle === "" ? "SNACKS" : editedVariant?.snackTitle,
            snackData: editedVariant?.snackData.map((data) => ({
              ...data,
              unit: data.unit === "" ? "serving" : data.unit,
              amount: data.amount === "" && data.unit === "" ? "1" : data.amount,
            })),
          },
        };
      }

      return newPlan;
    });

    setEditedName("");
    setEditedVariant(null);

    // reloads data
    loadSnacks(newSnapshot, editedVariant.snackTitle);

    // closes the editor
    setEditVariantIndices({"snack": -1, "variant": -1});
  }


  ///////////////////////////////// EDITING TITLE VARIANTS /////////////////////////////////

  // to add another snack
  const addSnack = () => {
    
    // makes data have one empty snack if null
    if (editedVariant?.snackData === null) {
      setEditedVariant({
        ...editedVariant,
        snackData: [{  name: "", amount: "", cal: "", price: "", }],
      });
    
    // adds empty snack otherwise
    } else {
      setEditedVariant({
        ...editedVariant,
        snackData: [
          ...editedVariant?.snackData,
          { name: "", amount: "", cal: "", price: "", unit: "" },
        ],
      });
    }
  }

  // to delete or clear the pressed snack
  const deleteSnack = (index) => {

    // if the number of filled in ingredients is 1, simply clear
    if (editedVariant?.snackData.length === 1) {
      setEditedVariant((prev) => ({
        ...prev,
        snackData: prev.snackData.map((snack, i) =>
          i === index
            ? { name: "", amount: "", unit: "", cal: "", price: "", }
            : snack
        ),
      }));

    // if there is more than one, delete
    } else {
      setEditedVariant((prev) => ({
        ...prev,
        snackData: prev.snackData.filter((_, i) => i !== index),
      }));
    }
  }

  // to clear everything
  const clearData = () => {
    setEditedVariant({
      snackCal: "0", 
      snackData: null, 
      snackPrice: "0.00", 
      snackTitle: "SNACKS"
    });
  }
    
  
  ///////////////////////////////// SUBMITTING /////////////////////////////////

  // submits changes
  const submitChanges = async () => {
  
    // creates a batch to update plans
    const batch = writeBatch(db);

    const oldSnapshot = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data()}));

    // maps over all of the updated plans to find changes
    plansSnapshot.map((plan) => {
      if (plan.data.snacks !== undefined) {

        const newSnacks = plan.data.snacks;
        const oldSnacks = oldSnapshot.find(doc => doc.id === plan.data.date).data.snacks;

        // if the snack has changed, adds update to the batch
        if (!deepSnackEqual(newSnacks, oldSnacks)) {
          batch.update(doc(db, 'PLANS', plan.id), { snacks: newSnacks });
        }
      }
    });

    // commits the batch
    await batch.commit();
    
    // closes the modal
    closeModal(null, null);
  }
    
  
  ///////////////////////////////// SCROLLING /////////////////////////////////
  
  // vertical scroll syncing
  const verticalScrollRef = useRef(null);
  const [scrollName, setScrollName] = useState("");


  ///////////////////////////////// HTML /////////////////////////////////
  
  return (

    <Modal
      transparent={true}
      animationType="slide"
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View className="flex-1 justify-center items-center">

        {/* Background Overlay - only accessible when not editing */}
        <TouchableOpacity onPress={() => {!isEditing && setModalVisible(false)}} activeOpacity={isEditing && 0.5} className="absolute bg-black opacity-50 w-full h-full"/>
        
        {/* Modal Content */}
        <View className="flex w-5/6 py-5 px-5 bg-zinc200 rounded-2xl z-50">

          {/* TITLE */}
          <View className="flex flex-row justify-between items-center px-2">
            <Text className="text-[20px] font-bold">
              {`SNACK ${isEditing ? "EDIT" : "SEARCH"}`}
            </Text>
            
            {/* Set Editing */}
            {!(editVariantIndices.snack !== -1 && keywordType === "snack title")
            ? 
              <Icon
                name={isEditing ? "backspace" : "create"}
                size={20}
                color={colors.zinc800}
                onPress={() => {
                  if (isEditing) {
                    setEditNameIndex(-1);
                    setEditedName("");
                    setEditVariantIndices({"snack": -1, "variant": -1});
                    setEditedVariant(null);
                  }
                  setIsEditing(!isEditing);
                }}
              />
            :
              // dealing with editing title variants
              <View className="flex flex-row">
                {/* change */}
                <Icon
                  name="checkmark-circle"
                  size={20}
                  color={colors.zinc800}
                  onPress={() => changeSnackTitleData()}
                />
                {/* close */}
                <Icon
                  name="close-circle"
                  size={20}
                  color={colors.zinc800}
                  onPress={() => setEditVariantIndices({"snack": -1, "variant": -1})}
                />
              </View>
            }
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>

          <View className="flex flex-col items-center justify-center">

            {/* SNACK FILTERING SECTION */}
            {(editNameIndex === -1 && editVariantIndices.snack === -1 && editVariantIndices.variant === -1) && (
              <View className="flex flex-row w-full justify-center items-center mb-[20px]">

                {/* Searchbar */}
                <View className="flex flex-row w-[85%] h-[30px] pr-4 pl-1">
              
                  {/* Keyword Type Selector */}
                  <View className="h-full justify-center bg-zinc300 px-1 rounded-l-md">
                    <Icon
                      name={keywordType === "snack title" ? "code-working" : keywordType === "snack" && "list"}
                      color={colors.theme900}
                      size={20}
                      onPress={() => {
                        if (keywordType === "snack title") {
                          filterSnacks(snackKeywordQuery, "snack", uniqueSnackNames, uniqueSnackData, uniqueSnackDates);
                        } else if (keywordType === "snack") {
                          filterSnacks(snackKeywordQuery, "snack title", uniqueTitleNames, uniqueTitleData, uniqueTitleDates);
                        }
                      }}
                    />
                  </View>

                  {/* text input */}
                  <TextInput
                    value={snackKeywordQuery}
                    onChangeText={(value) => {
                      if (keywordType === "snack") {
                        filterSnacks(value, "snack", uniqueSnackNames, uniqueSnackData, uniqueSnackDates);
                      } else if (keywordType === "snack title") {
                        filterSnacks(value, "snack title", uniqueTitleNames, uniqueTitleData, uniqueTitleDates);
                      }
                    }}
                    placeholder={`${keywordType} keyword(s)`}
                    placeholderTextColor={colors.zinc400}
                    className="flex-1 w-full bg-white border-[1px] border-zinc300 pl-2.5 pr-10 py-1.5 rounded-r-md text-[14px] leading-[17px]"
                  />

                  {/* clear button */}
                  <View className="flex flex-row h-[30px] absolute right-5 items-center justify-center">
                    <Icon
                      name="close-outline"
                      size={20}
                      color="black"
                      onPress={() => {
                        setSnackKeywordQuery("");
                        setOpenIndex(-1);
                        if (keywordType === "snack") {
                          filterSnacks("", "snack", uniqueSnackNames, uniqueSnackData, uniqueSnackDates);
                        } else if (keywordType === "snack title") {
                          filterSnacks("", "snack title", uniqueTitleNames, uniqueTitleData, uniqueTitleDates);
                        }
                      }}
                    />
                  </View>
                </View>

                {/* information type button */}
                <View className="w-[15%] items-center">
                  <Icon
                    name={infoType === "details" ? "apps" : "calendar"}
                    size={20}
                    color={colors.zinc600}
                    onPress={() => setInfoType(infoType === "details" ? "dates" : "details")}
                  />
                </View>
              </View>
            )}
            
            {/* Filtered List of Snacks */}
            {(filteredData?.length > 0 && !(editVariantIndices.snack !== -1 && keywordType === "snack title"))
            ?
              <FlatList
                className="max-h-[200px] bg-zinc500 border-2 border-zinc600 mb-3"
                ref={verticalScrollRef}
                data={filteredData}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item: snack, index }) => (
                  <View className="flex flex-col items-center justify-center pb-2">
                    {/* GENERAL DETAILS */}
                    <View className="flex flex-row border-y-[1px] border-zinc600">
                      
                      {/* Overall Name Display */}
                      <View className={`flex flex-row w-[85%] h-full pr-1 justify-between ${(editNameIndex === index || filteredNames[index] === editedName || filteredNames[index] === editedVariant?.name || filteredNames[index] === editedVariant?.snackTitle || filteredNames[index] === scrollName) ? "bg-mauve200" : "bg-theme300"}`}>

                        {/* edit name button */}
                        {(isEditing && editNameIndex === -1 && !(openIndex === index && keywordType === "snack title")) && (
                          <View className={`flex bg-zinc100 px-1 justify-center items-center`}>
                            <Icon
                              name="pencil"
                              size={15}
                              color="black"
                              onPress={() => {
                                setEditNameIndex(index);
                                setEditedName(filteredNames[index]);
                              }}
                            />
                          </View>
                        )}

                        {/* name */}
                        <View className="flex-1 ml-1 px-2 py-1 justify-center">
                          {(editNameIndex !== index)
                          ? // viewing
                            <Text className="text-left text-[13px] italic">
                              {filteredNames[index]}
                            </Text>
                          : // editing
                          <View className="flex flex-row justify-between space-x-2 ">
                            <TextInput
                              value={editedName}
                              onChangeText={setEditedName}
                              placeholder={filteredNames[index]}
                              placeholderTextColor={colors.zinc500}
                              className="flex-1 text-left text-[13px] italic bg-zinc200 ml-[-5px] pl-[5px] pr-1 py-0.5 border border-zinc300 rounded-md"
                              multiline={true}
                              blurOnSubmit={true}
                            />

                            {/* BUTTONS */}
                            <View className="flex flex-row justify-center items-center mr-[-5px]">
                              {/* Submit */}
                              <Icon
                                name="checkmark"
                                size={20}
                                color="black"
                                onPress={() => {keywordType === "snack" ? changeSnackName() : keywordType === "snack title" && changeSnackTitle()}}
                              />
                              {/* Close */}
                              <Icon
                                name="close-outline"
                                size={20}
                                color="black"
                                onPress={() => {
                                  setEditNameIndex(-1);
                                  setEditedName("");
                                }}
                              />
                            </View>
                          </View>
                          }
                        </View>
                                      
                        {/* indicator of selected option */}
                        {(keywordType === "snack" || (keywordType === "snack title" && !showSpecifics && (openIndex !== index)))
                        ? (editNameIndex !== index)
                        &&
                          // (#)
                          <View className="flex justify-center items-center">
                            <Text className="text-[12px] font-semibold text-theme900">
                              {`(${snack.length})`}
                            </Text>
                          </View>
                        : (editNameIndex !== index)
                        &&
                          // #/#
                          <TouchableOpacity 
                            className="flex justify-center items-center"
                            onPress={() => setCurrIndex((currIndex + 1) % snack.length)}
                          >
                            <Text className="text-[12px] font-semibold text-theme900">
                              {`${currIndex + 1}/${snack.length}`}
                            </Text>
                          </TouchableOpacity>
                        }

                        {/* edit variant button */}
                        {(isEditing && openIndex === index && keywordType === "snack title" && editNameIndex !== index) && (
                          <View className={`flex px-1 justify-center items-center`}>
                            <Icon
                              name="pencil"
                              size={15}
                              color="black"
                              onPress={() => {
                                setEditVariantIndices({"snack": index, "variant": currIndex});
                                setEditedVariant(filteredData[index][currIndex]);
                              }}
                            />
                          </View>
                        )}
                      </View>

                      {/* open information button */}
                      <View className={`flex w-[15%] py-2 justify-center items-center ${(editNameIndex === index || filteredNames[index] === editedName || filteredNames[index] === editedVariant?.name || filteredNames[index] === editedVariant?.snackTitle || filteredNames[index] === scrollName) ? "bg-mauve400" : "bg-theme400"}`}>
                        <Icon
                          name="information-circle"
                          color={colors.zinc800}
                          size={18}
                          onPress={() => setOpenIndex(openIndex === index ? -1 : index)}
                        />
                      </View>
                    </View>

                    {/* SNACK DATES */}
                    {(openIndex === index && infoType === "dates") && (
                      <View className="bg-zinc300 w-full justify-center items-center">
                        { keywordType === "snack"
                        ?
                          <ScrollView
                            horizontal
                            scrollEventThrottle={16}
                            contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                            className="flex flex-row py-2 space-x-2"
                          >
                            {filteredDates[index].map((variant, idx) => (
                              <View 
                                key={idx}
                                className="flex flex-col bg-zinc200 space-y-0.5 w-[100px] justify-center items-center px-2 py-1 border-[0.5px] border-dashed rounded-lg"
                              >
                                {variant.map((date, i) => (
                                  <View
                                    key={i}
                                    className="flex flex-row space-x-1"
                                  >
                                    {/* goto arrow */}
                                    {!isEditing && (
                                      <Icon
                                        name="arrow-back"
                                        size={14}
                                        color={colors.zinc700}
                                        onPress={() => {
                                          const [year, month, day] = date.split("-");
                                          closeModal("SNACK", {
                                            dateString: date,
                                            day: parseInt(day, 10).toString(),
                                            month: parseInt(month, 10).toString(),
                                            year: parseInt(year, 10).toString(),
                                            timestamp: new Date(year, month, day).getTime(),
                                          });
                                        }}
                                      />
                                    )}

                                    {/* date */}
                                    <Text className="text-theme900 font-medium text-[11px] text-center">
                                      {formatDateShort(date)}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            ))}
                          </ScrollView>
                        : keywordType === "snack title"
                        &&
                          <View className="flex flex-col bg-zinc200 my-2 space-y-0.5 w-[100px] justify-center items-center px-2 py-1 border-[0.5px] border-dashed rounded-lg">
                            {filteredDates[index][currIndex].map((date, idx) => (
                              <View
                                key={idx}
                                className="flex flex-row space-x-1"
                              >
                                {/* goto arrow */}
                                {!isEditing && (
                                  <Icon
                                    name="arrow-back"
                                    size={14}
                                    color={colors.zinc700}
                                    onPress={() => {
                                      const [year, month, day] = date.split("-");
                                      closeModal("SNACK", {
                                        dateString: date,
                                        day: parseInt(day, 10).toString(),
                                        month: parseInt(month, 10).toString(),
                                        year: parseInt(year, 10).toString(),
                                        timestamp: new Date(year, month, day).getTime(),
                                      });
                                    }}
                                  />
                                )}

                                {/* date */}
                                <Text className="text-theme900 font-medium text-[11px] text-center">
                                  {formatDateShort(date)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        }
                      </View>
                    )}

                    {/* DETAILS */}
                    {(openIndex === index && infoType === "details") && (
                      <View className={`w-full justify-center items-center ${(editVariantIndices.snack !== index) ? "bg-zinc300" : "bg-mauve100"}`}>

                        {/* Snack */}
                        {(keywordType === "snack")
                        ?
                          <>
                            {(editVariantIndices.snack !== index)
                            ?
                              <ScrollView
                                horizontal
                                scrollEventThrottle={16}
                                contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                                className="flex flex-row p-2 space-x-2"
                              >
                                {snack.map((variant, i) => (
                                  <View 
                                    key={i}
                                    className="flex flex-col bg-zinc200 space-y-0.5 w-[100px] justify-center items-center px-2 py-1 border border-dashed rounded-lg"
                                  >
                                    {/* amount */}
                                    <Text className="text-theme900 font-medium text-[11px] text-center">
                                      {`${variant.amount} ${extractUnit(variant.unit, variant.amount)}`}
                                    </Text>

                                    {/* DIVIDER */}
                                    <View className="h-[1px] bg-zinc400 w-5/6 mb-0.5"/>

                                    <View className="flex flex-col justify-center items-center">
                                      {/* calories */}
                                      <Text className="text-zinc700 font-medium text-[10px] text-center">
                                        {`${variant.cal} cal`}
                                      </Text>
                                      {/* price */}
                                      <Text className="text-zinc700 font-medium text-[10px] text-center">
                                        {`$${variant.price}`}
                                      </Text>

                                      {/* Edit Button */}
                                      {isEditing && (
                                        <View className="absolute h-full w-full justify-center items-end">
                                          <Icon
                                            name="pencil"
                                            size={15}
                                            color={colors.theme900}
                                            onPress={() => {
                                              setEditVariantIndices({"snack": index, "variant": i});
                                              setEditedVariant(variant);
                                            }}
                                          />
                                        </View>
                                      )}
                                    </View>
                                  </View>
                                ))}
                              </ScrollView>
                            :
                              <View className="flex flex-col bg-zinc200 my-2 space-y-0.5 w-[100px] justify-center items-center px-2 py-1 border border-dashed rounded-lg">
                                
                                <View className="flex flex-row space-x-1">
                                  {/* amount */}
                                  <TextInput 
                                    value={editedVariant?.amount}
                                    onChangeText={(value) => {
                                      setEditedVariant((prev) => {
                                        const updated = { ...prev }; 
                                        updated["amount"] = validateFractionInput(value);
                                        return updated;
                                      })
                                    }}
                                    placeholder={editedVariant?.amount}
                                    placeholderTextColor={colors.zinc500}
                                    className="text-theme900 font-medium text-[11px] text-center"
                                  />

                                  {/* unit */}
                                  <TextInput 
                                    value={editedVariant?.unit}
                                    onChangeText={(value) => {
                                      setEditedVariant((prev) => {
                                        const updated = { ...prev }; 
                                        updated["unit"] = extractUnit(value, editedVariant?.amount);
                                        return updated;
                                      })
                                    }}
                                    placeholder={editedVariant?.unit}
                                    placeholderTextColor={colors.zinc500}
                                    className="text-theme900 font-medium text-[11px] text-center"
                                  />
                                </View>

                                {/* DIVIDER */}
                                <View className="h-[1px] bg-zinc400 w-5/6 mb-0.5"/>

                                <View className="flex flex-col justify-center items-center">
                                  {/* calories */}
                                  <View className="flex flex-row space-x-1">
                                    <TextInput 
                                      value={editedVariant?.cal}
                                      onChangeText={(value) => {
                                        setEditedVariant((prev) => {
                                          const updated = { ...prev }; 
                                          updated["cal"] = validateWholeNumberInput(value);
                                          return updated;
                                        })
                                      }}
                                      placeholder={editedVariant?.cal}
                                      placeholderTextColor={colors.zinc500}
                                      className="text-zinc700 font-medium text-[10px] text-center"
                                    />
                                    {/* label */}
                                    <Text className="text-zinc700 font-medium text-[10px] text-center">
                                      cal
                                    </Text>
                                  </View>

                                  {/* price */}
                                  <View className="flex flex-row">
                                    {/* label */}
                                    <Text className="text-zinc700 font-medium text-[10px] text-center">
                                      $
                                    </Text>
                                    <TextInput 
                                      value={editedVariant?.price}
                                      onChangeText={(value) => {
                                        setEditedVariant((prev) => {
                                          const updated = { ...prev }; 
                                          updated["price"] = validateDecimalInput(value);
                                          return updated;
                                        })
                                      }}
                                      placeholder={editedVariant?.price}
                                      placeholderTextColor={colors.zinc500}
                                      className="text-zinc700 font-medium text-[10px] text-center"
                                    />
                                  </View>
                                </View>

                                {/* Buttons */}
                                <View className="absolute flex flex-col right-[-30px]">
                                  {/* change */}
                                  <Icon
                                    name="checkmark-circle"
                                    size={22}
                                    color={colors.zinc800}
                                    onPress={() => changeSnackNameData()}
                                  />
                                  {/* close */}
                                  <Icon
                                    name="close-circle"
                                    size={22}
                                    color={colors.zinc800}
                                    onPress={() => setEditVariantIndices({"snack": -1, "variant": -1})}
                                  />
                                </View>
                              </View>
                            }
                          </>
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
              />
            : !(editVariantIndices.snack !== -1 && keywordType === "snack title")
            &&
              <View className="py-1 px-3 bg-zinc500 border-2 border-zinc600">
                <Text className="italic text-center text-white font-medium">
                  no snacks match the current filter
                </Text>
              </View>
            }
          </View>




          {/* Editing Snack Title Data */}
          {(editVariantIndices.snack !== -1 && keywordType === "snack title") && (
            <View className="flex flex-col justify-center items-center w-full ml-[-10px] mb-2">

              {/* TOP ROW */}
              <View className="flex flex-row items-center justify-center border-0.5 ml-[20px] mb-2 bg-zinc600">

                {/* Title */}
                <View className="flex justify-center items-center px-1.5 py-1 w-1/2 border-r-0.5 bg-zinc700">
                  <TextInput
                    className="w-full text-center mb-1 font-semibold text-[12px] text-white leading-[15px]"
                    placeholder={filteredNames[editVariantIndices.snack]}
                    placeholderTextColor={colors.zinc400}
                    multiline={true}
                    blurOnSubmit={true}
                    value={editedVariant?.snackTitle}
                    onChangeText={(value) => {
                      setEditedVariant((prev) => {
                        const updated = { ...prev }; 
                        updated["snackTitle"] = value;
                        return updated;
                      })
                    }}
                  />
                </View>

                {/* Meal Details */}
                <View className="flex flex-row space-x-4 justify-center items-center w-1/2 py-1">

                  {/* calories */}
                  <Text className="text-[11px] text-white">
                      {editedVariant?.snackCal === "" ? "0" : editedVariant?.snackCal || "0"}{" cal"}
                  </Text>

                  {/* price */}
                  <Text className="text-[11px] text-white">
                    {"$"}{editedVariant?.snackPrice === "" ? "0.00" : editedVariant?.snackPrice || "0.00"}
                  </Text>
                </View>

                {/* Clearing Data */}
                <View className="absolute right-[-20px]">
                  <Icon
                    name="trash"
                    size={18}
                    color={colors.mauve500}
                    onPress={() => clearData()}
                  />
                </View>
              </View> 

              {/* GRID */}
              {(editedVariant?.snackData !== null) && (
                <ScrollView 
                  className={`flex flex-col w-full mr-[-40px] z-10 ${(keyboardType === "grid" && isKeyboardOpen) && "max-h-[100px]"}`}
                  scrollEnabled={keyboardType === "grid" && isKeyboardOpen}
                >
                    
                  {/* Frozen Columns */}
                  {editedVariant?.snackData?.map((snack, index) =>  
                    <View key={`frozen-${index}`} className="flex flex-row min-h-[30px]">
                    
                      {/* snack */}
                      <View className={`flex-1 flex-row bg-zinc500 border-x-[1px] ${(index === 0) && "border-t-[1px]"} ${(index === editedVariant?.snackData.length - 1) && "border-b-[1px]"} border-zinc700`}>
                        
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
                                setEditedVariant((prev) => ({
                                  ...prev,
                                  snackData: prev.snackData.map((snack, index) =>
                                    index === editVariantIndices.variant
                                      ? { ...snack, name: value }
                                      : snack
                                  ),
                                }));
                              }}
                              multiline={true}
                              blurOnSubmit={true}
                              onFocus={() => setKeyboardType("grid")}
                              onBlur={() => setKeyboardType("")}
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
                              setEditedVariant((prev) => ({
                                ...prev,
                                snackData: prev.snackData.map((snack, index) =>
                                  index === editVariantIndices.variant
                                    ? { ...snack, amount: validateFractionInput(value) }
                                    : snack
                                ),
                              }));
                            }}
                            onFocus={() => setKeyboardType("grid")}
                            onBlur={() => setKeyboardType("")}
                          />
                          {/* Unit Input */}
                          <TextInput
                            className="text-[9px] leading-[12px] flex text-center pr-4 py-1"
                            placeholder="unit(s)"
                            placeholderTextColor={colors.zinc450}
                            value={snack.unit}
                            onChangeText={(value) => {
                              setEditedVariant((prev) => ({
                                ...prev,
                                snackData: prev.snackData.map((snack, index) =>
                                  index === editVariantIndices.variant
                                    ? { ...snack, unit: value }
                                    : snack
                                ),
                              }));
                            }}
                            multiline={true}
                            blurOnSubmit={true}
                            onFocus={() => setKeyboardType("grid")}
                            onBlur={() => setKeyboardType("")}
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
                                setEditedVariant((prev) => {
                                  const updatedSnackData = prev.snackData.map((snack, i) =>
                                    i === index ? { ...snack, cal: validateWholeNumberInput(value) } : snack
                                  );
                                  return {
                                    ...prev,
                                    snackData: updatedSnackData,
                                    snackCal: updatedSnackData.reduce((sum, snack) => sum + Number(snack.cal || 0), 0).toFixed(0),
                                  };
                                });
                              }}
                              onFocus={() => setKeyboardType("grid")}
                              onBlur={() => {
                                setKeyboardType("");
                                setEditedVariant((prev) => {
                                  const updatedSnackData = prev.snackData.map((snack, i) =>
                                    i === index ? { ...snack, cal: snack.cal === "" ? "0" : (snack.cal * 1).toFixed(0) } : snack
                                  );
                                  return {
                                    ...prev,
                                    snackData: updatedSnackData,
                                    snackCal: updatedSnackData.reduce((sum, snack) => sum + Number(snack.cal || 0), 0).toFixed(0),
                                  };
                                });
                              }}
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
                                setEditedVariant((prev) => {
                                  const updatedSnackData = prev.snackData.map((snack, i) =>
                                    i === index ? { ...snack, price: validateDecimalInput(value) } : snack
                                  );
                                  return {
                                    ...prev,
                                    snackData: updatedSnackData,
                                    snackPrice: updatedSnackData.reduce((sum, snack) => sum + Number(snack.price || 0), 0).toFixed(2),
                                  };
                                });
                              }}
                              onFocus={() => setKeyboardType("grid")}
                              onBlur={() => {
                                setKeyboardType("");
                                setEditedVariant((prev) => {
                                  const updatedSnackData = prev.snackData.map((snack, i) =>
                                    i === index ? { ...snack, price: snack.price === "" ? "0.00" : (snack.price * 1).toFixed(2), } : snack
                                  );
                                  return {
                                    ...prev,
                                    snackData: updatedSnackData,
                                    snackPrice: updatedSnackData.reduce((sum, snack) => sum + Number(snack.price || 0), 0).toFixed(2),
                                  };
                                });
                              }}
                            />
                          </View>
                        </View>
                      </View>

                      {/* Delete Current Snack */}
                      <View className="flex w-[20px] z-50 justify-center items-center">
                        <Icon
                          name="close"
                          size={15}
                          color={colors.zinc600}
                          onPress={() => deleteSnack(index)}
                        />
                      </View>
                    </View>
                  )}
                </ScrollView>
              )}

              {/* Add Another Snack Row */}
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
            </View>
          )}
                                  
          
          {(isEditing && !(editVariantIndices.snack !== -1 && keywordType === "snack title")) && (
            <>
              {/* Divider */}
              <View className="h-[1px] bg-zinc400 w-full my-2"/>

              {/* BOTTOM ROW */}
              <View className="flex flex-row items-center justify-between w-full">

                {/* Buttons */}
                <View className="flex flex-row w-full justify-end items-center ml-auto">

                  {/* submit */}
                  <Icon 
                    size={24}
                    color="black"
                    name="checkmark-done"
                    onPress={() => submitChanges()}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default SnackSearchModal;