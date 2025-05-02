///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, ScrollView, Linking, TouchableOpacity } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

import extractUnit from '../Validation/extractUnit';


///////////////////////////////// SIGNATURE /////////////////////////////////

const ViewIngredientModal = ({ 
  modalVisible, setModalVisible, ingredientData,
}) => {

  ///////////////////////////////// STORE SELECTION /////////////////////////////////

  const [selectedStore, setSelectedStore] = useState(null);
  const [storeList, setStoreList] = useState(['a', 'mb', 'sm', 'ss', 't', 'w']);
  const [nameList, setNameList] = useState(['ALDI', 'MARKET BASKET', 'STAR MARKET', 'STOP & SHOP', 'TARGET', 'WALMART']);

  // toggle store section visibility
  const toggleStoreSection = (store) => {

    setSelectedStore(selectedStore === store ? null : store);
    
    // reorders the store list to put the selected one first
    let abrv = ['a', 'mb', 'sm', 'ss', 't', 'w'];
    let name = ['ALDI', 'MARKET BASKET', 'STAR MARKET', 'STOP & SHOP', 'TARGET', 'WALMART']
    
    // only does so if there is a dropdown open; if not, will reset instead
    if (selectedStore !== store) {

      // creates and reorderspairs of abbreviation and name
      let storePairs = abrv.map((abbr, index) => ({ abbr, name: name[index] }));
      storePairs = [storePairs.find(pair => pair.abbr === store), ...storePairs.filter(pair => pair.abbr !== store)];
    
      // extracts reordered arrays
      abrv = storePairs.map(pair => pair.abbr);
      name = storePairs.map(pair => pair.name);
    }

    setStoreList(abrv);
    setNameList(name);
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
          <Text className="text-[20px] font-bold">{ingredientData.ingredientName}</Text>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>

          {/* STORE SECTIONS */}
          {storeList.map((store, index) => (
            <View key={store}>
            {ingredientData[`${store}Brand`] !== "" &&
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
                {ingredientData?.[`${store}Link`] && 
                <Icon
                  name="link"
                  color={colors.theme600}
                  size={20}
                  onPress={ingredientData?.[`${store}Link`] ? () => Linking.openURL(ingredientData[`${store}Link`]) : undefined}
                />
                }
              </View>

              {/* DETAILS */}
              <View className="flex z-40 justify-center items-center space-y-4">
                {selectedStore === store && (
                  <>
                    {/* Brand */}
                    <Text className="w-4/5 bg-zinc300 border-[1px] border-zinc350 py-1 text-theme700 text-center">
                        {ingredientData[`${store}Brand`]}
                    </Text>

                    <View className="flex w-full space-y-2">

                      {/* Serving Size */}
                      <View className="flex flex-row justify-between items-center">
                        {/* label */}
                        <Text className="text-theme700 mr-4">
                          Serving Size
                        </Text>
                        {/* size and units */}
                        <Text className="flex-1 flex-row border border-zinc500 bg-theme100 p-1 text-center text-[14px] leading-[16px]">
                          {ingredientData[`${store}ServingSize`]} {extractUnit(ingredientData[`${store}Unit`], ingredientData[`${store}ServingSize`])}
                        </Text>
                      </View>

                      {/* Servings / Container */}
                      <View className="flex flex-row justify-between items-center">
                        {/* label */}
                        <Text className="text-theme700 mr-4">
                          Servings Per Container
                        </Text>
                        {/* amount */}
                        <Text className="flex-1 bg-theme100 border border-zinc500 p-1 text-center text-[14px] leading-[16px]">
                          {ingredientData[`${store}ServingContainer`]}
                        </Text>
                      </View>

                      {/* Calories / Serving */}
                      <View className="flex flex-row justify-between items-center">
                        {/* label */}
                        <Text className="text-theme700 mr-4">
                          Calories Per Container
                        </Text>
                        {/* calories */}
                        <Text className="flex-1 bg-theme100 border border-zinc500 p-1 text-center text-[14px] leading-[16px]">
                          {ingredientData[`${store}CalContainer`]} {"cal"}
                        </Text>
                      </View>

                      {/* Price / Container */}
                      <View className="flex flex-row justify-between items-center mb-4">
                        {/* label */}
                        <Text className="text-theme700 mr-4">
                          Price Per Container
                        </Text>
                        {/* price */}
                        <Text className="flex-1 flex-row border border-zinc500 p-1 bg-theme100 text-center">
                          {"$"}{ingredientData[`${store}PriceContainer`]}
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