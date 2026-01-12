///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect } from 'react';

// UI components
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

// validation
import validateDecimalInput from '../Validation/validateDecimalInput';
import validateWholeNumberInput from '../Validation/validateWholeNumberInput';
import validateFractionInput from '../Validation/validateFractionInput';
import extractUnit from '../Validation/extractUnit';


///////////////////////////////// SIGNATURE /////////////////////////////////

const CalcIngredientModal = ({ 
  type, modalVisible, setModalVisible, submitModal, 
  ingredientData, ingredientName, ingredientStore,
  initialCals, initialPrice, initialServings, initialAmount, 
  totalAmountUsed, amountsUsed, othersUsed, selectedUsed, 
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

      // if the type is recipe
      if (type === "recipe") {
        setTotalYield(new Fractional(new Fraction(amountContainer).simplify(1 / 1000).toFraction()).toString());
        setGoalServings(initialServings);
        
      // otherwise, find the initial data that will make remaining nonnegative
      } else {
        let count = 0;
        let remaining = 0;
        
        while (new Fraction(remaining) * 1 <= 0) {
          count = count + 1;
          remaining = ((new Fractional(count)).multiply(new Fractional(amountContainer)).subtract(new Fractional(totalAmountUsed))).toString();
        }  
        
        setNumContainers(count);
        setTotalYield(new Fractional(new Fraction(remaining).simplify(1 / 1000).toFraction()).toString());
        setGoalServings(initialAmount === "" ? "0.00" : (((new Fractional(remaining)).divide(new Fractional(initialAmount))).numerator / ((new Fractional(remaining)).divide(new Fractional(initialAmount))).denominator).toFixed(2));
      }


      // stores the calculation data (not meal prep)
      if (initialServings !== null) {
        
        // closes modal immediately if invalid data
        if (ingredientData[ingredientStore].brand === "" || ingredientData[ingredientStore].unit === ""
            || (ingredientData[ingredientStore].calContainer === "" && ingredientData[ingredientStore].priceContainer === "" && ingredientData[ingredientStore].totalYield === "") ) {
          setModalVisible(false);
        
        } else {
          setCalContainer(ingredientData[ingredientStore].calContainer === "" ? 0 : new Fraction(ingredientData[ingredientStore].calContainer) * 1);
          setPriceContainer(ingredientData[ingredientStore].priceContainer === "" ? 0 : new Fraction (ingredientData[ingredientStore].priceContainer) * 1); 
        }

      // stores the calculation data (meal prep)
      } else {
        setCalContainer(new Fraction (ingredientData.ingredientData[ingredientStore].calServing) * amountContainer / servingSize);
        setPriceContainer(new Fraction (ingredientData.unitPrice) * amountContainer / servingSize);
      }
    }
  }, [modalVisible])


  ///////////////////////////////// CHOOSING OTHERS /////////////////////////////////

  const [isCounted, setIsCounted] = useState(null);
  const [totalOtherAmount, setTotalOtherAmount] = useState(0);

  // when othersUsed is populated (on open), select others to be true
  useEffect(() => {
    if (othersUsed) {
      setIsCounted(Array(othersUsed.length).fill(true));
    }
  }, [othersUsed])

  // when toggling an other's checkbox
  useEffect(() => {
    if (isCounted) {
      let total = 0;

      // resums total and stores it
      isCounted.forEach((counted, index) => { 
        if (counted) { total = (new Fractional(total).add(amountsUsed[index])).toString() }
      })
      setTotalOtherAmount(total);
    }
  }, [isCounted])


  ///////////////////////////////// INPUTS /////////////////////////////////

  const [goalCals, setGoalCals] = useState(0);
  const [goalPrice, setGoalPrice] = useState(0);
  const [goalServings, setGoalServings] = useState(0);
  const [calcAmount, setCalcAmount] = useState(0);

  // changing the total yield used in calculations
  const updateTotalYield = (total) => {
    if (total !== "") {
      
      // stores the total yield
      setTotalYield(new Fractional(new Fraction(total).simplify(1 / 1000).toFraction()).toString());

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
      const improper = new Fraction(total / frac).simplify(1 / 1000);   
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
        calcAmountFraction(isNaN(type === "recipe" ? frac : fracAlt) ? 0 : (type === "recipe" ? frac : fracAlt));
        setGoalPrice((priceContainer / frac).toFixed(2));
        setGoalServings(isNaN(type === "recipe" ? frac : fracAlt) ? "0.00" : (type === "recipe" ? frac : fracAlt).toFixed(2));
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
        calcAmountFraction(isNaN(type === "recipe" ? frac : fracAlt) ? 0 : (type === "recipe" ? frac : fracAlt));
        setGoalCals((calContainer / frac).toFixed(0));
        setGoalServings(isNaN(type === "recipe" ? frac : fracAlt) ? "0.00" : (type === "recipe" ? frac : fracAlt).toFixed(2));
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
        <View className="w-5/6 bg-zinc200 p-7 rounded-2xl">

          {/* Current Name */}
          <Text className="text-[16px] font-bold text-center py-1">
            {initialServings !== null ? ingredientName : ingredientData?.ingredientName}
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
                <View className={`flex flex-col ${priceContainer === 0 ? "w-1/2" : "w-1/3"} justify-center items-center space-y-1`}>
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
                <View className={`flex flex-col ${calContainer === 0 ? "w-1/2" : "w-1/3"} justify-center items-center space-y-1`}>
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
              <View className={`flex flex-col ${(calContainer === 0 && priceContainer === 0) ? "w-full" : calContainer === 0 || priceContainer === 0 ? "w-1/2" : "w-1/3"} justify-center items-center space-y-1`}>
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
            </View>
          </View>


          {/* CONTAINER SECTION - PREP */}
          {(type === "prep" || type === "spotlight" || type === "recipe") && (
            <>
              {/* Divider */}
              <View className={`h-[1px] bg-zinc400 mt-4 ${(type !== "recipe") ? "mb-6" : "mb-2"}`}/>

              <View className="flex flex-col justify-center items-center">

                {/* AMOUNT / CONTAINER */}
                {(type !== "recipe") && (
                  <View className="flex flex-row w-11/12 border-[1px] border-zinc350 mb-2">
                    {/* header */}
                    <Text className="flex-1 py-1 px-2 text-right text-[12px] font-medium text-theme800 bg-zinc300">
                      {type === "prep" ? "TOTAL AMOUNT" : "AMOUNT PER CONTAINER"}
                    </Text>
                    {/* amount */}
                    <Text className="font-medium text-theme700 bg-zinc100 py-1 px-2 text-center text-[12px]">
                      {new Fractional((new Fraction(amountContainer).simplify(1 / 1000)).toFraction()).toString()}
                    </Text>
                  </View>
                )}

                {/* OTHER PREPS */}
                {(othersUsed?.length > 0) ? (
                  <View className="flex flex-col w-11/12 border-[1px] border-zinc350 mb-2">
                    <View className="flex flex-row justify-center items-center border-b-2 border-b-zinc350">
                      {/* header */}
                      <Text className="flex-1 py-1 px-2 text-right text-[12px] font-medium text-theme800 bg-zinc300">
                        AMOUNT IN OTHER MEAL PREPS
                      </Text>
                      {/* amount */}
                      <Text className="font-medium text-theme700 bg-zinc100 py-1 px-2 text-center text-[12px]">
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
                              name={isCounted?.[index] ? "checkbox" : "square-outline"}
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
                              {`${amountsUsed[index]}`}
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

                {/* CONTAINER AMOUNTS */}
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
                      onPress={() => updateTotalYield(((new Fractional(numContainers)).multiply(new Fractional(amountContainer)).subtract(new Fractional(totalOtherAmount))).toString())}
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
                        {new Fractional((
                          new Fraction((new Fractional(numContainers)).multiply(new Fractional(amountContainer)).numerator / (new Fractional(numContainers)).multiply(new Fractional(amountContainer)).denominator)
                        .simplify(1 / 1000)).toFraction()).toString()}
                      </Text>
                      {/* remaining */}
                      {(type !== "recipe") && (
                        <Text className="text-[13px] text-zinc800">
                          {new Fractional((
                            new Fraction((new Fractional(numContainers)).multiply(new Fractional(amountContainer)).subtract(totalOtherAmount).numerator / (new Fractional(numContainers)).multiply(new Fractional(amountContainer)).subtract(totalOtherAmount).denominator)
                          .simplify(1 / 1000)).toFraction()).toString()}
                        </Text>
                      )}
                    </View>
                  </View>
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

export default CalcIngredientModal;