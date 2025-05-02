///////////////////////////////// IMPORTS /////////////////////////////////

import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

import extractUnit from '../Validation/extractUnit';


///////////////////////////////// SIGNATURE /////////////////////////////////

const ViewCurrentModal = ({ 
  modalVisible, closeModal, ingredientData, prepList, amountList, multList, 
}) => {


  ///////////////////////////////// HTML /////////////////////////////////
  
  return (

    <Modal
      transparent={true}
      animationType="slide"
      visible={modalVisible}
      onRequestClose={closeModal}
    >
      <View className="flex-1 justify-center items-center">

        {/* Background Overlay */}
        <TouchableOpacity onPress={closeModal} className="absolute bg-black opacity-50 w-full h-full"/>
        
        {/* Modal Content */}
        <View className="flex w-5/6 py-5 px-2 bg-zinc200 rounded-xl border-[1px] border-zinc-400 z-50">

          {/* Title */}
          <Text className="font-bold text-[16px] text-center text-black">
            {ingredientData.name}
          </Text>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 m-2 mb-4"/>

          {/* DETAILS */}
          <View className="flex flex-col space-y-2 px-5">
            {/* serving size */}
            <View className="flex flex-row justify-between items-center">

              {/* Label */}
              <Text className="text-theme700 mr-4 font-medium">
                SERVING SIZE
              </Text>

              <View className="flex-1 flex-row border-t border-b border-zinc500">

                {/* Size */}
                <Text className="bg-theme200 p-1 flex-1 text-center border-l border-zinc500 text-[12px]">
                  {ingredientData.servingSize}
                </Text>

                {/* Units */}
                <Text className="bg-theme200 p-1 flex-1 border-r border-zinc500 text-[12px]">
                  {extractUnit(ingredientData.unit, ingredientData.servingSize)}
                </Text>
              </View>
            </View>
            
            {/* calories per serving */}
            <View className="flex flex-row justify-between items-center">
        
              {/* Label */}
              <Text className="text-theme700 mr-4 font-medium">
                CALORIES / SERVING
              </Text>
      
              {/* Text */}
              <Text className="border border-zinc500 bg-theme200 p-1 flex-1 text-center text-[12px]">
                {ingredientData.calServing}
              </Text>
            </View>
          </View>
          
          {prepList !== null && prepList.length > 0 &&
            <>
            {/* Divider */}
            <View className="h-[1px] bg-zinc400 mx-2 my-4"/>
            
            {/* MEAL PREP LIST */}
            {prepList.map((prep, index) => (
              <View 
                key={index}
                className="flex flex-row justify-center items-center w-full px-4"
              >
                <View className="flex flex-row border-[1px] border-zinc450 bg-black">

                  {/* prep name */}
                  <View className="py-1 px-2 w-3/5 items-center justify-center bg-zinc400">
                    <Text className="text-black italic font-semibold text-center text-[12px]">
                      {prep}
                    </Text>
                  </View>

                  {/* details */}
                  <View className="flex flex-row py-2 px-2 w-2/5 items-center justify-center bg-zinc350">
                    <Text>
                      <Text className="text-[12px] text-center font-medium text-zinc700">{amountList[index]}</Text>
                      <Text className="text-[12px] text-center font-medium text-zinc700">{`\u00A0x\u00A0${multList[index]}`}</Text>
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            </>
          }
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ViewCurrentModal;