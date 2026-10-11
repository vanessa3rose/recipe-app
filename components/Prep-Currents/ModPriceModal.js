///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect } from 'react';

// UI components
import { Modal, View, Text, TextInput } from 'react-native';

// visual effects
import colors from '../../assets/colors';
import Icon from 'react-native-vector-icons/Ionicons';

// fractions
import Fraction from 'fraction.js';

// validation
import isFraction from '../../components/Validation/isFraction';
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
  const [ogAmount, setOgAmount] = useState("");
  const [unitPrice, setUnitPrice] = useState("0.00");

  // to load in the data
  useEffect(() => {
    if (modalVisible && currentData) {
      const storeData = currentData?.ingredientData?.[currentStore] || {};
      
      // using given data
      setContainerCost(currentData.containerPrice);
      setName(currentData.ingredientName);
      setUnit(storeData.unit);
      
      // raw data
      const rawContainerPrice = currentData.containerPrice;
      const rawTotalYield = storeData.totalYield;

      // if completely custom
      if (rawTotalYield === undefined) {
        setUnitPrice(currentPrice);

        // validation
        const isPriceValid = isFraction(currentPrice) && new Fraction(currentPrice).valueOf() !== 0;
        const isCostValid = isFraction(rawContainerPrice);

        if (isPriceValid && isCostValid) {
          setAmount(new Fraction(rawContainerPrice).div(new Fraction(currentPrice)).toFraction(true));
          setOgAmount(new Fraction(rawContainerPrice).div(new Fraction(currentPrice)).toFraction(true));
        } else {
          setAmount("0");
          setOgAmount("0");
        }

      // if ingredient
      } else {
        setAmount(rawTotalYield || "0");
        setOgAmount(rawTotalYield || "0");

        // validation
        const isYieldValid = isFraction(rawTotalYield) && new Fraction(rawTotalYield).valueOf() !== 0;
        const isCostValid = isFraction(rawContainerPrice);
        
        if (isYieldValid && isCostValid) {
          setUnitPrice(new Fraction(rawContainerPrice).div(new Fraction(rawTotalYield)).toFraction(true));
        } else {
          setUnitPrice("0.00");
        }
      }
    }
  }, [modalVisible]);


  ///////////////////////////////// UPDATES /////////////////////////////////

  // when the containerCost and amount are changed, update the unitPrice
  useEffect(() => {
    if (isFraction(containerCost) && isFraction(amount)) {
      if (new Fraction(amount.trim()).valueOf() === 0) { setUnitPrice("0.00"); }
      else {
        const newPrice = new Fraction(containerCost.trim()).div(new Fraction(amount.trim())).valueOf();
        setUnitPrice(newPrice >= 0.01 ? newPrice.toFixed(2) : newPrice.toFixed(4));
      }
    } else {
      setUnitPrice(currentPrice || "0.00");
    }
  }, [containerCost, amount, currentPrice]);


  ///////////////////////////////// ON CLOSE /////////////////////////////////


  // to submit the modal
  const submitModal = async () => {
    // chop of last two digits if 00
    closeModal(unitPrice.replace(/(\.\d{2})00$/, "$1"), new Fraction(containerCost).valueOf().toFixed(2));
    exitModal();
  };


  // to close the modal
  const exitModal = () => {
    setModalVisible(false);

    // restore states
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
              <Text className="p-1 italic">
                {isFraction(unitPrice) && new Fraction(unitPrice).valueOf() < 0.01 && new Fraction(unitPrice).valueOf() > 0
                  ? `${(new Fraction(unitPrice).valueOf() * 100).toFixed(2)}¢`
                  : `$${isFraction(unitPrice) ? new Fraction(unitPrice).valueOf().toFixed(2) : "0.00"}`
                }
              </Text>
            </View>
          </View>

          {/* COST */}
          <View className="flex flex-row justify-between items-center mb-1 py-1">

            {/* Label */}
            <Text className="text-theme700 font-medium mr-4">
              CONTAINER COST
            </Text>

            <View className="flex-1 flex-row p-1 justify-center items-center border-[1px] border-zinc350 bg-theme100">
              {/* Dummy $ */}
              <TextInput
                className="flex-auto text-right text-[14px] leading-[17px]"
                placeholder="$"
                placeholderTextColor={(containerCost === "") ? colors.zinc400 : "black"}
                editable={false}
              />
              {/* Text Input */}
              <TextInput
                className="flex-auto text-left text-[14px] leading-[17px]"
                placeholder={currentData?.containerPrice || "0.00"}
                placeholderTextColor={colors.zinc400}
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
            
            <View className="flex-1 flex-row p-1 space-x-1.5 justify-center items-center border-[1px] border-zinc350 bg-theme100">
              {/* Text Input */}
              <TextInput
                className="flex-auto text-right text-[14px] leading-[17px]"
                placeholder={ogAmount || "0 0/0"}
                placeholderTextColor={colors.zinc400}
                value={amount}
                onChangeText={(value) => setAmount(validateFractionInput(value))}
              />
              {/* Dummy Unit */}
              <TextInput
                className="flex-auto text-left w-fit text-[14px] leading-[17px]"
                placeholder={extractUnit(unit, amount)}
                placeholderTextColor="black"
                editable={false}
              />
            </View>
          </View>


          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>
            
          {/* BOTTOM ROW */}
          <View className="flex flex-row items-center justify-between">

            {/* BUTTONS */}
            <View className="flex flex-row w-full justify-between items-center">
              {/* Reset */}
              {!(containerCost === "0.00" && amount === "0") && (
                <Icon 
                  size={20}
                  color="black"
                  name="ban-outline"
                  onPress={() => {
                    setContainerCost("0.00");
                    setAmount("0");
                  }}
                />
              )}

              <View className="flex flex-row justify-center items-center ml-auto">
                {/* Check */}
                {(isFraction(containerCost) && isFraction(amount)) && (
                  <Icon 
                    size={24}
                    color="black"
                    name="checkmark"
                    onPress={submitModal}
                  />
                )}
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
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ModPriceModal;