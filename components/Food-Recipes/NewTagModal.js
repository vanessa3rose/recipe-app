///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState } from 'react';

// UI components
import { Modal, View, Text, TextInput } from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';


///////////////////////////////// SIGNATURE /////////////////////////////////

// closeModal takes in the name of the new tag
const NewTagModal = ({ 
  modalVisible, closeModal 
}) => {


  ///////////////////////////////// VARIABLES /////////////////////////////////
  
  const [newTag, setNewTag] = useState("");             // the new tag's name
  const [isNameValid, setNameValid] = useState(true);   // for submission


  ///////////////////////////////// FUNCTIONS /////////////////////////////////

  // to submit the modal
  const submitModal = () => {

    // not a valid submission if the new tag name is blank
    if (newTag === "") {
      setNameValid(false);

    // otherwise, submit the new tag and close the modal
    } else {
      setNameValid(true);
      closeModal(newTag);
    }
  };


  ///////////////////////////////// HTML /////////////////////////////////

  return (

    // CONTAINER
    <Modal
      transparent={true}
      animationType="slide"
      visible={modalVisible}
      onRequestClose={() => closeModal("")} // Pass function reference here
    >
      <View className="flex-1 justify-center items-center">

        {/* Background Overlay */}
        <View className="absolute bg-black opacity-50 w-full h-full"/>
        
        {/* Modal Content */}
        <View className="w-4/5 bg-zinc200 px-7 py-5 rounded-2xl">
          
          {/* HEADER */}
          <View className="flex-row justify-between">

            {/* Title */}
            <Text className="text-[20px] font-bold w-1/3">NEW TAG</Text>
            
            
            {/* BUTTONS */}
            <View className="flex flex-row items-center justify-center">

              {/* Check */}
              <Icon
                size={24}
                color="black"
                name="checkmark"
                onPress={submitModal}
              />

              {/* X */}
              <Icon
                size={24}
                color="black"
                name="close-outline"
                onPress={() => closeModal("")}
              />
            </View>
          </View>


          {/* DIVIDER */}
          <View className="h-[1px] bg-zinc400 mb-4"/>
          
          
          {/* USER INPUT - new tag name*/}
          <View className="flex flex-row w-full justify-evenly items-center mb-2">
            <TextInput
              className="border-0.5 border-zinc500 bg-white rounded-md px-2 h-[30px] w-11/12 text-[14px] leading-[17px]"
              placeholder={"Tag Name"}
              placeholderTextColor={colors.zinc400}
              blurOnSubmit={true}
              value={newTag}
              onChangeText={(text) => {
                const capitalizedText = text
                  .split(' ')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                setNewTag(capitalizedText);
              }}
            />
          </View>
          
          
          {/* warning if there is no new tag name */}
          {!isNameValid && 
            <View className="flex flex-col items-center justify-center">
            
              {/* divider */}
              <View className="h-[1px] bg-zinc400 mt-2 mb-4 w-full"/>
            
              {/* warning */}
              <Text className="text-mauve600 italic">
                tag name is required
              </Text>
            </View>
          }
        </View>
      </View>
    </Modal>
  );
};
  


///////////////////////////////// EXPORT /////////////////////////////////

export default NewTagModal;