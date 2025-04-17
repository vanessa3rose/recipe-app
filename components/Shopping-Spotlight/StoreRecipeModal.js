///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';


///////////////////////////////// SIGNATURE /////////////////////////////////

const StoreRecipeModal = ({ 
  modalVisible, setModalVisible, recipeData, overrideRecipe, newRecipe
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
      <View className="absolute bg-black opacity-50 w-full h-full"/>
      
      {/* Modal Content */}
      <View className="w-3/4 bg-zinc200 px-5 py-7 rounded-2xl">
      
        {/* HEADER */}
        <View className="flex flex-row items-center justify-between px-4">

          {/* Recipe Name */}
          <Text className="font-bold text-[20px] text-center text-black">
            {recipeData?.recipeName || ""}
          </Text>

          {/* X Button */}
          <Icon 
            size={24}
            color={'black'}
            name="close-outline"
            onPress={() => setModalVisible(false)}
          />
        </View>


        {/* DIVIDER */}
        <View className="h-[1px] bg-zinc400 m-2 mb-4"/>

        
        {/* Message */}
        <View className="flex flex-col">
          <Text className="text-[14px] italic text-zinc600 text-center">
            A recipe spotlight is currently selected.
          </Text>
          <Text className="text-[14px] italic text-zinc600 text-center">
            How would you like to proceed?
          </Text>
        </View>


        {/* BUTTONS */}
        <View className="flex flex-col space-y-2 pt-6 justify-center items-center">

          {/* Override */}
          <TouchableOpacity
            onPress={() => overrideRecipe()}
            className="flex bg-theme400 bg-opacity-[100%] w-4/5 rounded-[5px] py-2 justify-center items-center"
          >
            <Text className="text-white font-bold text-[15px]">Override Current Recipe</Text>
          </TouchableOpacity>

          {/* New */}
          <TouchableOpacity
            onPress={() => newRecipe()}
          className="flex bg-theme600 w-4/5 rounded-[5px] py-2 justify-center items-center"
          >
            <Text className="text-white font-bold text-[15px]">Create A New Recipe</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default StoreRecipeModal;