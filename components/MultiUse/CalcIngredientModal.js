///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect } from 'react';

// UI components
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// fractions
import Fraction from 'fraction.js';

// validation
import isFraction from '../Validation/isFraction';
import validateDecimalInput from '../Validation/validateDecimalInput';
import validateWholeNumberInput from '../Validation/validateWholeNumberInput';
import validateFractionInput from '../Validation/validateFractionInput';
import extractUnit from '../Validation/extractUnit';
import { numberToRoman } from '../Validation/numberToRoman';


///////////////////////////////// SIGNATURE /////////////////////////////////

const CalcIngredientModal = ({ 
  type, modalVisible, setModalVisible, submitModal, 
  ingredientData, ingredientName, ingredientStore,
  initialCals, initialPrice, initialServings, initialAmount, 
  totalAmountUsed, amountsUsed, othersUsed, selectedUsed, 
  altPrepVariants,
  amountContainer, servingSize
}) => {


  ///////////////////////////////// ON OPEN /////////////////////////////////

  const [calContainer, setCalContainer] = useState("");
  const [priceContainer, setPriceContainer] = useState("");
  const [totalYield, setTotalYield] = useState("");

  const [numContainers, setNumContainers] = useState(1);

  // populates data on open
  useEffect(() => {
    if (modalVisible) {
      
      // set initial amounts
      setGoalCals(initialCals);
      setGoalPrice(initialPrice);
      setCalcAmount(initialAmount || 0);

      // helper checks for amountContainer
      const validContainer = isFraction(amountContainer) && new Fraction(amountContainer).valueOf() > 0;
      const parsedContainer = validContainer ? new Fraction(amountContainer) : new Fraction(0);
      const parsedUsed = isFraction(totalAmountUsed) ? new Fraction(totalAmountUsed) : new Fraction(0);
      
      // if the type is recipe
      if (type === "recipe") {
        setTotalYield(validContainer ? parsedContainer.toFraction(true) : "0");
        setGoalServings(initialServings || "0.00");
        
      // otherwise, find the initial data that will make remaining nonnegative
      } else {
        let count = 0;
        let remaining = new Fraction(0);
        
        while (parsedContainer.valueOf() > 0 && remaining.valueOf() <= 0) {
          count = count + 1;
          remaining = new Fraction(count).mul(parsedContainer).sub(parsedUsed);
        }  
        
        const validInitialAmt = isFraction(initialAmount) && new Fraction(initialAmount).valueOf() > 0;
        setNumContainers(count);
        setTotalYield(validContainer ? remaining.simplify(0.001).toFraction(true) : "0");
        setGoalServings(validInitialAmt ? remaining.div(new Fraction(initialAmount)).valueOf().toFixed(2) : "0.00");
      }

      // extracts the store object
      const data = (initialServings !== null) ? ingredientData : ingredientData?.ingredientData;
      const storeObj = data?.[ingredientStore] || data?.["-"] || data || {};
      
      // stores the calculation data (not meal prep)
      if (initialServings !== null) {
        
        // closes modal immediately if invalid data
        const isBrandEmpty = !storeObj.brand || storeObj.brand === "";
        const isUnitEmpty = !storeObj.unit || storeObj.unit === "";
        const areCalPriceYieldEmpty = storeObj.calContainer === "" && storeObj.priceContainer === "" && storeObj.totalYield === "";
        if (isBrandEmpty || isUnitEmpty || areCalPriceYieldEmpty) {
          setModalVisible(false);
        // valid data
        } else {
          setCalContainer(isFraction(storeObj.calContainer) ? new Fraction(storeObj.calContainer).valueOf() : 0);
          setPriceContainer(isFraction(storeObj.priceContainer) ? new Fraction(storeObj.priceContainer).valueOf() : 0); 
        }

      // stores the calculation data (meal prep)
      } else {
        const hasValidServing = isFraction(servingSize) && new Fraction(servingSize).valueOf() !== 0;
        const hasValidCalServing = isFraction(storeObj.calServing);
        
        // gets the valid fraction value of amountContainer
        const validAmount = (isFraction(amountContainer) && new Fraction(amountContainer).valueOf() !== 0) ? new Fraction(amountContainer) : new Fraction(1);

        // calculate calories
        if (hasValidServing && hasValidCalServing) { setCalContainer((new Fraction(storeObj.calServing).mul(validAmount).div(new Fraction(servingSize))).valueOf()); } 
        else { setCalContainer(0); }

        // calculate price
        if (isFraction(data?.unitPrice)) { setPriceContainer(new Fraction(data?.unitPrice).mul(validAmount).valueOf()); } 
        else { setPriceContainer(0); }
      }
    }
  }, [modalVisible])


  ///////////////////////////////// CHOOSING OTHERS /////////////////////////////////

  const [totalAmount, setTotalAmount] = useState(0);

  const [isOtherCounted, setIsCounted] = useState(null);
  const [totalOtherAmount, setTotalOtherAmount] = useState(0);

  // when othersUsed is populated (on open), select others to be true
  useEffect(() => {
    if (othersUsed) {
      setIsCounted(Array(othersUsed.length).fill(true));
    }
  }, [othersUsed])

  const [isAltCounted, setIsAltCounted] = useState(null);
  const [altAmountsUsed, setAltAmountsUsed] = useState(null);
  const [totalAltAmount, setTotalAltAmount] = useState(0);
  
  // when prepVariants is given (on open), select others to be true
  useEffect(() => {
    if (altPrepVariants?.length > 0) {

      // gets the largest variant number
      const maxVariant = Math.max(...altPrepVariants.map(alt => alt.variant));
      let amounts = Array(maxVariant).fill("0");

      // gets the totals for each
      altPrepVariants.forEach(({ amount, mult, variant }) => {
        if (variant > 0 && isFraction(amount) && isFraction(mult)) {
          amounts[variant - 1] = new Fraction(amount).mul(new Fraction(mult)).toFraction(true);
        }
      });
      
      // stores data locally
      setAltAmountsUsed(amounts);
      setIsAltCounted(Array(amounts.length).fill(false).map((alt, index) => amounts[index] !== "0" ? true : false));
    }
  }, [altPrepVariants])

  // when toggling an other's or an alt variant's checkbox
  useEffect(() => {
    if (Array.isArray(isOtherCounted)) {
      let total = new Fraction(0);
      let totalOther = new Fraction(0);
      let totalAlt = new Fraction(0);
      
      // resums total - others
      isOtherCounted.forEach((counted, index) => { 
        if (counted) { 
          total = total.add(isFraction(amountsUsed[index]) ? new Fraction(amountsUsed[index]) : new Fraction(0));
          totalOther = totalOther.add(isFraction(amountsUsed[index]) ? new Fraction(amountsUsed[index]) : new Fraction(0));
        }
      })

      // resums total - alt
      if (altAmountsUsed !== null && Array.isArray(isAltCounted)) {
        isAltCounted.forEach((counted, index) => {
          if (counted) { 
            total = total.add(isFraction(altAmountsUsed[index]) ? new Fraction(altAmountsUsed[index]) : new Fraction(0));
            totalAlt = totalAlt.add(isFraction(altAmountsUsed[index]) ? new Fraction(altAmountsUsed[index]) : new Fraction(0));
          }
        })
      }
      
      setTotalAmount(total.toFraction(true));
      setTotalOtherAmount(totalOther.toFraction(true));
      setTotalAltAmount(totalAlt.toFraction(true));
    }
  }, [isOtherCounted, isAltCounted])


  ///////////////////////////////// INPUTS /////////////////////////////////

  const [goalCals, setGoalCals] = useState(0);
  const [goalPrice, setGoalPrice] = useState(0);
  const [goalServings, setGoalServings] = useState(0);
  const [calcAmount, setCalcAmount] = useState(0);

  // changing the total yield used in calculations
  const updateTotalYield = (total) => {
    if (isFraction(total)) {

      // stores the total yield
      setTotalYield(new Fraction(total).simplify(0.001).toFraction(true));
      
      // if yield is valid, update the servings
      if (isFraction(calcAmount) && new Fraction(calcAmount).valueOf() !== 0) {
        const servings = new Fraction(total).div(new Fraction(calcAmount)).valueOf();
        setGoalServings(isFinite(servings) ? servings.toFixed(2) : "");
      } else {
        setGoalServings("");
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
    const hasValidYield = isFraction(totalYield) && new Fraction(totalYield).valueOf() !== 0;
    const hasValidFrac = isFraction(frac) && new Fraction(frac).valueOf() !== 0;

    if (hasValidYield && hasValidFrac) {
      setCalcAmount(new Fraction(totalYield).div(new Fraction(frac)).simplify(0.001).toFraction(true));
    } else if (!hasValidYield && (amountContainer === 0 || (isFraction(amountContainer) && new Fraction(amountContainer).valueOf() === 0)) && hasValidFrac) {
      setCalcAmount(new Fraction(frac).simplify(0.001).toFraction(true));
    }
  }

  // when the cal textinput is changed
  const updateGoalCals = (cals) => {
    if (isFraction(cals) && new Fraction(cals).valueOf() !== 0) {
      setGoalCals(cals);
      
      // calculates the # servings
      const validCalContainer = isFraction(calContainer) && new Fraction(calContainer).valueOf() > 0;
      const frac = validCalContainer ? new Fraction(calContainer).div(new Fraction(cals)).valueOf() : 0;
      
      let fracAlt = 0;
      if (validCalContainer) {
        if (amountContainer === 0 || (isFraction(amountContainer) && new Fraction(amountContainer).valueOf() === 0)) {
          fracAlt = new Fraction(cals).div(new Fraction(calContainer)).valueOf();
        } else if (isFraction(totalYield) && isFraction(amountContainer) && new Fraction(amountContainer).valueOf() !== 0) {
          fracAlt = new Fraction(calContainer).div(new Fraction(cals)).mul(new Fraction(totalYield).div(new Fraction(amountContainer))).valueOf();
        }
      }

      // if # servings is valid, calculate other 3 data points
      const selectedFrac = (type === "recipe") ? frac : fracAlt;
      if (typeof selectedFrac === "number" && isFinite(selectedFrac) && selectedFrac !== 0) {
        calcAmountFraction(selectedFrac);
        setGoalPrice((isFraction(priceContainer) && frac !== 0) ? new Fraction(priceContainer).div(new Fraction(frac)).valueOf().toFixed(2) : "0.00");
        setGoalServings(selectedFrac.toFixed(2));
      } else {
        setGoalPrice("0.00");
        setGoalServings("0.00");
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
    if (isFraction(price) && new Fraction(price).valueOf() !== 0) {
      setGoalPrice(price);

      // calculates the # servings
      const validPriceContainer = isFraction(priceContainer) && new Fraction(priceContainer).valueOf() > 0;
      const frac = validPriceContainer ? new Fraction(priceContainer).div(new Fraction(price)).valueOf() : 0;

      let fracAlt = 0;
      if (validPriceContainer) {
        if (amountContainer === 0 || new Fraction(amountContainer).valueOf() === 0) {
          fracAlt = new Fraction(price).div(new Fraction(priceContainer)).valueOf();
        } else if (isFraction(totalYield) && isFraction(amountContainer) && new Fraction(amountContainer).valueOf() !== 0) {
          fracAlt = new Fraction(priceContainer).div(new Fraction(price)).mul(new Fraction(totalYield).div(new Fraction(amountContainer))).valueOf();
        }
      }
      
      // if # servings is valid, calculate other 3 data points
      const selectedFrac = (type === "recipe") ? frac : fracAlt;
      if (typeof selectedFrac === "number" && isFinite(selectedFrac) && selectedFrac !== 0) {
        calcAmountFraction(selectedFrac);
        setGoalCals((isFraction(calContainer) && frac !== 0) ? new Fraction(calContainer).div(new Fraction(frac)).valueOf().toFixed(0) : "0");
        setGoalServings(selectedFrac.toFixed(2));
      } else {
        setGoalCals("0");
        setGoalServings("0.00");
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
    if (isFraction(serving) && new Fraction(serving).valueOf() !== 0) {
      setGoalServings(serving);
      
      const frac = new Fraction(serving).valueOf();

      // calculate yield-to-amount
      const hasValidAmountContainer = isFraction(amountContainer) && new Fraction(amountContainer).valueOf() !== 0;
      const ratio = (amountContainer === 0 || !hasValidAmountContainer) ? 1 : (isFraction(totalYield) ? new Fraction(totalYield).div(new Fraction(amountContainer)).valueOf() : 0);
      
      // if # servings is valid, calculate other 3 data points
      if (typeof frac === "number" && isFinite(frac) && frac !== 0) {
        calcAmountFraction(frac);
        setGoalCals((isFraction(calContainer) && frac !== 0) ? new Fraction(calContainer).div(new Fraction(frac)).mul(new Fraction(ratio)).valueOf().toFixed(0) : "0");
        setGoalPrice((isFraction(priceContainer) && frac !== 0) ? new Fraction(priceContainer).div(new Fraction(frac)).mul(new Fraction(ratio)).valueOf().toFixed(2) : "0.00");
      } else {
        setGoalCals("0");
        setGoalPrice("0.00");
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
        <View className="w-5/6 bg-zinc200 p-7 rounded-2xl">

          {/* Current Name */}
          <Text className="text-[16px] font-bold text-center py-1">
            {initialServings !== null ? ingredientName : ingredientData?.ingredientName}
          </Text>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-5"/>

          {/* TOTAL YIELD */}
          {(amountContainer !== 0) && (
            <View className="flex w-full justify-center items-center mb-3 px-3">
              <View className="flex flex-row w-11/12 border-[1px] border-zinc400">
                
                {/* text */}
                <View className="flex w-3/5 justify-center items-center py-1 bg-theme200">
                  <Text className="text-[14px] text-zinc700 italic font-medium">
                    TOTAL YIELD
                  </Text>
                </View>

                {/* Amount Section */}
                <View className="flex flex-row px-1 w-2/5 justify-center items-center bg-theme100">
                  {/* calculated amount and unit */}
                  <TextInput
                    className="w-full text-center text-[14px] leading-[17px]"
                    placeholder="0 0/0"
                    placeholderTextColor={colors.zinc500}
                    value={totalYield}
                    onChangeText={(value) => updateTotalYield(validateFractionInput(value))}
                  />
                </View>
              </View>
            </View>
          )}

          {/* CALCULATION */}
          <View className="flex flex-col w-full justify-center items-center px-3">
            
            {/* text */}
            <View className="flex w-11/12 justify-center items-center py-1 px-1 bg-zinc100 border-[1px] border-zinc400">
              <Text className="text-[14px] text-theme700 italic font-medium">
                CALCULATED AMOUNT TO USE:
              </Text>
            </View>
            
            {/* Amount Section */}
            <View className="flex flex-row w-11/12 mr-[0px] px-1 justify-center items-center bg-zinc350 border-b-[1px] border-x-[1px] border-zinc400">
              {/* calculated amount and unit*/} 
              <Text className="w-full ml-[-16px] pl-[24px] pr-2 py-1 text-center">
                {calcAmount} {initialServings !== null ? extractUnit(ingredientData[ingredientStore].unit, calcAmount) : extractUnit(ingredientData.ingredientData[ingredientStore].unit, calcAmount)}
              </Text>
              {/* button to submit */}
              <View className="flex w-[24px]">
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
              {(calContainer !== 0) && (
                <View className={`flex flex-col ${(priceContainer === 0 && amountContainer === 0) ? "w-full" : (priceContainer === 0) ? "w-1/2" : "w-1/3"} justify-center items-center space-y-1`}>
                  {/* label */}
                  <Text className="text-[14px] text-theme700 font-semibold">
                    CALORIES
                  </Text>
                  {/* user input */}
                  <View className="flex w-full p-1 justify-center items-center border-[1px] border-zinc400 bg-theme200">
                    <TextInput
                      className="w-full text-center text-[14px] leading-[17px]"
                      placeholder="0"
                      placeholderTextColor={colors.zinc500}
                      value={goalCals}
                      onChangeText={(value) => updateGoalCals(validateWholeNumberInput(value))}
                    />
                  </View>
                </View>
              )}
              
              {/* Cost - IF CONTAINER COST ISN'T 0 */}
              {(priceContainer !== 0) && (
                <View className={`flex flex-col ${(calContainer === 0 && amountContainer === 0) ? "w-full" : (calContainer === 0) ? "w-1/2" : "w-1/3"} justify-center items-center space-y-1`}>
                  {/* label */}
                  <Text className="text-[14px] text-theme700 font-semibold">
                    COST
                  </Text>
                  {/* user input */}
                  <View className="flex flex-row w-full px-2 py-1 justify-center items-center border-[1px] border-zinc400 bg-theme200">
                    <Text className={`flex-auto text-right ${goalPrice === 0 || goalPrice === "" ? "text-zinc500" : "text-black"} text-[14px] leading-[17px]`}>
                      $
                    </Text>
                    <TextInput
                      className="flex-auto text-left text-[14px] leading-[17px]"
                      placeholder="0.00"
                      placeholderTextColor={colors.zinc500}
                      value={goalPrice}
                      onChangeText={(value) => updateGoalPrice(validateDecimalInput(value))}
                    />
                  </View>
                </View>
              )}

              {/* Servings */}
              {(amountContainer !== 0) && (
                <View className={`flex flex-col ${(calContainer === 0 && priceContainer === 0) ? "w-full" : (calContainer === 0 || priceContainer === 0) ? "w-1/2" : "w-1/3"} justify-center items-center space-y-1`}>
                  {/* label */}
                  <Text className="text-[14px] text-theme700 font-semibold">
                    SERVINGS
                  </Text>
                  {/* user input */}
                  <View className="flex w-full py-1 justify-center items-center border-[1px] border-zinc400 bg-theme200">
                    <TextInput
                      className="flex w-full px-1 text-center text-[14px] leading-[17px]"
                      placeholder="0.00"
                      placeholderTextColor={colors.zinc500}
                      value={goalServings}
                      onChangeText={(value) => updateGoalServings(validateDecimalInput(value))}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>


          {/* CONTAINER SECTION - PREP */}
          {(type === "prep" || type === "spotlight" || type === "recipe") && (
            <>
              {/* Divider */}
              <View className={`h-[1px] bg-zinc400 mt-4 ${(type !== "recipe") ? "mb-6" : "mb-2"}`}/>

              <View className="flex flex-col justify-center items-center">

                {/* AMOUNT / CONTAINER */}
                {(type !== "recipe" && amountContainer !== 0) && (
                  <View className="flex flex-row w-11/12 border-[1px] border-zinc350 mb-2">
                    {/* header */}
                    <Text className="flex-1 py-1 px-2 text-right text-[12px] font-medium text-theme800 bg-zinc300">
                      {type === "prep" ? "TOTAL AMOUNT" : "AMOUNT PER CONTAINER"}
                    </Text>
                    {/* amount */}
                    <Text className="font-medium text-theme700 bg-zinc100 py-1 px-2 text-center text-[12px]">
                      {(isFraction(amountContainer) && new Fraction(amountContainer).valueOf() !== 0)
                        ? new Fraction(amountContainer).simplify(0.001).toFraction(true)
                        : "0"}
                    </Text>
                  </View>
                )}

                {/* OTHER PREPS */}
                {(othersUsed?.length > 0) ? (
                  <View className="flex flex-col w-11/12 border-[1px] border-zinc350 mb-2">
                    <View className="flex flex-row justify-center items-center border-b-2 bg-zinc100 border-b-zinc350">
                      {/* header */}
                      <Text className="flex-1 py-1 px-2 text-right text-[12px] font-medium text-theme800 bg-zinc300">
                        AMOUNT IN OTHER MEAL PREPS
                      </Text>
                      {/* amount */}
                      <Text className="font-medium text-theme700 py-1 px-2 text-center text-[12px]">
                        {totalOtherAmount}
                      </Text>
                    </View>

                    {/* selection */}
                    <View className="flex flex-col items-start">
                      {othersUsed?.map((other, index) => (
                        <View key={index} className="flex flex-row bg-theme100 border-b-0.5 border-theme400">
                          
                          {/* count indicator */}
                          <View className="w-1/12 justify-center items-center py-1">
                            <Icon
                              name={isOtherCounted?.[index] ? "checkbox" : "square-outline"}
                              color={colors.zinc500}
                              size={13}
                              onPress={() =>
                                setIsCounted(prev => {
                                  const updated = [...prev];
                                  updated[index] = !updated[index];
                                  return updated;
                                })
                              }
                            />
                          </View>

                          {/* Details */}
                          <View className="w-11/12 flex flex-row">
                            {/* name - struck through if unselected spotlight */}
                            <Text className={`flex-1 px-1 text-left text-[11px] text-zinc600 italic py-1 ${(selectedUsed && !selectedUsed[index]) && "line-through"}`}>
                              {other}
                            </Text>
                            {/* amount */}
                            <Text className="font-medium text-zinc600 italic px-2 py-1 text-center text-[11px]">
                              {`${isFraction(amountsUsed[index]) ? amountsUsed[index] : 0}`}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (type !== "recipe") && (
                  <View className="flex w-11/12 border-[1px] bg-zinc300 border-zinc350 mb-2">
                    <Text className="text-center py-1 px-2 text-[12px] italic font-medium text-zinc600 bg-zinc300">
                      {`no other ${type}s use this ingredient`}
                    </Text>
                  </View>
                )}

                {/* ALT VARIANTS */}
                {(altAmountsUsed?.length > 0) ? (
                  <View className="flex flex-col w-11/12 border-[1px] border-zinc350 mb-2">
                    <View className="flex flex-row justify-center items-center bg-zinc100 border-b-2 border-b-zinc350">
                      {/* header */}
                      <Text className="flex-1 py-1 px-2 text-right text-[12px] font-medium text-theme800 bg-zinc300">
                        AMOUNT IN OTHER VARIANTS
                      </Text>
                      {/* amount */}
                      <Text className="font-medium text-theme700 bg-zinc100 px-2 text-center text-[12px]">
                        {totalAltAmount}
                      </Text>
                    </View>

                    {/* selection */}
                    <View className="flex flex-col items-start">
                      {altAmountsUsed?.map((alt, index) => (
                        <View key={index}>
                          {(alt !== "0") && (
                            <View className="flex flex-row bg-theme100 border-b-0.5 border-theme400">
                              
                              {/* count indicator */}
                              <View className="w-1/12 justify-center items-center py-1">
                                <Icon
                                  name={isAltCounted?.[index] ? "checkbox" : "square-outline"}
                                  color={colors.zinc500}
                                  size={13}
                                  onPress={() =>
                                    setIsAltCounted(prev => {
                                      const updated = [...prev];
                                      updated[index] = !updated[index];
                                      return updated;
                                    })
                                  }
                                />
                              </View>

                              {/* Details */}
                              <View className="w-11/12 flex flex-row">
                                {/* name */}
                                <Text className="flex-1 px-1 text-left text-[11px] text-zinc600 italic py-1">
                                  {`VARIANT ${numberToRoman(index + 1)}`}
                                </Text>
                                {/* amount */}
                                <Text className="font-medium text-zinc600 italic px-2 py-1 text-center text-[11px]">
                                  {`${isFraction(altAmountsUsed[index]) ? altAmountsUsed[index] : 0}`}
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                ) : (type === "prep") && (
                  <View className="flex w-11/12 border-[1px] bg-zinc300 border-zinc350 mb-2">
                    <Text className="text-center py-1 px-2 text-[12px] italic font-medium text-zinc600 bg-zinc300">
                      {`no other variants use this ingredient`}
                    </Text>
                  </View>
                )}

                {/* CONTAINER AMOUNTS */}
                {(amountContainer !== 0) && (
                  <View className="flex flex-row justify-center items-center mt-3 space-x-4">

                    {(type !== "prep") && (
                      <View className="flex flex-row bg-zinc100 justify-center items-center border-[1px] border-zinc400">
                        {/* Num Containers -- Buttons */}
                        <View className="flex flex-col space-y-[-2px] bg-theme200 border-r-[1px] border-theme300 px-1 py-1.5">
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
                    )}

                    {/* CALCULATED DETAILS */}
                    <View className={`flex flex-row bg-theme100 border-[1px] border-zinc400 ${(type === "recipe") && "h-full"}`}>
                      {/* headers */}
                      <View className="flex flex-col justify-center items-end bg-theme200 px-2 py-1">
                        {/* overall */}
                        <Text className="text-[13px] text-zinc700 italic font-medium">
                          OVERALL
                        </Text>
                        {/* remaining */}
                        {(type !== "recipe") && (
                          <Text className="text-[13px] text-zinc700 italic font-medium">
                            REMAINING
                          </Text>
                        )}
                      </View>
                      {/* arrow */}
                      <TouchableOpacity 
                        className="h-full absolute right-[-30px] bottom-1.5 flex flex-row -rotate-90"
                        onPress={() => {
                          updateTotalYield(
                            (isFraction(numContainers) ? new Fraction(numContainers) : new Fraction(0))
                              .mul(isFraction(amountContainer) ? new Fraction(amountContainer) : new Fraction(0))
                              .sub(isFraction(totalAmount) ? new Fraction(totalAmount) : new Fraction(0))
                              .simplify(0.001).toFraction(true))
                        }}
                      >
                        <Icon
                          name="return-down-forward"
                          size={20}
                          color={colors.zinc700}
                        />
                      </TouchableOpacity>
                      {/* amounts */}
                      <View className="flex flex-col justify-center items-center px-2 py-1">
                        {/* overall */}
                        <Text className="text-[13px] text-zinc800">
                          {(amountContainer === 0 || !isFraction(amountContainer) || !isFraction(numContainers)) ? "0" 
                            : new Fraction(numContainers).mul(new Fraction(amountContainer)).simplify(0.001).toFraction(true)}
                        </Text>
                        {/* remaining */}
                        {(type !== "recipe") && (
                          <Text className="text-[13px] text-zinc800">
                            {(amountContainer === 0 || !isFraction(amountContainer) || !isFraction(numContainers)) ? "0" 
                              : new Fraction(numContainers).mul(new Fraction(amountContainer)).sub(isFraction(totalAmount) ? new Fraction(totalAmount) : new Fraction(0)).simplify(0.001).toFraction(true)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default CalcIngredientModal;