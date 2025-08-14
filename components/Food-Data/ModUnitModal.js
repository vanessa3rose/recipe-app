///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect } from 'react';

// UI components
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView, Image, FlatList } from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// store lists
import storeKeys from '../../assets/storeKeys';

// initialize firebase app
import { getFirestore, doc, writeBatch } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const ModUnitModal = ({ 
  modalVisible, setModalVisible, closeModal, 
  initialBrandLists,
  ingredientsSnapshot, recipeSnapshot, spotlightSnapshot
}) => {


  ///////////////////////////////// ON OPEN /////////////////////////////////

  // stores given data on open
  useEffect(() => {
    if (modalVisible) {

      // gets the ingredients
      storeData();
    }
  }, [modalVisible]);  

  const [ingredients, setIngredients] = useState(null);

  // to put the initial (provided) data in states
  const storeData = () => {
 
    // stores the ingredient snapshot as a map of data
    let ingredients = ingredientsSnapshot.docs.map((ingredient) => {
      return {
        id: ingredient.id,    
        ...ingredient.data(),  
      };
    });

    setIngredients(ingredients);

    // retrieves the units
    fetchUnits(ingredients);
  }

  // to retrieve and sort all brands
  const fetchUnits = (ingredientList) => {
    let uniqueList = [];

    // loops over all ingredients and stores
    ingredientList.map((ingredient) => {
      storeKeys.map((store) => {

        // adds unique units
        if (ingredient?.ingredientData?.[store]?.unit !== "" && !uniqueList.includes(ingredient?.ingredientData?.[store]?.unit)) {
          uniqueList.push(ingredient?.ingredientData?.[store]?.unit);
        }
      })
    })

    // sorts alphabetically
    uniqueList = uniqueList.sort((a,b) => a.localeCompare(b));

    // stores the values
    setUnitList(uniqueList);
    setFilteredUnitList(uniqueList);
  }
  
  
  ///////////////////////////////// UNIT LIST /////////////////////////////////

  // to indicate which dropdown is open
  const [unitDropdownOpen, setUnitDropdownOpen] = useState("");

  // to set the unit of the dropdowns
  const [oldUnit, setOldUnit] = useState("");
  const [newUnit, setNewUnit] = useState("");

  // overall unit list
  const [unitList, setUnitList] = useState(null);
  const [filteredUnitList, setFilteredUnitList] = useState(null);

  // to filter the units
  const filterUnitList = (value) => {
    let uniqueList = unitList.filter(unit => unit.toLowerCase().includes(value.toLowerCase()));

    // resets filtering if it doesn't match any
    if (uniqueList.length === 0) {
      setOldUnit(oldUnit);
    // stores the value if it matches at least one
    } else {
      setFilteredUnitList(uniqueList);
      setOldUnit(value);
      setUnitDropdownOpen(true);
    }
  }

  // to choose a unit
  const pickUnit = (value) => {
    // sets the value and closes the dropdown
    setOldUnit(value)
    setUnitDropdownOpen(false);
  }

  // to change a unit's value
  const changeUnit = () => {

    // maps over all ingredients and stores
    let newIngredients = ingredients.map((ingredient) => {
      let updatedIngredientData = { ...ingredient.ingredientData };

      storeKeys.forEach((store) => {

        // updates if unit has changed
        if (updatedIngredientData[store]?.unit === oldUnit) {
          updatedIngredientData[store] = {
            ...updatedIngredientData[store],
            unit: newUnit,
          };
        }
      });

      return {
        ...ingredient,
        ingredientData: updatedIngredientData,
      };
    });

    // stores the new data
    setIngredients(newIngredients);

    // recollects the unit list
    fetchUnits(newIngredients);

    // sets the value
    setOldUnit(newUnit);
    setNewUnit("");
  }


  ///////////////////////////////// SUBMITTING MODAL /////////////////////////////////
  
  // when the checkmark is clicked to submit changes
  const submitModal = async () => { 
    setModalVisible(false);

    // creates a batch to update ingredients, recipes, and spotlights
    const batch = writeBatch(db);

    // to collect the ids that change and their corresponding data
    const changedIds = [];
    const changedData = [];

    // recollects the initial ingredients
    const oldIngredientsMap = new Map(ingredientsSnapshot.docs.map(doc => [doc.id, doc.data()]));

    // loops over the current ingredients
    ingredients.forEach((newIngredient) => {

      // if the current ingredient is found
      const oldIngredient = oldIngredientsMap.get(newIngredient.id);
      if (oldIngredient) {

        // compares their data
        let oldData = oldIngredient.ingredientData;
        let newData = newIngredient.ingredientData;

        // if they don't match, update the ingredient in the db and store the changes in the arrays
        if (storeKeys.some(store => oldData[store].unit !== newData[store].unit)) {
          batch.update(doc(db, 'INGREDIENTS', newIngredient.id), { ingredientData: newData });
          changedIds.push(newIngredient.id);
          changedData.push(newData);
        }
      }
    });

    // updates recipes with the new ingredient types
    recipeSnapshot.docs.forEach((recipe) => {
          
      // store the old data
      let recipeData = recipe.data();
      let changedRecipe = false;

      // if the current recipe's current ingredient has been changed, update it
      for (let i = 0; i < 12; i++) {
        if (changedIds.includes(recipe.data().ingredientIds[i])) {
          changedRecipe = true;
          recipeData.ingredientData[i] = changedData[changedIds.indexOf(recipe.data().ingredientIds[i])];
        }
      } 
          
      // change it in the db
      if (changedRecipe) { batch.update(doc(db, 'RECIPES', recipe.id), recipeData); }
    })

    // updates spotlights with the new ingredient types
    spotlightSnapshot.docs.forEach((spotlight) => {
          
      // store the old data
      let spotlightData = spotlight.data();
          let changedSpotlight = false;

      // if the current spotlight's current ingredient has been changed, update it
      for (let i = 0; i < 12; i++) {
        if (changedIds.includes(spotlight.data().ingredientIds[i])) {
          changedSpotlight = true;
          spotlightData.ingredientData[i] = changedData[changedIds.indexOf(spotlight.data().ingredientIds[i])];
        }
      }
          
      // change it in the db
      if (changedSpotlight) { batch.update(doc(db, 'SPOTLIGHTS', spotlight.id), spotlightData); }
    })

    // batches the changes and closes the modal
    await batch.commit();
    closeModal();
  }

  
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
        <View className="absolute bg-black opacity-50 w-full h-full"/>
        
        {/* Modal Content */}
        <View className="flex w-4/5 py-5 px-2 bg-zinc200 rounded-xl border-[1px] border-zinc-400">
          
          {/* HEADER */}
          <View className="flex flex-row justify-between px-4">

            {/* title */}
            <Text className="font-bold text-[16px] text-center text-black">
              INGREDIENT UNITS
            </Text>

            
            {/* Buttons */}
            <View className="flex flex-row justify-center items-center ml-auto">

              {/* check (submit) */}
              <Icon 
                size={24}
                color="black"
                name="checkmark"
                onPress={submitModal}
              />

              {/* X (close) */}
              <Icon 
                size={24}
                color="black"
                name="close-outline"
                onPress={() => setModalVisible(false)}
              />
            </View>
          </View>

            
          {/* Divider */}
          <View className="h-[1px] bg-zinc400 m-2 mb-4"/>



          {/* UNIT INPUT */}
          <View className="flex flex-col justify-center items-center space-y-2 py-4">
            <View className="flex flex-row">

              {/* Old Input */}
              <View className={`flex justify-center items-center bg-theme200 border-[1px] border-zinc400 ${unitDropdownOpen ? "rounded-t-lg" : "rounded-lg"} ${(oldUnit !== "" && !unitDropdownOpen) ? "w-2/5" : "w-3/4"}`}>
                <View className={`flex w-full justify-center items-center`}>
                  <TextInput
                    value={oldUnit}
                    onChangeText={(value) => filterUnitList(value)}
                    placeholder="unit"
                    placeholderTextColor={colors.zinc500}
                    className="flex w-full p-2 pl-1 pr-6 text-[14px] text-center leading-[17px]"
                    onFocus={() => filterUnitList(oldUnit)}
                    multiline={true}
                    blurOnSubmit={true}
                  />
                              
                  {/* Toggle / Clear Dropdown Button */}
                  <View className="absolute right-2">
                    <Icon
                      name={!unitDropdownOpen ? "chevron-down-outline" : "close"}
                      size={18}
                      color={colors.zinc700}
                      onPress={() => {!unitDropdownOpen ? filterUnitList(oldUnit) : pickUnit("")}}
                    />
                  </View>
                </View>
            
                {/* Unit Dropdown */}
                {(unitDropdownOpen && filteredUnitList?.length > 0) && (
                  <View className="flex border border-zinc400 bg-white z-50">
                    <ScrollView className="max-h-[300px]">
                      {filteredUnitList.map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          className="flex flex-row justify-center items-center p-2.5 border-b-[1px] border-zinc300"
                          onPress={() => pickUnit(item)}
                        >
                          {/* name */}
                          <Text className="text-black text-[12.5px] w-full text-center pl-[35px] mr-[35px]">
                            {item}
                          </Text>
                          
                          {/* selected indicator */}
                          {(item === oldUnit) && (
                            <View className="absolute right-2">
                              <Icon
                                name="checkmark"
                                size={20}
                                color={colors.theme700}
                              />
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>


              {/* if editing is available */}
              {(oldUnit !== "" && !unitDropdownOpen) && (
                <>
                  {/* Change Button */}
                  <View className="justify-center items-center px-2">
                    <Icon
                      name="shuffle"
                      size={20}
                      onPress={() => changeUnit()}
                    />
                  </View>

                  {/* New Input */}
                  <View className={`flex flex-row w-1/3 h-full justify-center items-center bg-theme200 border-[1px] border-zinc400 ${unitDropdownOpen === "-" ? "rounded-t-lg" : "rounded-lg"}`}>
                    <TextInput
                      value={newUnit}
                      onChangeText={setNewUnit}
                      placeholder="unit"
                      placeholderTextColor={colors.zinc500}
                      className="flex w-full p-2 text-[14px] text-center leading-[17px]"
                      multiline={true}
                      blurOnSubmit={true}
                    />
                  </View>
                </>
              )}
            </View>
          </View>


          {/* INGREDIENT LIST */}
          {(oldUnit !== "" && !unitDropdownOpen) && (
            <View className="flex flex-col my-5 mx-10 py-4 bg-zinc300 border-2 border-zinc350">

              {/* Label */}
              <Text className="text-[12px] font-bold text-center text-theme900">
                INCLUDED INGREDIENTS:
              </Text>
            
              {/* Divider */}
              <View className="h-[1px] bg-zinc400 m-2 mb-5"/>

              {/* Bulleted List */}
              <ScrollView className="max-h-[235px] space-y-3 px-5">
                {ingredients?.sort((a,b) => a.ingredientName.localeCompare(b.ingredientName)).map((ingredient, index) => (
                  storeKeys?.map(store => ingredient.ingredientData[store].unit).includes(oldUnit) && (
                    <View key={index} className="flex flex-row space-x-2">
                      {/* bullet point */}
                      <Text className="text-left text-zinc900">
                        {"⁃"}
                      </Text>
                      {/* name */}
                      <Text className="text-left text-zinc900">
                        {ingredient.ingredientName}
                      </Text>
                    </View>
                  )
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ModUnitModal;