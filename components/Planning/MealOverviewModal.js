///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

import colors from '../../assets/colors';
import Icon from 'react-native-vector-icons/Ionicons';


///////////////////////////////// SIGNATURE /////////////////////////////////

const MealOverviewModal = ({ 
  data, modalVisible, setModalVisible, 
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
        <TouchableOpacity onPress={() => setModalVisible(false)} className="absolute bg-black opacity-50 w-full h-full"/>
        
        {/* Modal Content */}
        <View className="flex w-3/4 py-5 px-2 bg-zinc200 rounded-xl border-[1px] border-zinc-400 z-50">
        
          {/* Title */}
          <Text className="font-bold text-[16px] text-center text-black">
            {data.prepName}
          </Text>
          
          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mt-2 mb-4 mx-4"/>
                        
          {/* Ingredient Names */}
          <View className="flex justify-center items-center border-2 border-theme500 mx-5">
            {Array.from({ length: 12 }, (_, index) => (
              <View key={`frozen-${index}`}>
                {data?.currentData[index]?.ingredientId !== undefined && 
                  <View className="flex flex-row w-full h-[30px] bg-white border-b-[1px] border-zinc200">
                    <Text className="flex justify-center w-1/12 h-full pt-[7px] text-black font-semibold text-[12px] text-right">
                      {index + 1}{"."}
                    </Text>
                    <Text className="flex justify-center w-11/12 h-full pt-[7px] pl-1.5 text-black text-[12px] text-left">
                      {data?.currentData[index]?.ingredientData?.ingredientName || ""}
                    </Text>
                  </View>
                }
              </View>
            ))}
          </View>

          
          {/* Divider */}
          <View className="h-[1px] bg-zinc400 m-4"/>


          {/* DETAILS */}
          <View className="flex flex-row justify-evenly px-2">

            {/* text */}
            <View className="flex border w-1/2 rounded-sm">
              <Text className="leading-7 text-center text-[12px] italic text-black bg-theme200 rounded-sm">
                {data.prepCal} {" calories"}
              </Text>
            </View>

            {/* data */}
            <View className="flex border w-1/3 rounded-sm">
              <Text className="leading-7 text-center text-[12px] italic text-black bg-theme200 rounded-sm">
                {"$"}{data.prepPrice}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default MealOverviewModal;