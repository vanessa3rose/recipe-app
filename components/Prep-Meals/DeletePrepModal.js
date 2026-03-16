///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState } from 'react';

// UI components
import { Modal, View, Text, TouchableOpacity } from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';


///////////////////////////////// SIGNATURE /////////////////////////////////

const DeletePrepModal = ({ 
  prepData, visible, custom, onBoth, onSave, onDelete, onCancel
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
              {prepData.prepName}
            </Text>
                      
            {/* DIVIDER */}
            <View className="h-[1px] bg-zinc400 mb-5 w-full"/>
          </View>

          {/* PROMPT */}
          <View className="flex flex-col justify-center items-center pb-5">
            <Text className="text-[14px] italic text-zinc600 text-center">
              {`This ${prepData.variants.length > 1 ? "variant" : "meal prep"} has been used up.`}
            </Text>
            <Text className="text-[14px] italic text-zinc600 text-center">
              How would you like to proceed?
            </Text>
          </View>

          {/* BUTTONS */}
          <View className="flex flex-row justify-center items-center mb-1 space-x-5">
            <View className="flex flex-col justify-center items-end space-y-1">

              {/* Save */}
              {(custom === "currents") && (
                <View className="flex flex-row items-center space-x-1">
                  <Text className="text-[14px] text-theme700 font-semibold">
                    SAVE AS RECIPE
                  </Text>
                  <Icon
                    name={savePrep ? "checkbox" : "square-outline"}
                    color={colors.zinc600}
                    size={20}
                    onPress={() => setSavePrep(!savePrep)}
                  />
                </View>
              )}

              {/* Delete */}
              <View className="flex flex-row items-center space-x-1">
                <Text className="text-[14px] text-theme700 font-semibold">
                  {`DELETE ${prepData.variants.length > 1 ? "VARIANT" : "MEAL PREP"}`}
                </Text>
                <Icon
                  name={deletePrep ? "checkbox" : "square-outline"}
                  color={colors.zinc600}
                  size={20}
                  onPress={() => setDeletePrep(!deletePrep)}
                />
              </View>
            </View>

            {/* Proceed */}
            <View className="flex justify-center items-end">
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