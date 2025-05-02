///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

import extractUnit from '../Validation/extractUnit';


///////////////////////////////// SIGNATURE /////////////////////////////////

const AmountsDetailsModal = ({ 
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
        <View className="flex w-4/5 py-5 px-2 bg-zinc200 rounded-xl border-[1px] border-zinc-400 z-50">
        
          {/* Title */}
          <Text className="font-bold text-[16px] text-center text-black">
            {data.ingredientData.ingredientName}
          </Text>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 m-2 mb-4"/>

          {/* AMOUNTS */}
          <View className="flex flex-col px-4">
            
            {/* Left */}
            <View className="flex flex-row justify-center items-center">

              {/* text */}
              <View className="flex justify-center items-center w-[45%]">
                <Text className="flex w-full pr-5 leading-10 text-[14px] text-right font-semibold text-theme700">
                    AMOUNT LEFT
                </Text>
              </View>

              {/* data */}
              <View className="flex border border-r-[1px] w-[55%]">
                <Text className="flex w-full leading-7 text-center text-[12px] text-black bg-theme200">
                    {data.amountLeft} {extractUnit(data.ingredientData[`${data.ingredientStore}Unit`], data.amountLeft)}
                </Text>
              </View>
            </View>


            {/* Total */}
            <View className="flex flex-row justify-center items-center">

              {/* text */}
              <View className="flex justify-center items-center w-[45%]">
                <Text className="flex w-full pr-5 leading-10 text-[14px] text-right font-semibold text-theme700">
                    AMOUNT TOTAL
                </Text>
              </View>

              {/* data */}
              <View className="flex border border-r-[1px] w-[55%]">
                <Text className="flex w-full leading-7 text-center text-[12px] text-black bg-theme200">
                  {data.amountTotal === "" ? "?" : data.amountTotal} {extractUnit(data.ingredientData[`${data.ingredientStore}Unit`], data.amountTotal)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default AmountsDetailsModal;