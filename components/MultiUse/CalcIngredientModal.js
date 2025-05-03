///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';

import colors from '../../assets/colors';
import Icon from 'react-native-vector-icons/Ionicons';

// Fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

import validateDecimalInput from '../Validation/validateDecimalInput';
import validateWholeNumberInput from '../Validation/validateWholeNumberInput';
import validateFractionInput from '../Validation/validateFractionInput';

import extractUnit from '../Validation/extractUnit';


///////////////////////////////// SIGNATURE /////////////////////////////////

const CalcIngredientModal = ({ 
  modalVisible, setModalVisible, submitModal, ingredientData, ingredientStore,
  initialCals, initialPrice, initialServings, initialAmount, 
  amountUsed, amountContainer, servingSize
}) => {


  ///////////////////////////////// ON OPEN /////////////////////////////////

  const [calContainer, setCalContainer] = useState("");
  const [priceContainer, setPriceContainer] = useState("");
  const [totalYield, setTotalYield] = useState("");

  const [numContainers, setNumContainers] = useState(0);

  // populates data on open
  useEffect(() => {
    if (modalVisible) {

      // set initial amounts
      setGoalCals(initialCals);
      setGoalPrice(initialPrice);
      setCalcAmount(initialAmount || 0);

      // if the amountUsed is given (NOT recipes)
      if (amountUsed === null) {
        setTotalYield(amountContainer);
        setGoalServings(initialServings);
        
      // otherwise, find the initial data that will make remaining nonnegative
      } else {
        let count = 0;
        let remaining = 0;
        
        while (new Fraction(remaining) * 1 <= 0) {
          count = count + 1;
          remaining = ((new Fractional(count)).multiply(new Fractional(amountContainer)).subtract(new Fractional(amountUsed))).toString();
        }  
        
        setNumContainers(count);
        setTotalYield(remaining);
        setGoalServings(initialAmount === "" ? "0.00" : (((new Fractional(remaining)).divide(new Fractional(initialAmount))).numerator / ((new Fractional(remaining)).divide(new Fractional(initialAmount))).denominator).toFixed(2));
      }


      // stores the calculation data (not meal prep)
      if (initialServings !== null) {
        
        // closes modal immediately if invalid data
        if (ingredientData[`${ingredientStore}Brand`] === "" || ingredientData[`${ingredientStore}Unit`] === ""
            || (ingredientData[`${ingredientStore}CalContainer`] === "" && ingredientData[`${ingredientStore}PriceContainer`] === "" && ingredientData[`${ingredientStore}TotalYield`] === "") ) {
          setModalVisible(false);
        
        } else {
          setCalContainer(ingredientData[`${ingredientStore}CalContainer`] === "" ? 0 : new Fraction(ingredientData[`${ingredientStore}CalContainer`]) * 1);
          setPriceContainer(ingredientData[`${ingredientStore}PriceContainer`] === "" ? 0 : new Fraction (ingredientData[`${ingredientStore}PriceContainer`]) * 1); 
        }

      // stores the calculation data (meal prep)
      } else {
        setCalContainer(new Fraction (ingredientData.ingredientData[`${ingredientStore}CalServing`]) * amountContainer / servingSize);
        setPriceContainer(new Fraction (ingredientData.unitPrice) * amountContainer / servingSize);
      }
    }
  }, [modalVisible])


  ///////////////////////////////// INPUTS /////////////////////////////////

  const [goalCals, setGoalCals] = useState(0);
  const [goalPrice, setGoalPrice] = useState(0);
  const [goalServings, setGoalServings] = useState(0);
  const [calcAmount, setCalcAmount] = useState(0);

  // changing the total yield used in calculations
  const updateTotalYield = (total) => {
    if (total !== "") {
      
      // stores the total yield
      setTotalYield(total);

      // if yield is valid, update the servings
      if (!isNaN(new Fractional(total).denominator) && !isNaN(new Fractional(total).numerator)) {
        const frac = new Fractional(total).numerator / new Fractional(total).denominator;
        
        if (frac / (new Fraction(calcAmount) * 1)) { 
          setGoalServings((frac / (new Fraction(calcAmount) * 1)) === Infinity ? "" : (frac / (new Fraction(calcAmount) * 1)).toFixed(2)); 
        } 
      }

    // storing default values if empty
    } else {
      setCalcAmount(0);
      setTotalYield(0);
      setGoalCals("");
      setGoalPrice("");
      setGoalServings("");
    }
  }


  // general function to calculate the amount (in fraction form with a denominator <= 100)
  const calcAmountFraction = (frac) => {
    if (totalYield !== 0 && frac !== 0) {
      const total = new Fractional(totalYield).numerator / new Fractional(totalYield).denominator;
      const improper = new Fraction(total / frac).simplify(1 / 100);   
      const mixed = new Fractional(improper.toFraction()).toString();
      setCalcAmount(mixed);
    }
  }


  // when the cal textinput is changed
  const updateGoalCals = (cals) => {
    if (cals !== "") {
      
      // stores the calories and calculates the # servings
      setGoalCals(cals);
      const frac = calContainer / (new Fraction(cals) * 1);
      const fracAlt = 
        (new Fractional(calContainer).divide(new Fractional(cals))).multiply(new Fractional(totalYield).divide(new Fractional(amountContainer))).numerator
        / (new Fractional(calContainer).divide(new Fractional(cals))).multiply(new Fractional(totalYield).divide(new Fractional(amountContainer))).denominator;

      // if # servings is valid, calculate other 3 data points
      if (!isNaN(frac)) {
        calcAmountFraction(isNaN(amountUsed === null ? frac : fracAlt) ? 0 : (amountUsed === null ? frac : fracAlt));
        setGoalPrice((priceContainer / frac).toFixed(2));
        setGoalServings(isNaN(amountUsed === null ? frac : fracAlt) ? "0.00" : (amountUsed === null ? frac : fracAlt).toFixed(2));
      }

    // storing default values if empty
    } else {
      setCalcAmount(0);
      setGoalCals("");
      setGoalPrice("");
      setGoalServings("");
    }
  }


  // when the price textinput is changed
  const updateGoalPrice = (price) => {
    if (price !== "") {

      // stores the calories and calculates the # servings
      setGoalPrice(price);
      
      const frac = priceContainer / (new Fraction(price) * 1);
      const fracAlt = 
        (new Fractional(priceContainer).divide(new Fractional(price))).multiply(new Fractional(totalYield).divide(new Fractional(amountContainer))).numerator
        / (new Fractional(priceContainer).divide(new Fractional(price))).multiply(new Fractional(totalYield).divide(new Fractional(amountContainer))).denominator;

      // if # servings is valid, calculate other 3 data points
      if (!isNaN(frac)) {
        calcAmountFraction(isNaN(amountUsed === null ? frac : fracAlt) ? 0 : (amountUsed === null ? frac : fracAlt));
        setGoalCals((calContainer / frac).toFixed(0));
        setGoalServings(isNaN(amountUsed === null ? frac : fracAlt) ? "0.00" : (amountUsed === null ? frac : fracAlt).toFixed(2));
      }

    // storing default values if empty
    } else {
      setCalcAmount(0);
      setGoalCals("");
      setGoalPrice("");
      setGoalServings("");
    }
  }


  // when the goal textinput is changed
  const updateGoalServings = (serving) => {
    if (serving !== "") {

      // stores the calories and calculates the # servings
      setGoalServings(serving);
      
      const frac = (new Fraction(serving) * 1);
      const ratio = (new Fractional(totalYield)).divide(new Fractional(amountContainer)).numerator / (new Fractional(totalYield)).divide(new Fractional(amountContainer)).denominator;
      
      // if # servings is valid, calculate other 3 data points
      if (!isNaN(frac)) {
        calcAmountFraction(frac);
        setGoalCals(((calContainer / frac) * ratio).toFixed(0));
        setGoalPrice(((priceContainer / frac) * ratio).toFixed(2));
      }

    // storing default values if empty
    } else {
      setCalcAmount(0);
      setGoalCals("");
      setGoalPrice("");
      setGoalServings("");
    }
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
        <View className={`w-5/6 bg-zinc200 p-7 rounded-2xl ${amountUsed === null || amountUsed === "0" ? "mb-14" : ""}`}>

          {/* Current Name */}
          <Text className="text-[16px] font-bold text-center py-1">
            {initialServings !== null ? ingredientData?.ingredientName : ingredientData?.ingredientData?.ingredientName}
          </Text>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-5"/>

          {/* TOTAL YIELD */}
          <View className="flex w-full justify-center items-center mb-3 px-3">
            <View className="flex flex-row w-11/12 border-[1px] border-zinc400">
              
              {/* text */}
              <View className="flex w-3/5 justify-center items-center py-1 bg-theme200">
                <Text className="text-[14px] text-zinc700 italic font-medium">
                  TOTAL YIELD
                </Text>
              </View>

              {/* Amount Section */}
              <View className="flex flex-row w-2/5 justify-center items-center bg-theme100">
                {/* calculated amount and unit */}
                <TextInput
                  className="text-center text-[14px] leading-[16px]"
                  placeholder="0 0/0"
                  placeholderTextColor={colors.zinc500}
                  value={totalYield}
                  onChangeText={(value) => updateTotalYield(validateFractionInput(value))}
                />
              </View>
            </View>
          </View>

          {/* CALCULATION */}
          <View className="flex flex-col w-full justify-center items-center px-3">
            
            {/* text */}
            <View className="flex w-11/12 justify-center items-center py-1 px-1 bg-zinc100 border-[1px] border-zinc400">
              <Text className="text-[14px] text-theme700 italic font-medium">
                CALCULATED AMOUNT TO USE:
              </Text>
            </View>

            {/* Amount Section */}
            <View className="flex flex-row w-11/12 justify-center items-center bg-zinc350 border-b-[1px] border-x-[1px] border-zinc400">
              {/* calculated amount and unit*/}
              <Text className="px-2 py-1 text-center">
                {calcAmount} {initialServings !== null ? extractUnit(ingredientData[`${ingredientStore}Unit`], calcAmount) : extractUnit(ingredientData.ingredientData[`${ingredientStore}Unit`], calcAmount)}
              </Text>
              {/* button to submit */}
              <View className="absolute flex right-0.5">
                <Icon
                  name="arrow-redo-circle"
                  size={24}
                  color={colors.theme800}
                  onPress={() => submitModal(calcAmount)}
                />
              </View>
            </View>
          </View>


          {/* Divider */}
          <View className="h-[1px] bg-zinc400 my-6"/>


          {/* INPUTS */}
          <View className="flex flex-col space-y-3 justify-center items-center mb-2 px-3">

            {/* text */}
            <View className="flex w-full justify-center items-center bg-white border-2 border-zinc300 py-0.5">
              <Text className="text-[14px] text-zinc600 italic font-medium">
                GOAL AMOUNTS:
              </Text>
            </View>

            <View className="flex flex-row w-full justify-center items-center space-x-2">

              {/* Calories - IF CONTAINER CAL ISN'T 0 */}
              {calContainer !== 0 &&
                <View className={`flex flex-col ${priceContainer === 0 ? "w-1/2" : "w-1/3"} justify-center items-center space-y-1`}>
                  {/* label */}
                  <Text className="text-[14px] text-theme700 font-semibold">
                    CALORIES
                  </Text>
                  {/* user input */}
                  <View className="flex w-full py-1 justify-center items-center border-[1px] border-zinc400 bg-theme200">
                    <TextInput
                      className="text-center text-[14px] leading-[16px]"
                      placeholder="0"
                      placeholderTextColor={colors.zinc500}
                      value={goalCals}
                      onChangeText={(value) => updateGoalCals(validateWholeNumberInput(value))}
                    />
                  </View>
                </View>
              }

              {/* Cost - IF CONTAINER COST ISN'T 0 */}
              {priceContainer !== 0 &&
                <View className={`flex flex-col ${calContainer === 0 ? "w-1/2" : "w-1/3"} justify-center items-center space-y-1`}>
                  {/* label */}
                  <Text className="text-[14px] text-theme700 font-semibold">
                    COST
                  </Text>
                  {/* user input */}
                  <View className="flex flex-row w-full py-1 justify-center items-center border-[1px] border-zinc400 bg-theme200">
                    <Text className={`${goalPrice === 0 || goalPrice === "" ? "text-zinc500" : "text-black"}`}>
                      $
                    </Text>
                    <TextInput
                      className="text-center text-[14px] leading-[16px]"
                      placeholder="0.00"
                      placeholderTextColor={colors.zinc500}
                      value={goalPrice}
                      onChangeText={(value) => updateGoalPrice(validateDecimalInput(value))}
                    />
                  </View>
                </View>
              }

              {/* Servings */}
              <View className={`flex flex-col ${(calContainer === 0 && priceContainer === 0) ? "w-full" : calContainer === 0 || priceContainer === 0 ? "w-1/2" : "w-1/3"} justify-center items-center space-y-1`}>
                {/* label */}
                <Text className="text-[14px] text-theme700 font-semibold">
                  SERVINGS
                </Text>
                {/* user input */}
                <View className="flex w-full py-1 justify-center items-center border-[1px] border-zinc400 bg-theme200">
                  <TextInput
                    className="text-center text-[14px] leading-[16px]"
                    placeholder="0.00"
                    placeholderTextColor={colors.zinc500}
                    value={goalServings}
                    onChangeText={(value) => updateGoalServings(validateDecimalInput(value))}
                  />
                </View>
              </View>
            </View>
          </View>

          
          {/* CONTAINER SECTION */}
          {amountUsed !== null && amountUsed !== "0" && 
          <>
            {/* Divider */}
            <View className="h-[1px] bg-zinc400 mt-4 mb-6"/>

            {/* GENERAL AMOUNTS */}
            <View className="flex flex-row w-full justify-center items-center px-3">
              {/* headers */}
              <View className="flex flex-col justify-center items-center py-1 space-y-1">
                <Text className="w-full py-1 px-2 text-right text-[12px] font-medium text-theme800 bg-zinc300 border-l-[1px] border-y-[1px] border-zinc350">
                  AMOUNT IN OTHER SELECTED RECIPES
                </Text>
                <Text className="w-full py-1 px-2 text-right text-[12px] font-medium text-theme800 bg-zinc300 border-l-[1px] border-y-[1px] border-zinc350">
                  AMOUNT PER CONTAINER
                </Text>
              </View>
              {/* amounts */}
              <View className="flex flex-col justify-center items-center py-1 space-y-1">
                <Text className="w-full font-medium text-theme700 bg-zinc100 py-1 px-2 text-center text-[12px] border-r-[1px] border-y-[1px] border-zinc350">
                  {amountUsed}
                </Text>
                <Text className="w-full font-medium text-theme700 bg-zinc100 py-1 px-2 text-center text-[12px] border-r-[1px] border-y-[1px] border-zinc350">
                  {amountContainer}
                </Text>
              </View>
            </View>

            {/* CONTAINER AMOUNTS */}
            <View className="flex flex-row justify-center items-center mt-3 space-x-4">

              <View className="flex flex-row bg-zinc100 justify-center items-center border-[1px] border-zinc400">
                {/* Num Containers -- Buttons */}
                <View className="flex flex-col space-y-[-4px] bg-theme200 border-r-[1px] border-theme300 px-1 py-2">
                  <Icon
                    name="add"
                    size={14}
                    color="black"
                    onPress={() => setNumContainers(numContainers + 1)}
                  />
                  <Icon
                    name="remove"
                    size={14}
                    color="black"
                    onPress={() => setNumContainers(numContainers !== 0 ? numContainers - 1 : numContainers)}
                  />
                </View>

                {/* Num Containers */}
                <Text className="py-2 px-2 text-[14px] text-black">
                  {numContainers} {numContainers === 1 ? "CONTAINER" : "CONTAINERS"}
                </Text>
              </View>

              {/* CALCULATED DETAILS */}
              <View className="flex flex-row bg-theme100 border-[1px] border-zinc400">
                {/* headers */}
                <View className="flex flex-col justify-center items-end bg-theme200 px-2 py-1">
                <View className="flex flex-row">
                  <Icon
                    name="checkmark"
                    size={14}
                    onPress={() => updateTotalYield(((new Fractional(numContainers)).multiply(new Fractional(amountContainer)).subtract(new Fractional(amountUsed))).toString())}
                  />
                  <Text className="text-[13px] text-zinc700 italic font-medium">
                    OVERALL
                  </Text>
                </View>
                  <Text className="text-[13px] text-zinc700 italic font-medium">
                    REMAINING
                  </Text>
                </View>
                {/* amounts */}
                <View className="flex flex-col justify-center items-center px-2 py-1">
                  <Text className="text-[13px] text-zinc800">
                    {(new Fractional(numContainers)).multiply(new Fractional(amountContainer)).toString()}
                  </Text>
                  <Text className="text-[13px] text-zinc800">
                    {((new Fractional(numContainers)).multiply(new Fractional(amountContainer)).subtract(new Fractional(amountUsed))).toString()}
                  </Text>
                </View>
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

export default CalcIngredientModal;