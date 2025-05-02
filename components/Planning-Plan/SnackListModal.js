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
import validateDecimalInput from '../../components/Validation/validateDecimalInput';
import validateWholeNumberInput from '../Validation/validateWholeNumberInput';

// Initialize Firebase App
import { getFirestore, updateDoc, doc, collection } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const SnackListModal = ({ 
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


  ///////////////////////////////// SETUP /////////////////////////////////

  const [snackData, setSnackData] = useState(null);
  const [snackCal, setSnackCal] = useState("");
  const [snackPrice, setSnackPrice] = useState("");

  // stores data on open
  useEffect(() => {
    if (modalVisible) {
      setSnackData(data?.snackData || null);
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


  ///////////////////////////////// SUBMIT /////////////////////////////////

  // to change the current snack list
  const submitSnacks = async () => {
    
    // current meal info
    const [month, day, year] = date.split("/");
    const formattedDate = `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    
    // figures out if snack data is empty and should be null
    const isEmpty = JSON.stringify(sortObjectKeys(snackData)) === JSON.stringify(sortObjectKeys([{"amount":"","price":"","name":"","cal":"","unit":""}]));

    // compiled data
    const docData = {
      snackData: isEmpty ? null : snackData,
      snackCal,
      snackPrice,
    };

    // updates db
    updateDoc(doc(db, 'plans', formattedDate), { "snacks": docData });
    
    // closes the modal, indicating that a custom prep was made
    closeModal();
    setModalVisible(false);
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
    
            {/* Check */}
            <Icon 
              size={24}
              color={'black'}
              name="checkmark"
              onPress={() => submitSnacks()}
            />
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>


          <View className="flex flex-col justify-center items-center px-4 w-full mb-2">

            {/* TOP ROW */}
            <View className="flex flex-row items-center justify-center border mb-2 bg-zinc600">

              {/* Title */}
              <View className="flex justify-center items-center px-1.5 py-1 w-1/2 border-r bg-zinc700">
                <Text className="font-semibold text-white text-[12px]">
                  SNACKS
                </Text>
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
            </View> 

            {/* GRID */}
            {snackData !== null && 
              <View className="flex flex-col z-10 border-[1px] border-zinc700">
                  
                {/* Frozen Columns */}
                {snackData?.map((snack, index) =>  
                  <View key={`frozen-${index}`} className="flex flex-row h-[30px] bg-white">
                    <View className="bg-black w-full flex-row">

                      {/* snack names */}
                      <View className="flex items-center justify-center w-1/2 bg-theme600 border-b border-r border-zinc700 z-10">
                        <View className="flex flex-wrap flex-row">
                          {/* Input */}
                          <TextInput
                            className="text-white font-semibold text-[10px] text-center px-2"
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
                          />
                        </View>
                      </View>

                      {/* amount */}
                      <View className="flex flex-row px-2 w-1/3 space-x-1 items-center justify-center bg-zinc100 border-b border-b-zinc400 border-r border-r-zinc300">
                        {/* Amount Input */}
                        <TextInput
                          className="text-[9px] text-center"
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
                        />
                        {/* Unit Input */}
                        <TextInput
                          className="text-[9px] text-center"
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
                        />
                      </View>
                      
                      {/* Details */}
                      <View className="flex flex-col w-1/6 items-center justify-center px-1 bg-white border-b border-zinc400">

                        {/* calories */}
                        <View className="flex flex-row h-2/5 w-full space-x-0.5 justify-center items-center bg-white">
                          
                          {/* Amount Input */}
                          <TextInput
                            className="text-[8px] text-center"
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
                          />

                          {/* Label */}
                          <Text className="text-[8px] text-center">
                            {"cal"}
                          </Text>
                        </View>

                        {/* price */}
                        <View className="flex flex-row h-2/5 w-full justify-center items-center bg-white">

                          {/* Label */}
                          <Text className="text-[8px] text-center">
                            {"$"}
                          </Text>
                          
                          {/* Amount Input */}
                          <TextInput
                            className="text-[8px] text-center"
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
                            onBlur={() => {
                              setSnackData((prev) => {
                                const updated = [...prev];
                                updated[index] = {
                                  ...updated[index],
                                  price: (new Fractional(snackData[index].price) * 1).toFixed(2)
                                };
                                return updated;
                              });
                            }}
                          />
                        </View>
                      </View>
                    </View>

                    {/* Delete Current Snack */}
                    <View className="flex justify-center items-center h-full w-[20px] absolute right-[-20px]">
                      <Icon
                        name="close"
                        size={15}
                        color={colors.zinc600}
                        onPress={() => deleteSnack(index)}
                      />
                    </View>
                  </View>
                )}
              </View>
            }

            {/* Add Another Snack Row */}
            <TouchableOpacity 
              className="flex justify-center items-center w-full bg-zinc350 py-0.5 border-x-[1px] border-b-[1px] border-zinc400"
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
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default SnackListModal;