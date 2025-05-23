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
import validateFractionInput from '../../components/Validation/validateFractionInput';
import validateDecimalInput from '../../components/Validation/validateDecimalInput';
import validateWholeNumberInput from '../Validation/validateWholeNumberInput';

// initialize firebase app
import { getFirestore, updateDoc, setDoc, getDoc, doc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const SnackListModal = ({ 
  date, dispDate, data, snapshot, 
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


  ///////////////////////////////// SUBMIT /////////////////////////////////

  // to change the current snack list
  const submitSnacks = async () => {
    
    // current meal info
    const [month, day, year] = date.split("/");
    const formattedDate = `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    
    // figures out if snack data is empty and should be null
    const isEmpty = JSON.stringify(sortObjectKeys(snackData)) === JSON.stringify(sortObjectKeys([{"amount":"","price":"","name":"","cal":"","unit":""}]));

    // refactored snackData
    const newSnackData = snackData.map((snack) => ({
      ...snack,
      price: (isNaN(snack.price) || snack.price === "")
        ? "0.00"
        : ((new Fractional(snack.price)).numerator / (new Fractional(snack.price)).denominator).toFixed(2),
    }));
    
    // compiled data
    const compiledData = {
      snackData: isEmpty ? null : newSnackData,
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


          <View className="flex flex-col justify-center items-center w-full ml-[-10px] mb-2">

            {/* TOP ROW */}
            <View className="flex flex-row items-center justify-center border-0.5 ml-[20px] mb-2 bg-zinc600">

              {/* Title */}
              <View className="flex justify-center items-center px-1.5 py-1 w-1/2 border-r-0.5 bg-zinc700">
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
              <ScrollView 
                className={`flex flex-col w-full mr-[-40px] z-10 ${(keyboardType === "grid" && isKeyboardOpen) && "max-h-[100px]"}`}
                scrollEnabled={keyboardType === "grid" && isKeyboardOpen}
              >
                  
                {/* Frozen Columns */}
                {snackData?.map((snack, index) =>  
                  <View key={`frozen-${index}`} className="flex flex-row min-h-[30px]">
                  
                    {/* snack */}
                    <View className={`flex-1 flex-row bg-zinc500 border-x-[1px] ${index === 0 && "border-t-[1px]"} ${index === snackData.length - 1 && "border-b-[1px]"} border-zinc700`}>
                      
                      {/* snack names */}
                      <View className="flex items-center justify-center w-1/2 bg-theme600 border-b-0.5 border-r-0.5 border-zinc700 z-10">
                        <View className="flex flex-wrap flex-row">
                          {/* Input */}
                          <TextInput
                            className="text-white font-semibold text-[10px] text-center px-2 pb-1"
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
                          onFocus={() => setKeyboardType("grid")}
                          onBlur={() => setKeyboardType("")}
                          editable={isEditing}
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
                          onFocus={() => setKeyboardType("grid")}
                          onBlur={() => setKeyboardType("")}
                          editable={isEditing}
                        />
                      </View>
                      
                      {/* Details */}
                      <View className="flex flex-col w-1/6 items-center justify-center px-1 bg-white border-b-0.5 border-zinc400">

                        {/* calories */}
                        <View className="flex flex-row w-full space-x-0.5 justify-center items-center bg-white">
                          
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
                            onFocus={() => setKeyboardType("grid")}
                            onBlur={() => setKeyboardType("")}
                            editable={isEditing}
                          />

                          {/* Label */}
                          <Text className="text-[8px] text-center">
                            {"cal"}
                          </Text>
                        </View>

                        {/* price */}
                        <View className="flex flex-row w-full justify-center items-center bg-white">

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
                            onFocus={() => setKeyboardType("grid")}
                            onBlur={() => {
                              setKeyboardType("");
                              setSnackData((prev) => {
                                const updated = [...prev];
                                updated[index] = {
                                  ...updated[index],
                                  price: (new Fractional(snackData[index].price) * 1).toFixed(2)
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
                      {isEditing &&
                      <Icon
                        name="close"
                        size={15}
                        color={colors.zinc600}
                        onPress={() => deleteSnack(index)}
                      />
                      }
                    </View>
                  </View>
                )}
              </ScrollView>
            }

            {/* Add Another Snack Row */}
            {isEditing &&
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
            }
          </View>
                        

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