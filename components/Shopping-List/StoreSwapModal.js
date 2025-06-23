///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect } from 'react';

// UI components
import { Modal, View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// store lists
import storeKeys from '../../assets/storeKeys';
import storeImages from '../../assets/storeImages';

// initialize firebase app
import { getFirestore, doc, getDoc, writeBatch,  } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const StoreSwapModal = ({ 
  spotlightsSnapshot, shoppingList, modalVisible, setModalVisible, submitModal
}) => {


  ///////////////////////////////// ON OPEN /////////////////////////////////

  // when the modal opens, load in the lists of ingredients
  useEffect(() => {
    if (modalVisible) {
      populateIngredients();
    }
  }, [modalVisible]);


  ///////////////////////////////// INGREDIENTS /////////////////////////////////

  const [originalList, setOriginalList] = useState(null);
  const [ingredientList, setIngredientList] = useState(null);

  // to populate the sorted list of ingredients
  const populateIngredients = () => {
    let ingredients = [];

    // loops over the spotlights to populate a current ingredient list
    spotlightsSnapshot.docs.map((spotlight, index) => {
      spotlight.data().ingredientIds.map((id, idx) => {

        const ingredientIndex = ingredients.map((ingredient) => ingredient.id).indexOf(id);
        
        // if the ingredient's id is not already included (with same store)
        if (id !== "" && (ingredientIndex === -1 || spotlight.data().ingredientStores[idx] !== ingredients[ingredientIndex]?.store)) {
          // if the spotlight including the ingredient is selected
          if (shoppingList[spotlight.data().ingredientStores[idx]].map(item => item.id).includes(id)) {
            
            // adds the ingredient, restructured
            ingredients.push({
              id: id,
              name: spotlight.data().ingredientNames[idx],
              store: spotlight.data().ingredientStores[idx],
              list: storeKeys.map((store) => spotlight.data().ingredientData[idx][store].brand !== "" ? store : null).filter(store => store !== null),
            })
          }
        }
      })
    });
    
    // sorts the ingredients by name
    ingredients = ingredients.sort((a, b) => a.name.localeCompare(b.name));
    
    // stores the ingredient list twice for later comparison
    setOriginalList(ingredients);
    setIngredientList(ingredients);

    // loops over the ingredient ids to get all of the spotlights
    fetchSpotlightLists(ingredients.map(ingredient => ingredient.id), ingredients.map(ingredient => ingredient.store));
  }


  ///////////////////////////////// CHANGING STORES /////////////////////////////////

  // when a store button is toggled for an ingredient
  const changeStore = (index) => {

    // calculates the next store
    const nextStore = ingredientList[index].list[(ingredientList[index].list.indexOf(ingredientList[index].store) + 1) % ingredientList[index].list.length];
    
    // updates the ingredient at the given index
    const updatedIndex = {
      ...ingredientList[index],
      store: nextStore,
    }

    // stores the overall changed ingredient list
    setIngredientList((prev) => {
      const updatedIngredients = [...prev];
      updatedIngredients[index] = updatedIndex;
      return updatedIngredients;
    });
  }
    
  
  ///////////////////////////////// SPOTLIGHT VIEW /////////////////////////////////

  const [showSpotlightIndex, setShowSpotlightIndex] = useState(-1);
  const [spotlightLists, setSpotlightLists] = useState(null);

  // gets each ingredient's list of spotlights
  const fetchSpotlightLists = (ingredientIds, ingredientStores) => {
    let spotlights = Array(ingredientIds.length).fill([]);

    // loops over the ingredients and then each spotlight
    ingredientIds.map((id, index) => {
      spotlightsSnapshot.docs.map((spotlight) => {

        // if the spotlight includes the ingredient (with same store), add it
        if (spotlight.data().ingredientIds.indexOf(id) === -1 ? "" : ingredientStores[index] === spotlight.data().ingredientStores[spotlight.data().ingredientIds.indexOf(id)]) {
          spotlights[index] = [...spotlights[index], { name: spotlight.data().spotlightName, id: spotlight.id }];
        }
      })
    })

    // alphabetizes the list of spotlights per ingredient
    spotlights = spotlights.map((spotlight) => {
      return spotlight.sort((a,b) => a.name.localeCompare(b.name))
    })

    // stores the lists locally
    setSpotlightLists(spotlights);
  }


  ///////////////////////////////// SUBMISSION /////////////////////////////////

  // to submit all of the store swaps on check click
  const submitSwaps = async () => {
    const batch = writeBatch(db);

    // loops over each spotlight
    spotlightsSnapshot.docs.forEach((spotlight) => {
      const spotlightData = spotlight.data();
      const updatedStores = [...spotlightData.ingredientStores];
      let isUpdated = false;

      // loops over each ingredient, checking if the store has changed and it is included in the spotlight
      ingredientList.forEach((ingredient, idx) => {
        if (ingredient.store !== originalList[idx].store && spotlightLists[idx].map(list => list.id).includes(spotlight.id)) {
          
          // finds the ingredient in the current spotlight
          const ingredientIndex = spotlightData.ingredientIds.indexOf(ingredient.id);
          if (ingredientIndex !== -1) {

            // update the specific store
            updatedStores[ingredientIndex] = ingredient.store;
            isUpdated = true;
          }
        }
      })

      // update the db only if the current spotlight was changed
      if (isUpdated) {
        batch.update(doc(db, 'SPOTLIGHTS', spotlight.id), { ingredientStores: updatedStores });
      }
    })

    // batches the changes and closes the modal
    await batch.commit();
    submitModal();
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
              Ingredient Store Swap
            </Text>

            {/* BUTTONS */}
            <View className="flex flex-row items-center justify-center">
              {/* Check */}
              <Icon 
                size={24}
                color="black"
                name="checkmark"
                onPress={() => submitSwaps()}
              />
              {/* X */}
              <Icon 
                size={24}
                color="black"
                name="close-outline"
                onPress={() => setModalVisible(false)}
              />
            </View>
          </View>

          {/* divider */}
          <View className="h-[1px] bg-zinc400 m-2 mb-4"/>
          

          {/* INGREDIENTS GRID */}
          <View className="mx-5 bg-zinc700 border-y-2 border-zinc700">
            <ScrollView 
              className="flex w-full max-h-[340px]"
              contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}
            >
              {ingredientList?.map((ingredient, index) => (
                <View
                  key={index}
                  className={`flex flex-col w-full bg-white`}
                >
                  {/* separation for selected */}
                  {(showSpotlightIndex === index && index !== 0) &&
                    <View className="w-full h-[14px] bg-zinc200"/>
                  }

                  <View className={`flex flex-row justify-around items-center border-zinc700 border-x-2 ${showSpotlightIndex - 1 === index && "border-b-2"} ${index !== -0 && "border-t-[1.5px]"}`}>

                    {/* Store Selector */}
                    <View className={`justify-center items-center w-[30px] h-[45px] z-10 ${ingredient.list.length === 1 ? "bg-zinc350" : ingredient.store !== originalList[index].store ? "bg-mauve200" : "bg-theme300"}`}>
                      <TouchableOpacity 
                        onPress={() => changeStore(index)} 
                        className="flex justify-center items-center h-full"
                      >
                        <Image
                          source={storeImages[ingredient.store]?.src}
                          alt="store"
                          style={{
                            width: storeImages[ingredient.store]?.width,
                            height: storeImages[ingredient.store]?.height,
                          }}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Ingredient Name */}
                    <TouchableOpacity 
                      className="w-full pl-[40px] ml-[-30px] pr-2 z-0"
                      onPress={() => setShowSpotlightIndex(showSpotlightIndex === index ? -1 : index)}
                    >
                      <Text className="text-left font-medium text-zinc800">
                        {ingredient.name}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Spotlight List */}
                  {showSpotlightIndex === index &&
                    <View className={`bg-zinc450 space-y-1 py-2 border-zinc700 border-t-[1px] border-x-2 ${index !== ingredientList.length - 1 && "border-b-2"}`}>
                      {spotlightLists[index].map((spotlight, idx) => (
                        <View 
                          key={idx}
                          className="flex flex-row pr-2"
                        >
                          {/* bullet point */}
                          <Text className="w-[30px] text-[12px] text-white text-center font-semibold">
                            {"⁃"}
                          </Text>
                          {/* name */}
                          <Text className="w-full pl-[40px] ml-[-30px] text-[12px] text-white font-semibold">
                            {spotlight.name.toUpperCase()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  }

                  {/* separation for selected */}
                  {(showSpotlightIndex === index && index !== ingredientList.length - 1) &&
                    <View className="w-full bg-zinc200 h-[15px]"/>
                  }
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default StoreSwapModal;