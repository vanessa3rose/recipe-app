///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect } from 'react';

// id
import { nanoid } from 'nanoid/non-secure';
const generateVariantId = () => nanoid(12);

// UI components
import { Modal, View, Text, TextInput } from 'react-native';
import { Picker } from '@react-native-picker/picker';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// validation
import extractUnit from '../Validation/extractUnit';
import { numberToRoman } from '../Validation/numberToRoman';

// firebase
import recipeAdd from '../../firebase/Recipes/recipeAdd';
import { recipeDelete } from '../../firebase/Recipes/recipeDelete';
import { spotlightDelete } from '../../firebase/Spotlights/spotlightDelete';
import { prepDelete } from '../../firebase/Preps/prepDelete';

// initialize firebase app
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
      setVariants(editingData?.variants || []);
    }
  }, [modalVisible]);


  ///////////////////////////////// VARIANTS /////////////////////////////////

  const [selectedVariant, setSelectedVariant] = useState(0);
  const [variants, setVariants] = useState([]);

  // to add a variant
  const addVariant = () => {
    setSelectedVariant(variants.length);

    setVariants([
      ...variants,
      {
        currentAmounts: ["", "", "", "", "", "", "", "", "", "", "", ""], 
        currentCals: ["", "", "", "", "", "", "", "", "", "", "", ""], 
        currentData: [null, null, null, null, null, null, null, null, null, null, null, null], 
        currentIds: ["", "", "", "", "", "", "", "", "", "", "", ""], 
        currentPrices: ["", "", "", "", "", "", "", "", "", "", "", ""],
        currentIncluded: ["", "", "", "", "", "", "", "", "", "", "", ""],
        prepCal: "0", 
        prepMult: 0,
        prepName: "",
        prepNote: "",
        prepPrice: "0.00", 
        variantId: generateVariantId(),
      }
    ]);
  }

  // to remove a variant
  const deleteVariant = () => {
    setVariants(variants.filter((_, i) => i !== selectedVariant));
    setSelectedVariant(0);
  }


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

          let newData = { ...editingData };
          newData[`${type}Name`] = mealName;

          // fixes variants
          if (type === "prep") {
            newData = {
              ...newData,
              variants: variants.map(v => ({ ...v, prepName: mealName, prepId: editingId }))
            };
          }

          setEditingData(newData);

          // if a snapshot is being edited, determines whether the new name is different from the recipe's
          if (type === "spotlight" && newData.recipeId !== null) {
            const docSnap = await getDoc(doc(db, 'RECIPES', newData.recipeId)); 
            if (docSnap.exists()) { newData.spotlightNameEdited = docSnap.data().recipeName !== mealName; }
          }

          updateDoc(doc(db, type.toUpperCase() + "S", editingId), newData);  
          
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
                color="black"
                name="checkmark"
                onPress={submitModal}
              />

              {/* X */}
              <Icon 
                size={24}
                color="black"
                name="close-outline"
                onPress={() => exitModal("")}
              />
            </View>
          </View>
                    
          
          {/* DIVIDER */}
          <View className="h-[1px] bg-zinc400 mb-4"/>


          {/* USER INPUT */}
          <View className="flex flex-row justify-center space-x-2 px-2 content-center mb-2 h-[50px]">

            {/* Meal Name */}
            <View className={`flex items-center justify-center border-0.5 border-zinc500 bg-white rounded-md px-2 ${editingId !== null || type !== "recipe" ? "w-[90%]" : "w-5/6"}`}>
              <TextInput
                className="w-full text-center mb-1 text-[14px] leading-[17px]"
                placeholder={(editingId || type !== "recipe") ? mealName : ("Recipe " + defaultName)}
                placeholderTextColor={colors.zinc400}
                multiline={true}
                blurOnSubmit={true}
                value={mealName}
                onChangeText={setMealName}
              />
            </View>
            
            {/* if editing or not a recipe, delete option (trashcan) is available */}
            {(editingId !== null || type !== "recipe") && (
              <View className="flex justify-center items-center">
                <Icon 
                  size={24}
                  color={colors.theme600}
                  name="trash"
                  onPress={deleteMeal}
                />  
              </View>
            )}
          </View>


          {/* VARIANTS FOR PREP */}
          {(type === "prep") && (
            <View className="flex flex-col justify-center items-center">

              {/* divider */}
              <View className="h-[1px] bg-zinc400 mt-4 mb-4 w-full"/>

              {/* top */}
              <View className="relative flex flex-row w-3/5 justify-center items-center">
                {/* multiplicity */}
                <View className="absolute z-50 left-[-30px] px-2 rounded-l-xl h-full justify-center items-center border-l border-y border-zinc400 bg-zinc100">
                  <Text className="text-[12px] text-zinc600">
                    {`x${variants?.[selectedVariant]?.prepMult}`}
                  </Text>
                </View>

                {/* selection */}
                <View className="flex w-full overflow-hidden">
                  <Picker
                    selectedValue={selectedVariant}
                    onValueChange={setSelectedVariant}
                    style={{ height: 30, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -20, backgroundColor: colors.zinc400 }}
                    itemStyle={{ color: 'white', fontWeight: '600', textAlign: 'center', fontSize: 14, }}
                  >
                    {variants.map((_, index) => (
                        <Picker.Item
                          key={index}
                          label={"variant " + numberToRoman(index + 1)}
                          value={index}
                        />
                      ))
                    }
                  </Picker>
                </View>

                {/* deletion */}
                {(variants.length > 1) && (
                  <View className="absolute right-1.5">
                    <Icon
                      name="close"
                      size={18}
                      color="black"
                      onPress={() => deleteVariant()}
                    />
                  </View>
                )}

                {/* addition */}
                <View className="absolute right-[-40px]">
                  <Icon
                    name="duplicate"
                    size={18}
                    onPress={() => addVariant()}
                    color={colors.zinc800}
                  />
                </View>
              </View>

              {/* details */}
              {(variants[selectedVariant]?.currentData?.filter(curr => curr !== null).length !== 0) ? (
                <View className="flex flex-col mt-2 bg-theme100 border border-zinc300 w-full">
                  <View className="flex flex-col">
                    {/* SPECIFICS */}
                    {(variants[selectedVariant]?.currentData?.filter(curr => curr !== null).map((curr, idx) => (
                      <View key={idx} className="flex flex-row flex-wrap items-stretch border border-zinc400">

                        {/* Name */}
                        <View className="flex-1 bg-theme200 p-2 self-stretch justify-center">
                          <Text className="text-[11px] font-medium text-center">
                            {curr.ingredientName}
                          </Text>
                        </View>

                        {/* Details */}
                        <View className="flex flex-col p-2 self-stretch justify-center">
                          <Text className="text-[11px] text-left">
                            {`${variants?.[selectedVariant]?.currentAmounts?.[idx]} ${extractUnit(curr.ingredientData[curr.ingredientStore].unit, variants?.[selectedVariant]?.currentAmounts[idx] || 0)}`}
                          </Text>
                          <Text className="text-[11px] text-left">
                            {`${(variants?.[selectedVariant]?.currentCals?.[idx] || 0)?.toFixed(0)} cal, $${(variants?.[selectedVariant]?.currentPrices?.[idx] || 0)?.toFixed(2)}`}
                          </Text>
                        </View>
                      </View>
                    )))}

                    {/* OVERALL */}
                    <View className="flex flex-row bg-zinc400 space-x-2 justify-center p-1">
                      <Text className="italic font-medium text-[10px]">{`${variants?.[selectedVariant]?.prepCal} CAL`}</Text>
                      <Text className="italic font-medium text-[10px]">{`$${variants?.[selectedVariant]?.prepPrice}`}</Text>
                    </View>
                  </View>
                </View>

              // simple preps
              ) : (variants?.[selectedVariant]?.currentData?.length === 0) && (
                <View className="flex mt-2 bg-theme100 w-4/5 border-[1.5px] border-theme200">
                  <View className="flex flex-row w-full justify-center items-center">
                    
                    {/* details */}
                    <View className="flex flex-col w-2/5 px-2 justify-center items-center">
                      <Text className="italic font-medium text-[10px] text-center">{`${variants?.[selectedVariant]?.prepCal} calories`}</Text>
                      <Text className="italic font-medium text-[10px] text-center">{`$${variants?.[selectedVariant]?.prepPrice}`}</Text>
                    </View>

                    {/* notes */}
                    <View className="flex w-3/5 py-3 px-2 bg-theme200 justify-center items-center">
                      <Text className="italic font-medium text-[10px] text-center">
                        {`${(variants?.[selectedVariant]?.prepNote === "") ? "no notes" : variants?.[selectedVariant]?.prepNote}`}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

                                
          {/* warning that appears if no name is given */}
          {!isNameValid && (
            <View className="flex flex-col items-center justify-center">

              {/* divider */}
              <View className="h-[1px] bg-zinc400 mt-2 mb-4 w-full"/>

              {/* warning */}
              <Text className="text-mauve600 italic">
                {type === "prep" ? "meal " : ""}{type}{" name is required"}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ModMealModal;