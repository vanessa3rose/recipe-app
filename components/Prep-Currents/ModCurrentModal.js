///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect } from 'react';

// UI components
import { Modal, View, Text, TextInput } from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// validation
import validateFractionInput from '../Validation/validateFractionInput';

// firebase
import currentEdit from '../../firebase/Currents/currentEdit';

// initialize firebase app
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const ModCurrentModal = ({ 
  modalVisible, closeModal, initialData, editingId,
}) => {


  ///////////////////////////////// VARIABLES /////////////////////////////////

  // Ingredient Data
  const [ingredientName, setIngredientName] = useState('');
  const [calServing, setCalServing] = useState('');
  const [servingSize, setServingSize] = useState('');
  const [unit, setUnit] = useState('');


  ///////////////////////////////// MODAL FUNCTIONS /////////////////////////////////
    
  // if the submission is valid
  const [isNameValid, setNameValid] = useState(true);

  // to submit the modal
  const submitModal = async () => {

    // if the name is empty
    if (ingredientName === "") { setNameValid(false);  }

    // if the name has been filled in 
    else {
      setNameValid(true);
      
        // collects the ingredient's data
        let current = { ...initialData }
        current.ingredientData["-"] = { calServing, servingSize, unit };

        try {  
          
          // updates the ingredient
          currentEdit({
            editingId: editingId,
            amountLeft: current.amountLeft, 
            amountTotal: current.amountTotal, 
            archive: current.archive,
            check: current.check, 
            containerPrice: current.containerPrice, 
            ingredientData: current.ingredientData, 
            ingredientId: "", 
            ingredientName: ingredientName,
            ingredientStore: "-",
            ingredientTypes: current.ingredientTypes,
            unitPrice: current.unitPrice, 
          });
            
          // closes the modal
          exitModal(); 
            
        } catch (error) {
            console.error('Error updating ingredient:', error);
        }
    }
  };

  // to set up the modal on open
  const setupModal = async () => {
    setIngredientName(initialData.ingredientName || '');
    setCalServing(initialData.ingredientData[initialData.ingredientStore].calServing || '');
    setServingSize(initialData.ingredientData[initialData.ingredientStore].servingSize || '');
    setUnit(initialData.ingredientData[initialData.ingredientStore].unit);
  }

  // on open (ie, when the id or data changes)
  useEffect(() => {
    if (modalVisible) {
      setupModal();
    }
  }, [modalVisible]);


  // to close the modal
  const exitModal = () => {
    closeModal(ingredientName);

    // restore states
    setIngredientName("");
    setCalServing("");
    setServingSize("");
    setUnit("");
  };


  ///////////////////////////////// HTML /////////////////////////////////
  
  return (

    <Modal
      transparent={true}
      animationType="slide"
      visible={modalVisible}
      onRequestClose={exitModal}
    >
      <View className="flex-1 justify-center items-center">

        {/* Background Overlay */}
        <View className="absolute bg-black opacity-50 w-full h-full"/>
        
        {/* Modal Content */}
        <View className="flex w-4/5 bg-zinc200 px-7 py-5 rounded-2xl">

          {/* Title */}
          <Text className="text-[20px] font-bold">EDIT CURRENT INGREDIENT</Text>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>

          {/* CURRENT NAME */}
          <View className="flex flex-row justify-center items-center content-center mb-4 h-[60px] border-0.5 border-zinc500 bg-white rounded-md p-2 mx-2.5">
            <TextInput
              className="text-center pb-1 text-[14px] leading-[17px]"
              placeholder="Custom Ingredient Name"
              placeholderTextColor={colors.zinc400}
              multiline={true}
              blurOnSubmit={true}
              value={ingredientName}
              onChangeText={setIngredientName}
            />
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>

          {/* SERVING SIZE */}
          <View className="flex flex-row justify-between items-center mb-4">

            {/* Label */}
            <Text className="text-theme700 mr-4">
              Serving Size
            </Text>

            <View className="flex-1 flex-row items-center justify-center bg-theme100 border-0.5 border-zinc500 px-2">

              {/* Size */}
              <TextInput
                className="p-1 text-center text-[14px] leading-[17px]"
                placeholder="0 0/0"
                placeholderTextColor={colors.zinc400}
                value={servingSize}
                onChangeText={(value) => setServingSize(validateFractionInput(value))}
              />

              {/* Units */}
              <TextInput
                className="p-1 text-center text-[14px] leading-[17px]"
                placeholder="unit(s)"
                placeholderTextColor={colors.zinc400}
                value={unit}
                onChangeText={setUnit}
              />
            </View>
          </View>
          
          {/* CALORIES / SERVING */}
          <View className="flex flex-row justify-between items-center mb-4">
      
            {/* Label */}
            <Text className="text-theme700 mr-4">
              Calories Per Serving
            </Text>
    
            {/* Input */}
            <TextInput
              className="border-0.5 border-zinc500 bg-theme100 p-1 flex-1 text-center text-[14px] leading-[17px]"
              placeholder="0"
              placeholderTextColor={colors.zinc400}
              value={calServing}
              onChangeText={setCalServing}
            />
          </View>


          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>
            
          {/* BOTTOM ROW */}
          <View className="flex flex-row items-center justify-between">
            
            {/* Warning if no name is given */}
            {isNameValid ? "" : 
              <Text className="text-mauve600 italic">
                ingredient name is required
              </Text>
            }

            {/* BUTTONS */}
            <View className="flex flex-row justify-center items-center ml-auto">

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
                onPress={exitModal}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ModCurrentModal;