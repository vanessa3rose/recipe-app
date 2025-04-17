///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';


///////////////////////////////// SIGNATURE /////////////////////////////////

const DeletePrepModal = ({ 
  prepName, visible, onBoth, onSave, onDelete, onCancel
}) => {

  
  ///////////////////////////////// CHOOSING OPTIONS /////////////////////////////////

  const [savePrep, setSavePrep] = useState(false);
  const [deletePrep, setDeletePrep] = useState(false);
  
  // when closing the modal
  const onProceed = () => {
    if (savePrep && deletePrep) { onBoth(); } 
    else if (savePrep) { onSave(); }
    else if (deletePrep) { onDelete(); } 
    else { onCancel(); }
  }

  
  ///////////////////////////////// HTML /////////////////////////////////

  return (

    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
    >
      <View className="flex-1 justify-center items-center">
    
        {/* Background Overlay */}
        <TouchableOpacity onPress={() => onCancel()} className="absolute bg-black opacity-50 w-full h-full"/>
            
        {/* Modal Content */}
        <View className="bg-zinc200 px-7 py-5 rounded-2xl w-[70%]">
                
          {/* HEADER */}
          <View className="flex-col items-center justify-center">
          
            {/* Title */}
            <Text className="w-full text-center text-theme800 font-bold py-1 text-[18px]">
              {prepName}
            </Text>
                      
            {/* DIVIDER */}
            <View className="h-[1px] bg-zinc400 mb-5 w-full"/>
          </View>

          {/* PROMPT */}
          <View className="flex flex-col justify-center items-center pb-5">
            <Text className="text-[14px] italic text-zinc600">
              This recipe has been used up.
            </Text>
            <Text className="text-[14px] italic text-zinc600">
              How would you like to proceed?
            </Text>
          </View>

          {/* BUTTONS */}
          <View className="flex flex-row px-3 justify-center items-center mb-1">
            <View className="flex flex-col w-4/5 justify-center items-center space-y-1">

              {/* Save */}
              <View className="flex flex-row w-full items-center space-x-1">
                <Icon
                  name={savePrep ? "checkbox" : "square-outline"}
                  color={colors.zinc600}
                  size={20}
                  onPress={() => setSavePrep(!savePrep)}
                />
                <Text className="text-[14px] text-theme700 font-semibold">
                  SAVE AS RECIPE
                </Text>
              </View>

              {/* Delete */}
              <View className="flex flex-row  w-full items-center space-x-1">
                <Icon
                  name={deletePrep ? "checkbox" : "square-outline"}
                  color={colors.zinc600}
                  size={20}
                  onPress={() => setDeletePrep(!deletePrep)}
                />
                <Text className="text-[14px] text-theme700 font-semibold">
                  DELETE MEAL PREP
                </Text>
              </View>
            </View>

            {/* Proceed */}
            <View className="flex w-1/5 justify-center items-end">
              <Icon
                name="checkmark-done-circle"
                color={colors.zinc800}
                size={36}
                onPress={() => onProceed()}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}


///////////////////////////////// EXPORT /////////////////////////////////

export default DeletePrepModal;