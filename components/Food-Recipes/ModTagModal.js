///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput } from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// initialize Firebase App
import { getFirestore, doc, updateDoc, collection, getDocs, getDoc, writeBatch } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

// closeModal takes in the name of the new tag
const ModTagModal = ({ modalVisible, closeModal, currTag }) => {


  ///////////////////////////////// VARIABLES /////////////////////////////////
  
  const [newTag, setNewTag] = useState("");             // the new tag's name
  const [isNameValid, setNameValid] = useState(true);   // for submission

  // stores the OG name on open
  useEffect(() => {
    if (modalVisible) {
      setNewTag(currTag);
    }
  }, [modalVisible])


  ///////////////////////////////// EDITING /////////////////////////////////

  const [currEditData, setCurrEditData] = useState(null);

  // to submit the modal
  const editTag = async () => {

    // not a valid submission if the new tag name is blank
    if (newTag === "") {
        setNameValid(false);

    // otherwise, submit the new tag and close the modal
    } else {
      setNameValid(true);

      try {
        // initializes a Firestore write batch
        const recipeBatch = writeBatch(db);
        
        // gets all of the recipes
        const recipesSnapshot = await getDocs(collection(db, 'recipes'));

        // stores the id of the global recipe
        const globalId = await getDoc(doc(db, 'globals', 'recipe'));

        // loops through the recipes and adds all found tags
        recipesSnapshot.forEach((recipe) => {
          const data = recipe.data();
          const tags = data.recipeTags;
          const tagList = [];
        
          tags.forEach((tag) => {
              // adds the tag as normal if it is not the one being changed
              if (tag !== currTag) { tagList.push(tag); }
              // adds the updated tag if it is the one being changed
              else { tagList.push(newTag); }
          });

          // removes duplicates and sorts alphabetically
          const uniqueTags = [...new Set(tagList)]
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        
          // stores the updated data
          data.recipeTags = uniqueTags;

          // only updates db if the tag list has changed
          if (JSON.stringify(tags) !== JSON.stringify(tagList)) {
            recipeBatch.update(doc(db, 'recipes', recipe.id), data);
          }
        
          // finds the global recipe and stores the data globally
          if (globalId && globalId.data().id === recipe.id) {
            setCurrEditData(data);
          }
        });

        // commit the recipe batch
        await recipeBatch.commit();
    
      } catch (e) {
        console.error("Error changing tags: ", e);
      }
    }
  };

  // when the current recipe tag is edited
  useEffect(() => {
    closeModal(currEditData);
  }, [currEditData]);


  ///////////////////////////////// DELETING /////////////////////////////////

  const [currDeleteData, setCurrDeleteData] = useState(null);

  // to delete a tag
  const deleteTag = async () => {

    try {
      // initializes a Firestore write batch
      const recipeBatch = writeBatch(db);
      
      // gets all of the recipes
      const recipesSnapshot = await getDocs(collection(db, 'recipes'));

      // stores the id of the global recipe
      const globalId = await getDoc(doc(db, 'globals', 'recipe'));
      
      // loops through the recipes and adds all found tags
      recipesSnapshot.forEach((recipe) => {
        const data = recipe.data();
        const tags = data.recipeTags;
        const tagList = [];
      
        tags.forEach((tag) => {
            // only adds the one not being deleted
            if (tag !== currTag) { tagList.push(tag); }
        });
      
        // stores the updated data
        data.recipeTags = tagList;

        // only updates db if the tag list has changed
        if (JSON.stringify(tags) !== JSON.stringify(tagList)) {
          recipeBatch.update(doc(db, 'recipes', recipe.id), data);
        }
      
        // finds the global recipe and stores the data globally
        if (globalId && globalId.data().id === recipe.id) {
          setCurrDeleteData(data);
        }
      });

      // commit the recipe batch
      await recipeBatch.commit();
  
    } catch (e) {
      console.error("Error changing tags: ", e);
    }
  };

  // when the current recipe tag is deleted
  useEffect(() => {
    closeModal(currDeleteData);
  }, [currDeleteData]);


  ///////////////////////////////// HTML /////////////////////////////////

  return (

    // CONTAINER
    <Modal
      transparent={true}
      animationType="slide"
      visible={modalVisible}
      onRequestClose={closeModal}
    >
      <View className="flex-1 justify-center items-center">

        {/* Background Overlay */}
        <View className="absolute bg-black opacity-50 w-full h-full"/>
        
        {/* Modal Content */}
        <View className="w-4/5 bg-zinc200 px-7 py-5 rounded-2xl">
        
          {/* HEADER */}
          <View className="flex-row justify-between">
  
            {/* Title */}
            <Text className="text-[20px] font-bold w-1/3">EDIT TAG</Text>


            {/* BUTTONS */}
            <View className="flex flex-row items-center justify-center">

              {/* Check */}
              <Icon
                size={24}
                color={'black'}
                name="checkmark"
                onPress={editTag}
              />

              {/* X */}
              <Icon
                size={24}
                color={'black'}
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
              className="border-0.5 border-zinc500 bg-white rounded-md px-2 h-[30px] w-3/4 text-[14px] leading-[16px]"
              placeholder={currTag}
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
   
            {/* Delete */}
            <Icon
              size={24}
              color={colors.theme700}
              name="trash"
              onPress={deleteTag}
            />
          </View>


          {/* warning if there is no new tag name */}
          {!isNameValid && 
            <View className="flex flex-col items-center justify-center">

              {/* divider */}
              <View className="h-[1px] bg-zinc400 mt-2 mb-4 w-full"/>
            
              {/* warning */}
              <Text className="text-pink-600 italic">
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

export default ModTagModal;