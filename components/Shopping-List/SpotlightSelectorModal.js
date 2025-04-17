///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// initialize Firebase App
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const SpotlightSelectorModal = ({ 
  spotlightsSnapshot, spotlightsSelected, spotlightsIds, modalVisible, setModalVisible, submitModal
}) => {


  ///////////////////////////////// ON OPEN /////////////////////////////////

  // when the modal opens, load in the lists of ingredients and selected spotlights
  useEffect(() => {
    if (modalVisible) {
      getIngredientDetails();
      sortData();
    }
  }, [modalVisible]);


  ///////////////////////////////// INGREDIENTS /////////////////////////////////

  const [ingredientIdList, setIngredientIdList] = useState(null);
  const [ingredientIncludedList, setIngredientIncludedList] = useState(null);

  // to load in the lists of ingredients
  const getIngredientDetails = async () => {

    // gets the store shopping lists
    const aSnap = await getDoc(doc(db, 'shopping', 'aList'));
    const mbSnap = await getDoc(doc(db, 'shopping', 'mbList'));
    const smSnap = await getDoc(doc(db, 'shopping', 'smList'));
    const ssSnap = await getDoc(doc(db, 'shopping', 'ssList'));
    const tSnap = await getDoc(doc(db, 'shopping', 'tList'));
    const wSnap = await getDoc(doc(db, 'shopping', 'wList'));
    
    // a set containing the ids of the shopping list ingredients
    const idList = {
      a: aSnap.data().id,
      mb: mbSnap.data().id,
      sm: smSnap.data().id,
      ss: ssSnap.data().id,
      t: tSnap.data().id,
      w: wSnap.data().id,
    };

    // a set containing the inclusions of the shopping list ingredients
    const includedList = {
      a: aSnap.data().included,
      mb: mbSnap.data().included,
      sm: smSnap.data().included,
      ss: ssSnap.data().included,
      t: tSnap.data().included,
      w: wSnap.data().included,
    };
    
    // stores the lists
    setIngredientIdList(idList);
    setIngredientIncludedList(includedList);
  }


  ///////////////////////////////// SORTING LOGIC /////////////////////////////////

  const [selected, setSelected] = useState(null);
  const [spotlightData, setSpotlightData] = useState(null);
  const [ids, setIds] = useState(null);

  // sorts data alphabetically on open
  const sortData = () => {

    // sorts and stores the snapshot 
    const sortedDocs = spotlightsSnapshot.docs
      .slice()
      .sort((a, b) => a.data().spotlightName.localeCompare(b.data().spotlightName));

    setSpotlightData(sortedDocs);
    
    // to collect the sorted selections
    let sortedIds = [];
    let sortedSelected = [];

    sortedDocs.forEach((spotlight) => {
      if (spotlightsIds.includes(spotlight.id)) {
        sortedIds.push(spotlightsIds[spotlightsIds.indexOf(spotlight.id)])
        sortedSelected.push(spotlightsSelected[spotlightsIds.indexOf(spotlight.id)])
      }
    })

    // stores data
    setIds(sortedIds);
    setSelected(sortedSelected);
  }


  ///////////////////////////////// SELECTED LOGIC /////////////////////////////////

  const [showIngredientIndex, setShowIngredientIndex] = useState(-1);

  // when a checkbox is toggled
  const changeSelected = (index, id) => {
    
    // stores the selected index if it changes to true
    if (!selected[index]) { setShowIngredientIndex(index); }
    // resets it otherwise
    else { setShowIngredientIndex(-1); }

    // stores the selection
    setSelected((prevState) => {
      const updatedSelected = [...prevState];
      updatedSelected[index] = !selected[index];
      return updatedSelected;
    });
  }

  // when the index of the spotlight to show changes
  useEffect(() => {

    const idList = [];
    
    // loops over the spotlights snapshot
    spotlightData?.forEach((spotlight, index) => {

        // if the current spotlight is the one to show
        if (index === showIngredientIndex) {

          // loops over the ingredients list of the spotlight
          spotlight.data().ingredientIds.forEach((ingredientId) => {

            // if the id is not null, adds the id to the list
            if (ingredientId) {
              idList.push(ingredientId);
            }
          });
        }
      });
      
    // if the index of the shown spotlight is valid, update the ingredient inclusions
    if (showIngredientIndex !== -1) {
      updateIncludedList(idList);
    } else {
      setCurrIncluded(null);      
    }
  }, [showIngredientIndex]);

  
  ///////////////////////////////// CHECK / INCLUDED /////////////////////////////////

  const [currIncluded, setCurrIncluded] = useState(null);

  // to retrieve whether the each ingredient in the list is included
  const updateIncludedList = (idList) => {
    if (ingredientIdList !== null) {
      
      const includedList = [];

      // loops over the list of ingredient ids
      for (var i = 0; i < idList.length; i++) {
        
        // finds the store and index of the current ingredient id in ingredientIdList
        const obj = Object.entries(ingredientIdList).map(([key, list]) => ({ 
          [key]: list.indexOf(idList[i]) 
        })).find(entry => Object.values(entry)[0] !== -1);
      
        // if the previous object was valid, the ingredient was found
        if (obj) {
          const store = Object.keys(obj)[0];   
          const index = obj[store];
  
          // adds whether the ingredient was included 
          includedList.push(ingredientIncludedList[store][index])

        // if the ingredient was not found in any store, mark it as not included
        } else { includedList.push(false); }
      }

      setCurrIncluded(includedList);
    }
  }

  // to update a specific ingredient's inclusion
  const updateIncluded = (id, index) => {
    
    // stores the opposite included value
    const newValue = !currIncluded[index] || false;

    // sets the current inclusion in the state
    setCurrIncluded((prevState) => {
      const updatedIncluded = [...prevState];
      updatedIncluded[index] = newValue;
      return updatedIncluded;
    });

    // stores the old included and id lists
    let includedList = ingredientIncludedList;
    let idList = ingredientIdList;

    // finds the store and index of the current ingredient id in ingredientIdList
    const obj = Object.entries(ingredientIdList).map(([key, list]) => ({ 
      [key]: list.indexOf(id) 
    })).find(entry => Object.values(entry)[0] !== -1);
  
    // if the previous object was valid, the ingredient was found
    if (obj) {
      const store = Object.keys(obj)[0];   
      const index = obj[store];
      
      // updates the inclusion
      includedList[store][index] = newValue;


    // if the ingredient was not found in any store, mark it as not included
    } else {
      
      // loops over the spotlights snapshot
      spotlightData.map((spotlight, index) => {

        // if the current spotlight is the one to show
        if (index === showIngredientIndex) {

          // loops over the ingredients list of the spotlight to find the current one
          spotlight.data().ingredientIds.forEach((ingredientId, i) => {
            if (ingredientId === id) {

              // adds the id and new inclusion of the current ingredient
              const store = spotlight.data().ingredientStores[i];
              idList[store].push(ingredientId);
              includedList[store].push(newValue);
            }
          });
        }
      });
    }
    
    // stores the new id and included lists
    setIngredientIdList(idList);
    setIngredientIncludedList(includedList);
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
        <View className="flex w-3/4 py-4 px-2 mb-[50px] bg-zinc200 rounded-xl border-[1px] border-zinc-400 z-50">

          {/* HEADER */}
          <View className="flex flex-row items-center justify-around">

            {/* ingredient name */}
            <Text className="font-bold text-[20px] text-center text-black">
              Spotlight Selector
            </Text>

            {/* BUTTONS */}
            <View className="flex flex-row items-center justify-center">
              {/* Check */}
              <Icon 
                size={24}
                color={'black'}
                name="checkmark"
                onPress={() => submitModal(ids, selected, ingredientIdList, ingredientIncludedList)}
              />
              {/* X */}
              <Icon 
                size={24}
                color={'black'}
                name="close-outline"
                onPress={() => setModalVisible(false)}
              />
            </View>
          </View>

          {/* divider */}
          <View className="h-[1px] bg-zinc400 m-2 mb-4"/>
          
          {/* recipe list */}
          {selected !== null && ingredientIdList !== null && ingredientIncludedList !== null && 
            <View className="mx-4">
              {spotlightData.map((spotlight, index) => ( 
                <View 
                  key={index}
                  className={`flex flex-col justify-center items-center w-full ${showIngredientIndex === index && (index === 0 ? "pb-3" : "py-3")}`}
                >
                  
                  {/* Spotlight Row */}
                  <View className={`flex flex-row border-theme700 border-x-[1px] ${index === 0 && "border-t-[1px] border-t-theme700"} ${showIngredientIndex === index ? "border-t-[1px] border-b" : showIngredientIndex + 1 === index ? "border-t-[1px] border-b-[1px]" : "border-b-[1px]"}`}>

                    {/* Multiplicity */}
                    <View className="flex w-[10%] justify-center items-center bg-zinc350">
                      <Text className="text-center text-black font-semibold">
                        {spotlight.data().spotlightMult}
                      </Text>
                    </View>

                    {/* button to open the spotlight's ingredients */}
                    <TouchableOpacity 
                      className="px-2 py-3 w-[75%] items-center justify-center bg-white"
                      onPress={() => setShowIngredientIndex(showIngredientIndex === index ? -1 : index)}
                    >
                      {/* Spotlight Name */}
                      <Text className="text-theme900 font-semibold text-center">
                        {spotlight.data().spotlightName}
                      </Text>
                    </TouchableOpacity>
                    
                    {/* checkbox */}
                    <View className="flex w-[15%] items-center justify-center bg-theme200 border-zinc450">
                      <Icon
                        name={selected[index] ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={colors.zinc700}
                        onPress={() => changeSelected(index, spotlight.id)}
                      />
                    </View>
                  </View>

                  {/* Ingredients Section */}
                  {showIngredientIndex === index && 
                  <View className="border-b-[1px] border-x-[1px] border-t-2 border-t-theme700 border-x-zinc700 border-b-zinc700">

                    {spotlight.data().ingredientData.map((ingredient, i) => (
                      <View key={`ingredient-${index}-${i}`}>
                      
                      {/* doesnt display ingredient if it's amount is 0 in the spotlight */}
                      {ingredient !== null && showIngredientIndex === index && spotlight.data().ingredientAmounts[i] !== "0" &&
                        <View className="flex flex-row justify-center items-center h-[20px] bg-zinc500">
                          {/* different display based on checkbox */}
                          {selected[index] 
                            ? 
                            // selected
                            <>
                              {/* Included Button */}
                              <View className="flex flex-row justify-center items-center bg-theme500 w-[10%] h-full border-b-[1px] border-theme600">
                                <Icon
                                  name={currIncluded !== null && currIncluded[i] ? "close-outline" : "add-sharp"}
                                  size={16}
                                  color={currIncluded !== null && currIncluded[i] ? colors.zinc200 : "white"}
                                  onPress={() => updateIncluded(spotlight.data().ingredientIds[i], i)}
                                />
                              </View>

                              {/* Name */}
                              <View className="flex flex-row items-center w-[90%] h-full bg-zinc450 pl-2 border-b-[1px] border-zinc500">
                                <Text className="text-white text-[10.5px] italic font-semibold">
                                  {ingredient.ingredientName}
                                </Text>
                              </View>
                            </>
                            : 
                            // not selected
                            <>
                              {/* Name */}
                              <View className="flex flex-row items-center w-full h-full bg-zinc450 pl-2 border-b-[1px] border-zinc500">
                                <Text className="text-white text-[10.5px] italic font-semibold">
                                  {ingredient.ingredientName}
                                </Text>
                              </View>
                            </>
                          }
                        </View>
                      }
                      </View>
                    ))}
                  </View>
                  }
                </View>
              ))}
            </View>
          }
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default SpotlightSelectorModal;