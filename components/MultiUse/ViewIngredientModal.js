///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState } from 'react';

// UI components
import { Modal, View, Text, Linking, TouchableOpacity } from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// store lists
import storeKeys from '../../assets/storeKeys';
import storeLabels from '../../assets/storeLabels';

// validation
import extractUnit from '../Validation/extractUnit';


///////////////////////////////// SIGNATURE /////////////////////////////////

const ViewIngredientModal = ({ 
  modalVisible, setModalVisible, ingredient
}) => {

  
  ///////////////////////////////// STORE SELECTION /////////////////////////////////

  const [selectedStore, setSelectedStore] = useState(null);
  const [storeList, setStoreList] = useState(storeKeys);
  const [nameList, setNameList] = useState(storeLabels.map(label => label.toUpperCase()));

  // toggle store section visibility
  const toggleStoreSection = (store) => {

    setSelectedStore(selectedStore === store ? null : store);
        
    // reorders the store list to put the selected one first
    let keys = [...storeKeys];
    let labels = [...storeLabels.map(label => label.toUpperCase())];
    
    // only does so if there is a dropdown open; if not, will reset instead
    if (selectedStore !== store) {

      // creates and reorderspairs of abbreviation and name
      let storePairs = keys.map((key, index) => ({ key, label: labels[index] }));
      storePairs = [storePairs.find(pair => pair.key === store), ...storePairs.filter(pair => pair.key !== store)];
    
      // extracts reordered arrays
      keys = storePairs.map(pair => pair.key);
      labels = storePairs.map(pair => pair.label);
    }

    setStoreList(keys);
    setNameList(labels);
  };

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
        <TouchableOpacity 
          className="absolute bg-black opacity-50 w-full h-full"
          onPress={() => setModalVisible(false)}
        />

        {/* Modal Content */}
        <View className="flex w-4/5 bg-zinc200 px-7 py-5 rounded-2xl">
        
          {/* Title - Ingredient Name*/}
          <Text className="text-[20px] font-bold mb-0.5">{ingredient.ingredientName}</Text>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>

          {/* STORE SECTIONS */}
          {storeList.map((store, index) => (
            <View key={store}>
            {ingredient.ingredientData[store]?.brand !== "" &&
            <>

              {/* HEADER */}
              <View className="flex flex-row justify-center items-center mb-4 mr-2 space-x-2">
                {/* Store Name */}
                <Text
                  className="text-[18px] font-semibold text-zinc600 flex text-center"
                  onPress={() => toggleStoreSection(store)}
                >
                  {nameList[index]}
                </Text>

                {/* Link if Valid */}
                {ingredient.ingredientData[store]?.link && 
                <Icon
                  name="link"
                  color={colors.theme600}
                  size={20}
                  onPress={ingredient.ingredientData[store]?.link ? () => Linking.openURL(ingredient.ingredientData[store].link) : undefined}
                />
                }
              </View>

              {/* DETAILS */}
              <View className="flex z-40 justify-center items-center space-y-4">
                {selectedStore === store && (
                  <>
                    {/* Brand */}
                    <Text className="w-4/5 bg-zinc300 border-[1px] border-zinc350 py-1 text-theme700 text-center">
                        {ingredient.ingredientData[store].brand}
                    </Text>

                    <View className="pt-4 flex w-full space-y-2">

                      {/* Serving Size */}
                      <View className="flex flex-row justify-between items-center">
                        {/* label */}
                        <Text className="text-theme700 mr-4">
                          Serving Size
                        </Text>
                        {/* size and units */}
                        <Text className="flex-1 flex-row border-0.5 border-zinc500 bg-theme100 p-1 text-center text-[14px] leading-[17px]">
                          {ingredient.ingredientData[store].servingSize} {extractUnit(ingredient.ingredientData[store].unit, ingredient.ingredientData[store].servingSize)}
                        </Text>
                      </View>

                      {/* Servings / Container */}
                      <View className="flex flex-row justify-between items-center">
                        {/* label */}
                        <Text className="text-theme700 mr-4">
                          Servings Per Container
                        </Text>
                        {/* amount */}
                        <Text className="flex-1 bg-theme100 border-0.5 border-zinc500 p-1 text-center text-[14px] leading-[17px]">
                          {ingredient.ingredientData[store].servingContainer}
                        </Text>
                      </View>

                      {/* Calories / Serving */}
                      <View className="flex flex-row justify-between items-center">
                        {/* label */}
                        <Text className="text-theme700 mr-4">
                          Calories Per Container
                        </Text>
                        {/* calories */}
                        <Text className="flex-1 bg-theme100 border-0.5 border-zinc500 p-1 text-center text-[14px] leading-[17px]">
                          {ingredient.ingredientData[store].calContainer} {"cal"}
                        </Text>
                      </View>

                      {/* Price / Container */}
                      <View className="flex flex-row justify-between items-center mb-4">
                        {/* label */}
                        <Text className="text-theme700 mr-4">
                          Price Per Container
                        </Text>
                        {/* price */}
                        <Text className="flex-1 flex-row border-0.5 border-zinc500 p-1 bg-theme100 text-center">
                          {"$"}{ingredient.ingredientData[store].priceContainer}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* Divider */}
              <View className="mx-6 h-[1px] bg-zinc400 mb-4"/>
            </>
            }
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ViewIngredientModal;