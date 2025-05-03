///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Picker } from '@react-native-picker/picker';

import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

import prepAdd from '../../firebase/Prep/prepAdd';
import { spotlightDelete } from '../../firebase/Spotlights/spotlightDelete';

// Fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

// initialize Firebase App
import { getFirestore, doc, getDocs, getDoc, collection } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);

///////////////////////////////// SIGNATURE /////////////////////////////////

const AddPrepModal = ({
    modalVisible, setModalVisible, closeModal, numPreps, currentData
}) => {


  ///////////////////////////////// LOADING DATA /////////////////////////////////

  const [prepName, setPrepName] = useState("");

  // for picker
  const [option, setOption] = useState("NEW");

  // on open
  useEffect(() => {
    // if the modal is opened
    if (modalVisible) {
      setPrepName("Meal Prep " + (numPreps + 1));
      setSelectedCurrentIds([null, null, null, null, null, null, null, null, null, null, null, null]);
      getSpotlights();
    }
  }, [modalVisible]);

  // gets the current collection of spotlights
  const getSpotlights = async () => {
    
    // gets the collection of spotlights
    const querySnapshot = await getDocs(collection(db, 'spotlights'));
    
    // reformats each one
    const spotlightsArray = querySnapshot.docs.map((doc) => {
      const formattedSpotlight = {
        id: doc.id,
        ... doc.data(),
      };
      return formattedSpotlight;
    })
    .sort((a, b) => a.spotlightName.localeCompare(b.spotlightName)); // sort by spotlightName alphabetically
    
    setSpotlightList(spotlightsArray);
  }


  ///////////////////////////////// SPOTLIGHT DROPDOWN /////////////////////////////////

  const [spotlightList, setSpotlightList] = useState(null);
  const [selectedSpotlightId, setSelectedSpotlightId] = useState(null); 
  const [selectedSpotlightData, setSelectedSpotlightData] = useState(null); 
  const [spotlightDropdownOpen, setSpotlightDropdownOpen] = useState(false);

  // retrieves and stores the spotlight data of the given id
  const getSpotlightData = async (spotlightId) => {
    const spotlightDoc = await getDoc(doc(db, 'spotlights', spotlightId));
    if (spotlightDoc.exists()) {
      const spotlightData = spotlightDoc.data();
      setSelectedSpotlightData(spotlightData);
    }
  }

  // when a spotlight is selected, call the previous function
  useEffect(() => {
    if (selectedSpotlightId !== null) {
      getSpotlightData(selectedSpotlightId);
    }
  }, [selectedSpotlightId]);


  ///////////////////////////////// CURRENT PICKERS /////////////////////////////////

  const [selectedCurrentIds, setSelectedCurrentIds] = useState([null, null, null, null, null, null, null, null, null, null, null, null]);
  
  // to update the id of the current index
  const setCurrents = async (value, index) => {
    setSelectedCurrentIds((prev) => {
      const updated = [...prev]; 
      updated[index] = value === "" ? null : value;
      return updated;
    });
  }


  ///////////////////////////////// CLOSE MODAL /////////////////////////////////

  // to submit the meal prep
  const submitModal = async () => {

    let data = null;

    // if a copycat prep is added
    if (option === "SPOTLIGHT") {
      let currCals = ["", "", "", "", "", "", "", "", "", "", "", ""];
      let currPrices = ["", "", "", "", "", "", "", "", "", "", "", ""];
      let currAmounts = selectedSpotlightData.ingredientAmounts;

      let currData = [null, null, null, null, null, null, null, null, null, null, null, null]

      let totalCal = 0;
      let totalPrice = 0;
      
      // loops over the 12 currents
      for (let index = 0; index < 12; index++) {
        if (selectedCurrentIds[index] !== null) {
          
          // gets the current data
          const currentDoc = await getDoc(doc(db, 'currents', selectedCurrentIds[index]));
          const selectedCurrentData = currentDoc.data();
          currData[index] = selectedCurrentData;
          
          // general variables
          const current = selectedCurrentData;
          const storeKey = selectedCurrentData.ingredientStore;
          
          // fractional calculations
          const amount = new Fractional(selectedSpotlightData.ingredientAmounts[index]);
          const servings = storeKey !== "" ? new Fractional(current.ingredientData[`${storeKey}TotalYield`]) : new Fractional(current.ingredientData.ServingSize);
          const cals = storeKey !== "" ? new Fractional(current.ingredientData[`${storeKey}CalContainer`]) : new Fractional(current.ingredientData.CalServing);
          const priceUnit = new Fractional(current.unitPrice);
          
          // invalid 
          if (selectedSpotlightData.ingredientAmounts[index] === "" || selectedSpotlightData.ingredientAmounts[index] === "0") {
            currAmounts[index] = "";
            currCals[index] = "";
            currPrices[index] = "";
            
          // validates the fractional value
          } else if (amount !== 0 && !isNaN(amount.numerator) && !isNaN(amount.denominator) && amount.denominator !== 0) {
            
            // calculate calories if the arguments are valid
            if (!isNaN((new Fraction(servings.toString())) * 1) && !isNaN((new Fraction(cals.toString())) * 1)) {
              // individual
              currCals[index] = new Fraction(amount.divide(servings).multiply(cals).toString()) * 1;
              // overall
              totalCal = (new Fractional(totalCal)).add(amount.divide(servings).multiply(cals)).toString();

            // set individual calories to 0 if arguments are not valid
            } else {
              currCals[index] = new Fraction(0) * 1;
            }

            // calculates prices if the arguments are valid
            if (!isNaN((new Fraction(priceUnit.toString())) * 1)) {
            
              // individual
              currPrices[index] = new Fraction(amount.multiply(priceUnit).toString()) * 1;
              // overall
              totalPrice = (new Fractional(totalPrice)).add(amount.multiply(priceUnit)).toString();

            // set individual prices to 0 if arguments are not valid
            } else {
              currPrices[index] = new Fraction(0) * 1;
            }
            
          // if the amount is not valid
          } else {
            currAmounts[index] = "";
            currCals[index] = "";
            currPrices[index] = "";
          }

        // if the selected data is null
        } else {
          currAmounts[index] = "";
          currCals[index] = "";
          currPrices[index] = "";
        }
      }
      
      // the compiled data
      data = {
        prepName: selectedSpotlightData.spotlightName,
        prepNote: "",
        prepMult: selectedSpotlightData.spotlightMult,
        prepCal: ((new Fraction(totalCal.toString())) * 1).toFixed(0), 
        prepPrice: ((new Fraction(totalPrice.toString())) * 1).toFixed(2), 
        currentData: currData, 
        currentIds: selectedCurrentIds,
        currentAmounts: currAmounts, 
        currentCals: currCals, 
        currentPrices: currPrices,
      };
    
    
    // if a new prep is added
    } else {
      data = {
        prepName: prepName,
        prepNote: "",
        prepMult: 0,
        prepCal: "0", 
        prepPrice: "0.00", 
        currentData: [null, null, null, null, null, null, null, null, null, null, null, null], 
        currentIds: ["", "", "", "", "", "", "", "", "", "", "", ""], 
        currentAmounts: ["", "", "", "", "", "", "", "", "", "", "", ""], 
        currentCals: ["", "", "", "", "", "", "", "", "", "", "", ""], 
        currentPrices: ["", "", "", "", "", "", "", "", "", "", "", ""],
      };
    }

    // adds the meal prep and closes the modal
    const [docId, prepData] = await prepAdd(data);
    closeModal(docId, prepData);

    exitModal();

    // deletes the spotlight if prompted to
    if (deleteSpotlight) { spotlightDelete(selectedSpotlightId); }
  }

  // to close the modal
  const exitModal = (type) => {
    setModalVisible(false);
    setPrepName("");
    setSelectedCurrentIds([null, null, null, null, null, null, null, null, null, null, null, null]);
  };


  ///////////////////////////////// CHOOSING TO DELETE SPOTLIGHT /////////////////////////////////

  const [showDelete, setShowDelete] = useState(false);
  const [deleteSpotlight, setDeleteSpotlight] = useState(false);



  ///////////////////////////////// HTML /////////////////////////////////
  
  return (

    // CONTAINER
    <Modal
      transparent={true}
      animationType="slide"
      visible={modalVisible}
      onRequestClose={exitModal}
    >
      <View className="flex-1 justify-center items-center">

        {/* Background Overlay */}
        <View className="absolute bg-black opacity-50 w-full h-full"/>
        
        {/* Modal Content */}
        <View className="w-5/6 bg-zinc200 px-7 py-5 rounded-2xl">

          {!showDelete 
          ? // THE REGULAR MODAL
          <>
        
          {/* HEADER */}
          <View className="flex-row justify-between w-11/12">

            {/* Arrow Indicating Other Option */}
            <View className="absolute left-1 justify-center items-center h-full">
              <Icon
                name={option === "NEW" ? "arrow-down" : "arrow-up"}
                size={20}
                color={colors.theme600}
              />
            </View>

            {/* Option Seletion - NEW or SPOTLIGHT */}
            <View className="flex w-5/6 ml-3">
              <Picker
                selectedValue={option}
                onValueChange={setOption}
                style={{ height: 30, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -20, }}
                itemStyle={{ color: 'black', fontWeight: 'bold', textAlign: 'center', fontSize: 16, }}
              >
                {(["NEW", "SPOTLIGHT"]).map((item) => (
                    <Picker.Item
                      key={item}
                      label={item + " MEAL PREP"}
                      value={item}
                    />
                  ))
                }
              </Picker>
            </View>


            {/* BUTTONS */}
            <View className="flex flex-row w-1/6 ml-4 items-center justify-center space-x-[-4px]">
              
              {/* Check */}
              <Icon 
                size={24}
                color={'black'}
                name="checkmark"
                onPress={() => {
                  if (selectedSpotlightData !== null) { setShowDelete(true) }
                  else { submitModal() }
                }}
              />

              {/* X */}
              <Icon 
                size={24}
                color={'black'}
                name="close-outline"
                onPress={exitModal}
              />
            </View>
          </View>
          

          {/* DIVIDER */}
          <View className="h-[1px] bg-zinc400 mb-4"/>

          {option === "NEW"
            ?
              // NEW
              <View className="flex flex-row justify-center items-center mb-2 h-[50px] border-0.5 border-zinc500 bg-white rounded-md p-2 mx-4">
                {/* Prep Name Input */}
                <TextInput
                  className="text-center mb-1 text-[14px] leading-[16px]"
                  placeholder={prepName}
                  placeholderTextColor={colors.zinc400}
                  multiline={true}
                  blurOnSubmit={true}
                  value={prepName}
                  onChangeText={(text) => setPrepName(text !== "" ? text : "Meal Prep " + (numPreps + 1))}
                />
              </View>
            :
              // SPOTLIGHTS
              <>
              {/* SPOTLIGHT PREP PICKER */}
              {spotlightList !== null &&
                <View className="flex flex-row justify-evenly content-center mb-4 h-[50px]">
                  <DropDownPicker 
                    open={spotlightDropdownOpen}
                    setOpen={setSpotlightDropdownOpen}
                    value={selectedSpotlightId}
                    setValue={setSelectedSpotlightId}
                    items={spotlightList.map((spotlight) => ({
                      label: spotlight.spotlightName,
                      value: spotlight.id,
                      key: spotlight.id,
                      labelStyle: { color: 'black' }
                    }))}
                    placeholder=""
                    style={{ height: 50, backgroundColor: colors.theme800, borderWidth: 0, justifyContent: 'center', }}
                    dropDownContainerStyle={{ backgroundColor: 'white', }}
                    textStyle={{ color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 12, }}
                    listItemContainerStyle={{ borderBottomWidth: 0.5, borderBottomColor: colors.theme100, }}
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
              }

              {/* If a spotlight is selected, current selector */}
              {selectedSpotlightData !== null &&
                <View className="border-x-2 border-b-2 mx-1.5 border-zinc500 bg-zinc500">
                  {selectedSpotlightData?.ingredientData?.filter(item => item === null).length !== 12
                  ? // At least one ingredient
                  <>
                    {Array.from({ length: 12 }, (_, index) => (
                      <View key={`frozen-${index}`}>
                        {selectedSpotlightData?.ingredientData[index] !== null &&
                          <View className="flex flex-col h-[50px] mt-0.5">

                            <View className={`flex w-full h-1/2 justify-center items-center border-b-0.5 ${index % 2 === 0 ? "bg-zinc350" : "bg-theme200"}`}>
                              <Text className="text-black text-[12px] font-semibold text-center px-1">
                                {selectedSpotlightData?.ingredientData[index]?.ingredientName}
                              </Text>
                            </View>

                            <View className={`flex w-full h-1/2 mb-0.5 ${index % 2 === 0 ? "bg-zinc350" : "bg-theme200"}`}>
                              <Picker
                                selectedValue={selectedCurrentIds[index]}
                                onValueChange={(value) => setCurrents(value, index)}
                                style={{ height: 25, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -10, }}
                                itemStyle={{ color: 'black', textAlign: 'center', fontSize: 12, }}
                              >
                                {currentData.map((item) => {
                                  return (
                                    <Picker.Item
                                      key={item?.id || Math.random()}
                                      label={item?.ingredientData?.ingredientName || ""}
                                      value={item?.id || ""}
                                    />
                                  );
                                })}
                              </Picker>
                            </View>
                          </View>
                        }
                      </View>
                    ))}
                  </>
                  : // No ingredients
                    <View className="flex w-full h-[30px] justify-center items-center border-t-2 border-zinc500 bg-zinc450">
                      <Text className="text-black font-semibold text-[12px] italic">
                        no ingredients available
                      </Text>
                    </View>
                  }
                </View>
              }
              </>
            }
          </>


          : // AFTER CHECKMARK TO SUBMIT
          <>

            {/* HEADER */}
            <View className="flex-col justify-center items-center w-full">

              {/* Spotlight Name */}
              <View className="flex flex-row w-full py-1">
                <Text className="w-full text-center text-theme800 font-bold text-[18px]">
                  {selectedSpotlightData?.spotlightName}
                </Text>
              </View>
              
              {/* DIVIDER */}
              <View className="h-[1px] bg-zinc400 mb-5 w-full"/>
            </View> 
            
            {/* PROMPT */}
            <View className="flex flex-col justify-center items-center pb-5">
              <Text className="text-[14px] italic text-zinc600">
                This spotlight's data will be transfered.
              </Text>
              <Text className="text-[14px] italic text-zinc600">
                How would you like to proceed?
              </Text>
            </View>
            
            {/* BUTTONS */}
            <View className="flex flex-row px-3 justify-center items-center space-x-4">
  
              {/* Delete */}
              <View className="flex flex-row w-3/4 justify-end items-center space-x-2">
                <Icon
                  name={deleteSpotlight ? "checkbox" : "square-outline"}
                  color={colors.zinc600}
                  size={24}
                  onPress={() => setDeleteSpotlight(!deleteSpotlight)}
                />
                <Text className="text-[15px] text-theme700 font-semibold">
                  DELETE SPOTLIGHT
                </Text>
              </View>
  
              {/* Proceed */}
              <View className="flex w-1/4 justify-center items-center">
                <Icon
                  name="checkmark-done-circle"
                  color={colors.zinc800}
                  size={36}
                  onPress={() => submitModal()}
                />
              </View>
            </View>
          </>
          }
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default AddPrepModal;