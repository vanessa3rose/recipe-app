///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';

// Fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

import extractUnit from '../Validation/extractUnit';


///////////////////////////////// SIGNATURE /////////////////////////////////

const RecipeListModal = ({ 
  ingredient, recipeList, amountList, unitList, multList, otherList,
  modalVisible, setModalVisible, closeModal
}) => {


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
        <TouchableOpacity onPress={closeModal} className="absolute bg-black opacity-50 w-full h-full"/>

        {/* Modal Content */}
        <View className="flex w-4/5 py-5 px-2 mb-[50px] bg-zinc200 rounded-xl border-[1px] border-zinc-400 z-50">

          {/* ingredient name */}
          <Text className="font-bold text-[16px] text-center text-theme700">
              {ingredient.name.toUpperCase()}
          </Text>

          {/* divider */}
          <View className="h-[1px] bg-zinc400 m-2 mb-4"/>
          
          {/* recipe list */}
          {recipeList.map((recipe, index) => (
            <View className="flex flex-row justify-center items-center w-full px-4" key={index}>
              <View className="flex flex-row border-0.5 bg-black">

                {/* recipe name */}
                <View className="py-3 px-2 w-3/5 items-center justify-center bg-zinc500">
                  <Text className="text-white font-semibold text-center">
                    {recipe}
                  </Text>
                </View>
                
                {/* details */}
                <View className="flex py-3 px-2 w-2/5 items-center justify-center bg-zinc400">
                  <Text>
                    <Text className="text-center">{`${amountList[index] === "" ? 0 : amountList[index]} ${extractUnit(unitList[index], amountList[index])}`}</Text>
                    <Text className="text-center">{`\u00A0x\u00A0${multList[index]}`}</Text>
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {/* amounts */}
          <View className="flex flex-row w-full justify-center items-center space-x-3 pt-5 px-10">

            {/* amount used */}
            <View className="flex flex-col w-1/3 justify-center items-center bg-theme200 rounded-md border-[1px] border-zinc400">
              <Text className="font-semibold w-full py-1 rounded-t-md text-center text-[12px]">
                USED
              </Text>
              <Text className="text-theme900 bg-theme100 w-full py-1 rounded-b-md text-center text-[12px]">
                {(new Fractional(ingredient.yieldNeeded)).toString()}
              </Text>
            </View>

            {/* amount remaining */}
            <View className="flex flex-col w-1/3 justify-center items-center bg-theme200 rounded-md border-[1px] border-zinc400">
              <Text className="font-semibold w-full py-1 rounded-t-md text-center text-[12px]">
                LEFT
              </Text>
              <Text className="text-theme900 bg-theme100 w-full py-1 rounded-b-md text-center text-[12px]">
              {(new Fractional(ingredient.totalYield)).multiply(new Fractional(ingredient.amountNeeded)).subtract(new Fractional(ingredient.yieldNeeded)).toString()}
              </Text>
            </View>
            
            {/* total amount */}
            <View className="flex flex-col w-1/3 justify-center items-center bg-theme200 rounded-md border-[1px] border-zinc400">
              <Text className="font-semibold w-full py-1 rounded-t-md text-center text-[12px]">
                TOTAL
              </Text>
              <Text className="text-theme900 bg-theme100 w-full py-1 rounded-b-md text-center text-[12px]">
              {(new Fractional(ingredient.totalYield)).multiply(new Fractional(ingredient.amountNeeded)).toString()}
              </Text>
            </View>
          </View>

          {/* if other stores list the ingredient */}
          {otherList.length !== 0 &&
          <>
            {/* divider */}
            <View className="h-[1px] bg-zinc400 m-5"/>

            <View className="flex w-full px-2 justify-center items-center">

              {/* Text Indicator */}
              <View className="w-11/12 bg-zinc100 p-1 border-[1px] border-zinc350 mb-2">
                <Text className="font-medium text-[12px] text-center text-zinc800">
                  OTHER LISTS WITH THIS INGREDIENT:
                </Text>
              </View>

              {/* Map of Ingredients */}
              <View className="flex border-[1px] border-r-[1.5px] border-theme800">
                {otherList.map((ingredient, index) => (
                  <View key={index} className="flex flex-row w-11/12 bg-black justify-center items-center">
                    
                    {/* Spotlight */}
                    <View className={`w-7/12 py-1 px-2 bg-theme600 border-l-0.5 ${index !== 0 && 'border-t-[1px] border-theme700'}`}>
                      <Text className="text-[12.5px] text-left text-white">
                        {ingredient.spotlightName}
                      </Text>
                    </View>

                    {/* Store */}
                    <View className={`w-5/12 py-1 bg-theme800 text-zinc100 ${index !== 0 && 'border-t-[1px] border-theme900'}`}>
                      <Text className="text-[12.5px] text-center text-white font-medium">
                        {ingredient.ingredientStore.toLowerCase()}
                      </Text>
                    </View>
                  </View>
                ))}
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

export default RecipeListModal;