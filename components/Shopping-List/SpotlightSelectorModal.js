///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect } from 'react';

// UI components
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// store lists
import storeKeys from '../../assets/storeKeys';

// validation
import { numberToRoman } from '../../components/Validation/numberToRoman';

// initialize firebase app
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const SpotlightSelectorModal = ({ 
  spotlightsSnapshot, spotlightsSelected, spotlightsNumber, spotlightsIds, modalVisible, setModalVisible, submitModal
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

  const [ingredientList, setIngredientList] = useState(null);

  // to load in the lists of ingredients
  const getIngredientDetails = async () => {
    let ingredients = [];

    // gets the store shopping lists
    for (const store of storeKeys) {
      const snap = await getDoc(doc(db, 'SHOPPING', `list${store}`));
      const data = snap.data();

      // structures each ingredient
      data?.id.map((id, index) => {
        ingredients.push({
          id: id,
          included: data.included[index],
          store: store,
        })
      })
    }

    // adds any ingredients that were not included in the list
    spotlightsSnapshot.docs.slice().map(spotlight => {
      spotlight.data().ingredientIds.map((ingredientId, index) => {
            
        // restructures each ingredient
        if (!ingredients.map(ingredient => ingredient.id).includes(ingredientId) && ingredientId !== "") {
          ingredients.push({
            id: ingredientId,
            included: false,
            store: spotlight.data().ingredientStores[index],
          })
        }
      })
    })
    
    // stores the list
    setIngredientList(ingredients);
  }


  ///////////////////////////////// SORTING LOGIC /////////////////////////////////

  const [selected, setSelected] = useState(null);
  const [ogNumber, setOgNumber] = useState(null);
  const [number, setNumber] = useState(null);
  const [spotlightData, setSpotlightData] = useState(null);
  const [ids, setIds] = useState(null);

  // sorts data alphabetically on open
  const sortData = () => {

    // sorts and stores the snapshot 
    const sortedDocs = spotlightsSnapshot.docs.slice()

      // sorts the spotlights alphabetically
      .sort((a, b) => a.data().spotlightName.localeCompare(b.data().spotlightName))
      .map(doc => {

        // sorts the ingredients alphabetically
        const data = doc.data();
        const indices = data.ingredientNames.map((name, index) => ({ name, index }))
          .sort((a, b) => a.name.localeCompare(b.name)).map(obj => obj.index);
  
        // structures each spotlight
        return {
          id: doc.id,
          data: {
            ...data,
            ingredientAmountEdited: indices.map(i => data.ingredientAmountEdited[i]),
            ingredientAmounts: indices.map(i => data.ingredientAmounts[i]),
            ingredientCals: indices.map(i => data.ingredientCals[i]),
            ingredientData: indices.map(i => data.ingredientData[i]),
            ingredientIds: indices.map(i => data.ingredientIds[i]),
            ingredientNames: indices.map(i => data.ingredientNames[i]),
            ingredientPrices: indices.map(i => data.ingredientPrices[i]),
            ingredientServings: indices.map(i => data.ingredientServings[i]),
            ingredientStores: indices.map(i => data.ingredientStores[i]),
            ingredientTypes: indices.map(i => data.ingredientTypes[i]),
          }
        }
      });

    // stores the restructured data
    setSpotlightData(sortedDocs);
    
    // to collect the sorted selections
    let sortedIds = [];
    let sortedSelected = [];
    let sortedNumber = [];

    sortedDocs.forEach((spotlight) => {
      if (spotlightsIds.includes(spotlight.id)) {
        sortedIds.push(spotlightsIds[spotlightsIds.indexOf(spotlight.id)])
        sortedSelected.push(spotlightsSelected[spotlightsIds.indexOf(spotlight.id)])
        sortedNumber.push(spotlightsNumber[spotlightsIds.indexOf(spotlight.id)])
      }
    })

    // stores data
    setIds(sortedIds);
    setSelected(sortedSelected);
    setOgNumber(sortedNumber);
    setNumber(sortedNumber);
  }


  ///////////////////////////////// SELECTED LOGIC /////////////////////////////////

  const [showIngredientsIndex, setShowIngredientsIndex] = useState(-1);

  // when a checkbox is toggled
  const changeSelected = (index) => {
    
    // stores the selected index if it changes to true
    if (!selected[index]) { setShowIngredientsIndex(index); }
    // resets it otherwise
    else { setShowIngredientsIndex(-1); }

    // stores the selection
    setSelected((prevState) => {
      const updatedSelected = [...prevState];
      updatedSelected[index] = !selected[index];
      return updatedSelected;
    });

    // updates the associated number
    setNumber((prevState) => {
      const updatedNumber = [...prevState];
      updatedNumber[index] = !selected[index] ? -1 : (ogNumber[index] === -1 ? 0 : ogNumber[index]);
      return updatedNumber;
    });
  }
  
  // to increment or decrement the current spotlight's number
  const changeNumber = async (change, index) => {

    // stores the selection
    setNumber((prevState) => {
      const updatedNumber = [...prevState];
      updatedNumber[index] = number[index] + change;
      return updatedNumber;
    });
  }

  
  ///////////////////////////////// INCLUDED INGREDIENTS /////////////////////////////////

  // to update a specific ingredient's inclusion
  const updateIncluded = (id) => {
    
    // switches inclusion value of the given ingredient id
    const ingredients = [...ingredientList].map((ingredient) => {
      return {
        ...ingredient,
        included: ingredient.id === id ? !ingredient.included : ingredient.included,
      }
    });
    
    // stores the updated list
    setIngredientList(ingredients);
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
          <View className="flex flex-row items-center justify-between px-5">

            {/* ingredient name */}
            <Text className="font-bold text-[20px] text-center text-black">
              Spotlight Selector
            </Text>

            {/* BUTTONS */}
            <View className="flex flex-row items-center justify-center">
              {/* Check */}
              <Icon 
                size={24}
                color="black"
                name="checkmark"
                onPress={() => submitModal(ids, selected, number, ingredientList)}
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
          
          {/* recipe list */}
          {(selected !== null && ingredientList !== null) && (
            <ScrollView className="max-h-[500px] ml-4 pr-1" showsVerticalScrollIndicator={false}>
              {spotlightData.map((spotlight, index) => ( 
                <View 
                  key={index}
                  className={`flex flex-col justify-center items-center w-full ${(showIngredientsIndex === index) && ((index === 0) ? "pb-3" : "py-3")}`}
                >
                  {/* Spotlight Row */}
                  <View className="flex flex-row ml-[15px] border-theme700 border-l-[1px]">
                    <View className={`flex flex-row w-full ${(index === 0) && "border-t-[1px] border-t-theme700"} ${(showIngredientsIndex === index) ? "border-t-[1px] border-b-0.5" : (showIngredientsIndex + 1 === index) ? "border-t-[1px] border-b-[1px]" : "border-b-[1px]"}`}>

                      {/* Multiplicity */}
                      <View className="flex w-[10%] justify-center items-center bg-zinc350">
                        <Text className="text-center text-black font-semibold">
                          {spotlight.data.spotlightMult}
                        </Text>
                      </View>

                      {/* button to open the spotlight's ingredients */}
                      <TouchableOpacity 
                        className="px-2 py-3 w-[75%] items-center justify-center bg-white"
                        onPress={() => setShowIngredientsIndex((showIngredientsIndex === index) ? -1 : index)}
                      >
                        {/* Spotlight Name */}
                        <Text className="text-theme900 font-semibold text-center">
                          {spotlight.data.spotlightName}
                        </Text>
                      </TouchableOpacity>
                      
                      {/* checkbox */}
                      <View className="flex w-[15%] items-center justify-center bg-theme200 border-zinc450">
                        {selected[index] ? (
                          // if selected - standard checkbox
                          <Icon
                            name={selected[index] ? 'checkbox' : 'square-outline'}
                            size={20}
                            color={colors.zinc700}
                            onPress={() => changeSelected(index)}
                          />
                        ) : (
                          // if unselected - number
                          <TouchableOpacity 
                            className="border border-zinc700 items-center justify-center rounded-[3px] px-0.5 min-w-[18px] h-[18px]"
                            onPress={() => changeSelected(index)}
                          >
                            <Text className="font-bold text-[10px] text-zinc700 font-mono tracking-tighter">
                              {number[index] === 0 ? "-" : numberToRoman(number[index])}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* Buttons */}
                    {!selected[index] ? (
                      <View className="justify-center w-[30px] pl-1 space-y-[-2px] border-theme700 border-l-[1px]">
                        {/* Increment Button */}
                        <Icon
                          name="caret-up"
                          size={15}
                          color={colors.zinc600}
                          onPress={() => changeNumber(1, index)}
                        />
                        {/* Decrement Button */}
                        <Icon
                          name="caret-down"
                          size={15}
                          color={(number[index] === 0) ? colors.zinc350 : colors.zinc600}
                          onPress={(number[index] === 0) ? null : () => changeNumber(-1, index)}
                        />
                      </View>
                    ) : (
                      // if selected - no numbers to change
                      <View className="justify-center w-[30px] pl-1 space-y-[-2px] border-theme700 border-l-[1px]"/>
                    )}
                  </View>

                  {/* Ingredients Section */}
                  {(showIngredientsIndex === index) && (                  
                    <>
                      {spotlight.data.ingredientData.filter(data => data !== null).length > 0
                      ?
                        <View className="w-full pr-[14px]">
                          <View className="border-b-[1px] border-x-[1px] border-t-2 border-t-theme700 border-x-zinc700 border-b-zinc700">
                            {spotlight.data.ingredientData.map((ingredient, i) => (
                              <View key={i}>
                              
                              {/* doesnt display ingredient if it's amount is 0 in the spotlight */}
                              {(ingredient !== null && spotlight.data.ingredientAmounts[i] !== "0") && (
                                <>
                                  {/* different display based on checkbox */}
                                  {selected[index] 
                                    ? 
                                    // selected
                                    <View className="flex flex-row bg-zinc700">
                                      {/* Included Button */}
                                      <View className="justify-center items-center bg-theme500 w-[10%] py-0.5 border-b-[1px] border-theme600">
                                        <Icon
                                          name={ingredientList?.filter(ingredient => ingredient.id === spotlight.data.ingredientIds[i])?.[0]?.included ? "close-outline" : "add-sharp"}
                                          size={16}
                                          color={ingredientList?.filter(ingredient => ingredient.id === spotlight.data.ingredientIds[i])?.[0]?.included ? "white" : colors.zinc900}
                                          onPress={() => updateIncluded(spotlight.data.ingredientIds[i])}
                                        />
                                      </View>

                                      {/* Name */}
                                      <View className="justify-center w-[90%] py-0.5 bg-zinc450 pl-2 border-b-[1px] border-zinc500">
                                        <Text className="text-white text-[10.5px] italic font-semibold">
                                          {spotlight.data.ingredientNames[i]}
                                        </Text>
                                      </View>
                                    </View>
                                    : 
                                    // not selected
                                    <View className="py-[3px] justify-center bg-zinc450 pl-2 border-b-[1px] border-zinc500">
                                      {/* name */}
                                      <Text className="text-white text-[10.5px] italic font-semibold">
                                        {spotlight.data.ingredientNames[i]}
                                      </Text>
                                    </View>
                                  }
                                </>
                              )}
                              </View>
                            ))}      
                          </View>   
                        </View>         
                      :
                        // spotlight has no ingredients
                        <View className="w-full pr-[14px]">
                          <View className="bg-zinc700 py-2 justify-center items-center border-x-zinc700 border-b-zinc700">
                            <Text className="text-zinc300 font-bold italic text-[12px]">
                              NO INGREDIENTS AVAILABLE
                            </Text>
                          </View>
                        </View>
                      }
                    </>  
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default SpotlightSelectorModal;