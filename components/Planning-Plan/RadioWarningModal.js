///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React from 'react';

// UI components
import { Modal, View, Text, TouchableOpacity } from 'react-native';


///////////////////////////////// SIGNATURE /////////////////////////////////

const RadioWarningModal = ({ 
  prepName, prepDate, modalVisible, closeModal, submitModal,
}) => {

  
  ///////////////////////////////// HTML /////////////////////////////////

  return (

    <Modal
      transparent={true}
      visible={modalVisible}
      animationType="slide"
    >
      <View className="flex-1 justify-center items-center">

        {/* Background Overlay */}
        <View className="absolute bg-black opacity-50 w-full h-full"/>
            
        {/* Modal Content */}
        <View className="w-3/4 bg-zinc200 px-7 py-10 rounded-2xl">

          {/* Confirmation Text */}
            <Text className="text-[20px] font-bold text-center leading-[27.5px]">
              {"un-toggling this radio button will remove "}
            </Text>
            <Text className="text-[20px] font-bold text-center text-theme400 leading-[27.5px]">
              {prepName}
            </Text>
            <Text className="text-[20px] font-bold text-center leading-[27.5px]">
              {" as the meal prep for "}
            </Text>
            <Text className="text-[20px] font-bold text-center text-theme400 leading-[27.5px]">
              {prepDate}
            </Text>

            {/* divider */}
            <View className="h-[1px] bg-zinc400 m-5"/>

            {/* Warning */}
            <View className="flex justify-center items-center">
              <Text className="text-[15px] italic text-mauve700 font-medium">
                {"Would you like to proceed?"}
              </Text>
            </View>


          <View className="flex flex-row justify-around pt-8">

            {/* Delete Button */}
            <TouchableOpacity
              className="bg-theme500 p-2.5 rounded-[5px]"
              onPress={submitModal}
            >
              <Text className="text-white font-bold text-[16px]">PROCEED</Text>
            </TouchableOpacity>

              {/* Cancel Button */}
            <TouchableOpacity
                className="bg-zinc500 p-2.5 rounded-[5px]"
                onPress={closeModal}
            >
              <Text className="text-white font-bold text-[16px]">CANCEL</Text>
            </TouchableOpacity>

          </View>
        </View>
      </View>
    </Modal>
  );
}


///////////////////////////////// EXPORT /////////////////////////////////

export default RadioWarningModal;