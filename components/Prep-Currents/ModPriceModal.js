///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect } from 'react';

// UI components
import { Modal, View, Text, TextInput } from 'react-native';

// visual effects
import colors from '../../assets/colors';
import Icon from 'react-native-vector-icons/Ionicons';

// fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

// validation
import validateFractionInput from '../Validation/validateFractionInput';
import extractUnit from '../Validation/extractUnit';


///////////////////////////////// SIGNATURE /////////////////////////////////

const ModPriceModal = ({ 
  modalVisible, setModalVisible, closeModal, currentPrice, currentData, currentStore,
}) => {


  ///////////////////////////////// ON OPEN /////////////////////////////////

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");

  const [containerCost, setContainerCost] = useState("");
  const [amount, setAmount] = useState("");
  const [unitPrice, setUnitPrice] = useState("0.00");

  // to load in the data
  useEffect(() => {

    if (modalVisible) {
      
      // using given data
      setContainerCost(currentData.containerPrice);
      setName(currentData.ingredientName);
      setUnit(currentData.ingredientData[currentStore].unit);

      // if completely custom
      if (currentData.ingredientData[currentStore].totalYield === undefined) {
        setUnitPrice(currentPrice);
        setAmount((currentPrice === "0.00" || currentPrice === "0.0000") ? "0" : (new Fractional(currentData.containerPrice)).divide(new Fractional(currentPrice)).toString() || "0");

      // if ingredient
      } else {
        setAmount(currentData.ingredientData[currentStore].totalYield || "0");
        setUnitPrice(((new Fractional(currentData.containerPrice)).divide(new Fractional(currentData.ingredientData[currentStore].totalYield))).toString());
      }
    }
  }, [modalVisible]);


  ///////////////////////////////// UPDATES /////////////////////////////////

  // when the containerCost and amount are changed, update the unitPrice
  useEffect(() => {
    if (containerCost !== "" && amount !== "") {
      const newPrice = isNaN(new Fractional(containerCost).divide(new Fractional(amount)).denominator) || new Fractional(containerCost).divide(new Fractional(amount)).denominator === 0 ? 0 : new Fraction((new Fractional(containerCost)).divide(new Fractional(amount)).toString()) * 1;
      setUnitPrice(newPrice >= 0.01 ? newPrice.toFixed(2) : newPrice.toFixed(4));
    } else {
      setUnitPrice(currentPrice);
    }
  }, [containerCost, amount]);


  ///////////////////////////////// ON CLOSE /////////////////////////////////

  const [containerCostValid, setContainerCostValid] = useState(true);
  const [amountValid, setAmountValid] = useState(true);


  // to submit the modal
  const submitModal = async () => {

    // for the modals
    setContainerCostValid(containerCost !== "");
    setAmountValid(amount !== "");

    // if valid
    if (containerCost !== "" && amount !== "") {
      closeModal(unitPrice, isNaN(new Fractional(containerCost).numerator / new Fractional(containerCost).denominator) ? "0.00" : (new Fractional(containerCost).numerator / new Fractional(containerCost).denominator).toFixed(2));
      exitModal();
    }
  };


  // to close the modal
  const exitModal = () => {
    setModalVisible(false);

    // restore states
    setContainerCostValid(true);
    setAmountValid(true);
    setContainerCost("");
    setAmount("");
    setUnitPrice("0.00");
  };


  ///////////////////////////////// HTML /////////////////////////////////
  
  return (

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
        <View className="w-4/5 bg-zinc200 px-7 py-5 rounded-2xl mb-[100px]">

          {/* Current Name */}
          <Text className="text-[18px] font-bold text-center py-1">{name}</Text>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-5"/>

          {/* CURRENT PRICE */}
          <View className="flex flex-row w-full justify-center mb-4">
            <View className="flex flex-row w-11/12 justify-center items-center bg-zinc350 border-2 border-zinc400 rounded-full">
              <Text className="px-2 py-1 italic font-semibold">Calculated Unit Price</Text>

              {/* $ or ¢ display */}
              {((new Fraction(unitPrice)).toString() * 1) >= 0.01 || unitPrice === "0.00" || unitPrice === "" || unitPrice === undefined || unitPrice === "0.0000"
              ?
                <Text className="p-1 italic">{"$"}{((new Fraction(unitPrice)).toString() * 1).toFixed(2)}</Text>
              :
                <Text className="p-1 italic">{((new Fraction(unitPrice)).toString() * 100).toFixed(2)}{"¢"}</Text>
              }
            </View>
          </View>

          {/* COST */}
          <View className="flex flex-row justify-between items-center mb-1 py-1">

            {/* Label */}
            <Text className="text-theme700 font-medium mr-4">
              CONTAINER COST
            </Text>

            <View className="flex-1 flex-row py-1 justify-center items-center border-[1px] border-zinc350 bg-theme100">
              {/* Dollar Sign */}
              <Text className={`${containerCost === "" ? "text-zinc500" : "text-black"} text-[14px] leading-[17px]`}>
                $
              </Text>
              {/* Text Input */}
              <TextInput
                className="text-center text-[14px] leading-[17px]"
                placeholder="0.00"
                placeholderTextColor={colors.zinc500}
                value={containerCost}
                onChangeText={(value) => setContainerCost(value)}
              />
            </View>
          </View>
          
          {/* AMOUNT */}
          <View className="flex flex-row justify-between items-center mb-4">
      
            {/* Label */}
            <Text className="text-theme700 font-medium mr-4">
              AMOUNT
            </Text>
            
            <View className="flex-1 flex-row py-1 space-x-2 justify-center items-center border-[1px] border-zinc350 bg-theme100">
              {/* Text Input */}
              <TextInput
                className="bg-theme100 text-[14px] leading-[17px]"
                placeholder="0 0/0"
                placeholderTextColor={colors.zinc500}
                value={amount}
                onChangeText={(value) => setAmount(validateFractionInput(value))}
              />
              {/* Unit */}
              <Text className={`${amount === "" ? "text-zinc500" : "text-black"} text-[14px] leading-[17px]`}>
                {extractUnit(unit, amount)}
              </Text>
            </View>
          </View>


          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>
            
          {/* BOTTOM ROW */}
          <View className="flex flex-row items-center justify-between">
            
            {/* Warnings */}
            <View className="flex flex-col">
              {!containerCostValid && 
                <Text className="text-mauve600 italic">
                  container cost is required
                </Text>
              }
              {!amountValid && 
                <Text className="text-mauve600 italic">
                  container amount is required
                </Text>
              }
            </View>

            {/* BUTTONS */}
            <View className="flex flex-row justify-center items-center ml-auto">

              {/* Check */}
              <Icon 
                size={24}
                color="black"
                name="checkmark"
                onPress={submitModal}
              />

              {/* X */}
              <Icon 
                size={24}
                color="black"
                name="close-outline"
                onPress={exitModal}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ModPriceModal;