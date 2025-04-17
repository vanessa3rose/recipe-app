///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput } from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

import recipeAdd from '../../firebase/Recipes/recipeAdd';
import { recipeDelete } from '../../firebase/Recipes/recipeDelete';
import { spotlightDelete } from '../../firebase/Spotlights/spotlightDelete';
import { prepDelete } from '../../firebase/Prep/prepDelete';

// initialize Firebase App
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const ModMealModal = ({
    modalVisible, closeModal, editingId, setEditingId, editingData, setEditingData, defaultName, type
}) => {


  ///////////////////////////////// ON OPEN /////////////////////////////////  
  
  const [mealName, setMealName] = useState("");

  // if editing a meal, set the name
  useEffect(() => {
    if (modalVisible) {
      setMealName(editingData ? editingData[`${type}Name`] : type === "recipe" ? "Recipe " + defaultName : "");
    }
  }, [modalVisible]);


  ///////////////////////////////// SUBMITTING MODAL /////////////////////////////////

  const [isNameValid, setNameValid] = useState(true);

  // to submit the modal
  const submitModal = async () => {

    // if the name is empty
    if (mealName === "") { setNameValid(false); }

    // if the name has been filled in 
    else {
      setNameValid(true);
      
      // if editing a meal, stores the meal data
      if (editingId !== null) {
        try {  

          editingData[`${type}Name`] = mealName;
          setEditingData(editingData);

          // if a snapshot is being edited, determines whether the new name is different from the recipe's
          if (type === "spotlight" && editingData.recipeId !== null) {
            const docSnap = await getDoc(doc(db, 'recipes', editingData.recipeId)); 
            if (docSnap.exists()) { editingData.spotlightNameEdited = docSnap.data().recipeName !== mealName; }
          }

          updateDoc(doc(db, type + "s", editingId), editingData);  
          
          // closes the modal for editing
          exitModal("edit"); 

        } catch (error) {
          console.error('Error updating meal:', error);
        }
      
      // if adding a recipe
      } else if (type === "recipe") {
        try {
          recipeAdd({ recipeName: mealName, setRecipeId: setEditingId });
        } catch(e) {
          console.error('Error adding recipe:', e);
        }

        // closes the modal for adding recipes
        exitModal("add");
      }
    }
  };


  ///////////////////////////////// CLOSING MODAL /////////////////////////////////

  // to delete the meal
  const deleteMeal = () => {
    setEditingId(null);
    setEditingData(null);

    // db action
    if (type === "recipe") { recipeDelete(editingId, setEditingId, setEditingData) }
    else if (type === "spotlight") { spotlightDelete(editingId); }
    else if (type === "prep") { prepDelete(editingId); }

    // closes the modal
    exitModal("delete");
  }

  // to close the modal
  const exitModal = (action) => {
    closeModal(action);
    setMealName("");
  };
  
  
  ///////////////////////////////// HTML /////////////////////////////////
  
  return (

    // CONTAINER
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
        <View className="w-4/5 bg-zinc200 px-7 py-5 rounded-2xl">

          {/* HEADER */}
          <View className="flex-row justify-between">

            {/* Title */}
            <Text className="text-[20px] font-bold">
              {type === "recipe" ? editingId ? "EDIT RECIPE" : "NEW RECIPE" : ("CUSTOM " + (type === "prep" ? "MEAL " : "") + type.toUpperCase())}
            </Text>

            {/* BUTTONS */}
            <View className="flex flex-row items-center justify-center">
              
              {/* Check */}
              <Icon 
                size={24}
                color={'black'}
                name="checkmark"
                onPress={submitModal}
              />

              {/* X */}
              <Icon 
                size={24}
                color={'black'}
                name="close-outline"
                onPress={() => exitModal("")}
              />
            </View>
          </View>
                    
          
          {/* DIVIDER */}
          <View className="h-[1px] bg-zinc400 mb-4"/>


          {/* USER INPUT */}
          <View className="flex flex-row justify-evenly content-center mb-2 h-[50px]">

            {/* Meal Name */}
            <View className={`flex items-center justify-center border border-zinc500 bg-white rounded-md px-2 ${editingId !== null || type !== "recipe" ? "w-[90%]" : "w-5/6"}`}>
              <TextInput
                className="text-center mb-1 text-[14px] leading-[16px]"
                placeholder={editingId || type !== "recipe" ? mealName : ("Recipe " + defaultName)}
                placeholderTextColor={colors.zinc400}
                multiline={true}
                blurOnSubmit={true}
                value={mealName}
                onChangeText={setMealName}
              />
            </View>
            
            {/* if editing or not a recipe, delete option (trashcan) is available */}
            {(editingId !== null || type !== "recipe") &&
              <View className="flex justify-center items-center">
                <Icon 
                  size={24}
                  color={colors.theme600}
                  name="trash"
                  onPress={deleteMeal}
                />  
              </View>
            }
          </View>
                                
          {/* warning that appears if no name is given */}
          {!isNameValid &&
            <View className="flex flex-col items-center justify-center">

              {/* divider */}
              <View className="h-[1px] bg-zinc400 mt-2 mb-4 w-full"/>

              {/* warning */}
              <Text className="text-pink-600 italic">
                {type === "prep" ? "meal " : ""}{type}{" name is required"}
              </Text>
            </View>
          }
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ModMealModal;