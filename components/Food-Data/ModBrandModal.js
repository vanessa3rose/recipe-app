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
import storeLabels from '../../assets/storeLabels';
import storeImages from '../../assets/storeImages';

// initialize firebase app
import { getFirestore, doc, writeBatch } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const ModBrandModal = ({ 
  modalVisible, setModalVisible, closeModal, 
  initialBrandLists,
  ingredientsSnapshot, recipeSnapshot, spotlightSnapshot
}) => {


  ///////////////////////////////// ON OPEN /////////////////////////////////

  // stores given data on open
  useEffect(() => {
    if (modalVisible) {

      // gets the brands
      fetchBrands(initialBrandLists);

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
  }

  // to retrieve and sort all brands
  const fetchBrands = (brands) => {
    let uniqueList = [];

    // loops over all stores' brands
    storeKeys.map(store => {
      brands[store].map(brand => {

        // if it is a new brand (for all stores)
        if (!uniqueList.map(uniqueBrand => uniqueBrand.name).includes(brand.value)) {
          uniqueList.push({
            "name": brand.value, 
            "stores": [store],
          })

        // if it is preexisting, add the store to the brand
        } else {
          uniqueList[uniqueList.findIndex(uniqueBrand => uniqueBrand.name === brand.value)] = {
            "name": brand.value,
            "stores": [...uniqueList[uniqueList.findIndex(uniqueBrand => uniqueBrand.name === brand.value)]["stores"], store]
          }
        }
      })
    })

    // stores the values
    setBrandsList(uniqueList);
    setFilteredBrandsList(uniqueList);
  }
  
  
  ///////////////////////////////// BRAND LIST /////////////////////////////////

  // to indicate which dropdown is open
  const [brandDropdownOpen, setBrandDropdownOpen] = useState("");

  // to set the brand of the current dropdown
  const [brand, setBrand] = useState(Object.fromEntries(["-", ...storeKeys].map(storeKey => [storeKey, ""])));
  const [newBrand, setNewBrand] = useState(Object.fromEntries(["-", ...storeKeys].map(storeKey => [storeKey, ""])));

  // overall brand list
  const [brandsList, setBrandsList] = useState(null);
  const [filteredBrandsList, setFilteredBrandsList] = useState(null);

  // to filter a store's brand
  const filterBrandList = (currStore, value) => {
    let uniqueList = [];
    
    // gets all of the current store's brands
    brandsList.map(brand => {
      if (currStore === "-" || brand.stores.includes(currStore)) {
        uniqueList.push(brand);
      }
    })

    // sorts the list, then filters for the keyword
    uniqueList = uniqueList
      .sort((a,b) => a.name.localeCompare(b.name))
      .filter(brand => brand.name.toLowerCase().includes(value.toLowerCase()));

    // resets filtering if it doesn't match any
    if (uniqueList.length === 0) {
      setBrand(prev => ({ ...prev, [currStore]: brand[currStore] }));
    // stores the value if it matches at least one
    } else {
      setFilteredBrandsList(uniqueList);
      setBrand(prev => ({ ...prev, [currStore]: value }));
      setBrandDropdownOpen(currStore);
    }
  }

  // to choose a store's brand
  const pickBrand = (currStore, value) => {
    // sets the value and closes the dropdown
    setBrand(prev => ({ ...prev, [currStore]: value }))
    setBrandDropdownOpen("");
  }

  // to change a store's brand
  const changeBrand = (currStore) => {
    let newIngredients = ingredients;
  
    // loops over all ingredients
    newIngredients = newIngredients.map((ingredient) => {

      // modifies brand if affected
      if (ingredient.ingredientData[currStore].brand === brand[currStore]) {
        return {
          ...ingredient,
          ingredientData: {
            ...ingredient.ingredientData,
            [currStore]: {
              ...ingredient.ingredientData[currStore],
              brand: newBrand[currStore],
            },
          },
        };
      }
      return ingredient;
    });

    // stores the new data
    setIngredients(newIngredients);

    // gets the new brands
    const valuesMap = new Map();
    storeKeys.forEach(store => valuesMap.set(store, new Set()));

    newIngredients.forEach((ingredient) => {
      storeKeys.forEach(storeKey => {
        const storeData = ingredient.ingredientData?.[storeKey];
        const brand = storeData?.brand;
        if (brand && brand !== '') {
          valuesMap.get(storeKey).add(brand);
        }
      });
    });

    // processes brand lists into one object
    const brandListsObj = {};
    storeKeys.forEach(storeKey => {
      const brandValues = [...valuesMap.get(storeKey)].filter(val => val !== 'CUSTOM');
      const sortedBrands = brandValues.map(val => ({ label: val, value: val })).sort((a, b) => a.value.localeCompare(b.value));
      brandListsObj[storeKey] = sortedBrands;
    });
      
    // recollects all brand lists
    fetchBrands(brandListsObj);

    // sets the value
    setBrand(prev => ({ ...prev, ["-"]: brand["-"] === brand[currStore] ? newBrand[currStore] : brand["-"], [currStore]: newBrand[currStore] }));
    setNewBrand(prev => ({ ...prev, [currStore]: "" }));
  }

  // to change multiple store's brand
  const changeBrands = () => {
  
    // maps over all ingredients and stores
    let newIngredients = ingredients.map((ingredient) => {
      let updatedIngredientData = { ...ingredient.ingredientData };

      storeKeys.forEach((store) => {

        // updates if brand has changed
        if (updatedIngredientData[store]?.brand === brand["-"]) {
          updatedIngredientData[store] = {
            ...updatedIngredientData[store],
            brand: newBrand["-"],
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

    // gets the new brands
    const valuesMap = new Map();
    storeKeys.forEach(store => valuesMap.set(store, new Set()));

    newIngredients.forEach((ingredient) => {
      storeKeys.forEach(storeKey => {
        const storeData = ingredient.ingredientData?.[storeKey];
        const brand = storeData?.brand;
        if (brand && brand !== '') {
          valuesMap.get(storeKey).add(brand);
        }
      });
    });

    // processes brand lists into one object
    const brandListsObj = {};
    storeKeys.forEach(storeKey => {
      const brandValues = [...valuesMap.get(storeKey)].filter(val => val !== 'CUSTOM');
      const sortedBrands = brandValues.map(val => ({ label: val, value: val })).sort((a, b) => a.value.localeCompare(b.value));
      brandListsObj[storeKey] = sortedBrands;
    });
      
    // recollects all brand lists
    fetchBrands(brandListsObj);

    // sets the value
    setBrand(Object.fromEntries(["-", ...storeKeys].map(storeKey => [storeKey, brand[storeKey] === brand["-"] ? newBrand["-"] : brand[storeKey]])));
    setNewBrand(prev => ({ ...prev, ["-"]: "" }));
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
        if (storeKeys.some(store => oldData[store].brand !== newData[store].brand)) {
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
              INGREDIENT BRANDS
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



          {/* OVERALL */}
          <View className="flex flex-col justify-center items-center space-y-2 bg-theme100 border border-zinc300 mx-4 py-4 my-2">

            {/* current store details */}
            <View className="flex flex-row justify-center items-center">
              {(brand["-"] === "" || !brandsList.find(item => item.name === brand["-"]))
              ?
                // label
                <Text className="text-[16px] font-bold">
                  ALL BRANDS
                </Text>
              :
                // icons
                <View className="px-4 flex flex-row space-x-4 justify-center items-center">
                  {storeKeys.map((store, idx) =>
                    brandsList.find(item => item.name === brand["-"]).stores.includes(store) ? (
                      <Image
                        key={idx}
                        source={storeImages[store]?.src}
                        style={{
                          width: storeImages[store]?.width,
                          height: storeImages[store]?.height,
                        }}
                      />
                    ) : null
                  )}
                </View>
              }
            </View>


            {/* BRAND INPUT */}
            <View className="flex flex-row">

              {/* Old Input */}
              <View className={`flex justify-center items-center bg-zinc350 border-[1px] border-zinc400 ${brandDropdownOpen === "-" ? "rounded-t-lg" : "rounded-lg"} ${(brand["-"] !== "" && brandDropdownOpen !== "-") ? "w-2/5" : "w-5/6"}`}>
                <TextInput
                  value={brand["-"]}
                  onChangeText={(value) => filterBrandList("-", value)}
                  placeholder="brand"
                  placeholderTextColor={colors.zinc500}
                  className="flex w-full p-2 pl-1 pr-6 text-[14px] text-center leading-[17px]"
                  onFocus={() => filterBrandList("-", brand["-"])}
                  multiline={true}
                  blurOnSubmit={true}
                />
                            
                {/* Toggle / Clear Dropdown Button */}
                <View className="absolute items-center justify-center right-2 h-full">
                  <Icon
                    name={brandDropdownOpen !== "-" ? "chevron-down-outline" : "close"}
                    size={18}
                    color={colors.zinc700}
                    onPress={() => {brandDropdownOpen !== "-" ? filterBrandList("-", brand["-"]) : pickBrand("-", "")}}
                  />
                </View>
              </View>
            
              {/* Brand Dropdown */}
              {(brandDropdownOpen === "-" && filteredBrandsList?.length > 0) && (
                <View className={`flex absolute top-[100%] border border-zinc400 bg-white z-50 ${(brand["-"] !== "" && brandDropdownOpen !== "-") ? "w-2/5" : "w-5/6"}`}>
                  <FlatList
                    data={filteredBrandsList}
                    keyExtractor={(_, index) => index.toString()}
                    style={{ maxHeight: 100 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        className="flex flex-row justify-center items-center p-2.5 border-b-[1px] border-zinc300"
                        onPress={() => pickBrand("-", item.name)}
                      >
                        {/* Store icons */}
                        <View className="px-4 flex flex-row flex-wrap space-x-1 w-2/5 justify-center items-center">
                          {storeKeys.map((store, idx) =>
                            item.stores.includes(store) ? (
                              <Image
                                key={idx}
                                source={storeImages[store]?.src}
                                style={{
                                  width: storeImages[store]?.width,
                                  height: storeImages[store]?.height,
                                }}
                              />
                            ) : null
                          )}
                        </View>

                        {/* Brand name */}
                        <Text className="text-black text-[12.5px] w-3/5 text-center mr-[35px]">
                          {item.name}
                        </Text>

                        {/* Selected checkmark */}
                        {(item.name === brand["-"]) && (
                          <View className="absolute right-2">
                            <Icon
                              name="checkmark"
                              size={20}
                              color={colors.theme700}
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}


              {/* if editing is available */}
              {(brand["-"] !== "" && brandDropdownOpen !== "-") && (
                <>
                  {/* Change Button */}
                  <View className="justify-center items-center px-2">
                    <Icon
                      name="shuffle"
                      size={20}
                      onPress={() => changeBrands()}
                    />
                  </View>

                  {/* New Input */}
                  <View className={`flex flex-row w-1/3 h-full justify-center items-center bg-zinc350 border-[1px] border-zinc400 ${brandDropdownOpen === "-" ? "rounded-t-lg" : "rounded-lg"}`}>
                    <TextInput
                      value={newBrand["-"]}
                      onChangeText={(value) => setNewBrand(prev => ({ ...prev, ["-"]: value }))}
                      placeholder="brand"
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


            
          {/* Divider */}
          <View className="h-[1px] bg-zinc400 m-2 mb-4"/>


          {/* MAP OF STORES */}
          {storeKeys.map((store, index) => (
            <View key={index} className="flex flex-col justify-center items-center space-y-2">

              {/* current store details */}
              <View className="flex flex-row justify-center items-center space-x-2">
                {/* Icon */}
                <Image
                  source={storeImages[store]?.src}
                  alt="store"
                  style={{
                    width: storeImages[store]?.width,
                    height: storeImages[store]?.height,
                  }}
                />
                {/* Name */}
                <Text className="text-[16px] font-bold">
                  {storeLabels[index].toUpperCase()}
                </Text>
              </View>

  
              {/* BRAND INPUT */}
              <View className="flex flex-row mb-5">

                {/* Old Input */}
                <View className={`flex justify-center items-center bg-theme200 border-[1px] border-zinc400 ${brandDropdownOpen === store ? "rounded-t-lg" : "rounded-lg"} ${(brand[store] !== "" && brandDropdownOpen !== store) ? "w-2/5" : "w-3/4"}`}>
                  <TextInput
                    value={brand[store]}
                    onChangeText={(value) => filterBrandList(store, value)}
                    placeholder="brand"
                    placeholderTextColor={colors.zinc500}
                    className="flex w-full p-2 pl-1 pr-6 text-[14px] text-center leading-[17px]"
                    onFocus={() => filterBrandList(store, brand[store])}
                    multiline={true}
                    blurOnSubmit={true}
                  />
                              
                  {/* Toggle / Clear Dropdown Button */}
                  <View className="absolute items-center justify-center right-2 h-full">
                    <Icon
                      name={brandDropdownOpen !== store ? "chevron-down-outline" : "close"}
                      size={18}
                      color={colors.zinc700}
                      onPress={() => {brandDropdownOpen !== store ? filterBrandList(store, brand[store]) : pickBrand(store, "")}}
                    />
                  </View>
                </View>
              
                {/* Brand Dropdown */}
                {(brandDropdownOpen === store && filteredBrandsList?.length > 0) && (
                  <View className={`flex absolute top-[100%] border border-zinc400 bg-white z-50 ${(brand[store] !== "" && brandDropdownOpen !== store) ? "w-2/5" : "w-3/4"}`}>
                    <ScrollView className="max-h-[100px]">
                      {filteredBrandsList.map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          className="flex flex-row justify-center items-center p-2.5 border-b-[1px] border-zinc300"
                          onPress={() => pickBrand(store, item.name)}
                        >
                          {/* name */}
                          <Text className="text-black text-[12.5px] w-full text-center pl-[35px] mr-[35px]">
                            {item.name}
                          </Text>
                          
                          {/* selected indicator */}
                          {(item.name === brand[store]) && (
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


                {/* if editing is available */}
                {(brand[store] !== "" && brandDropdownOpen !== store) && (
                  <>
                    {/* Change Button */}
                    <View className="justify-center items-center px-2">
                      <Icon
                        name="shuffle"
                        size={20}
                        onPress={() => changeBrand(store)}
                      />
                    </View>

                    {/* New Input */}
                    <View className={`flex flex-row w-1/3 h-full justify-center items-center bg-theme200 border-[1px] border-zinc400 ${brandDropdownOpen === store ? "rounded-t-lg" : "rounded-lg"}`}>
                      <TextInput
                        value={newBrand[store]}
                        onChangeText={(value) => setNewBrand(prev => ({ ...prev, [store]: value }))}
                        placeholder="brand"
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
          ))}
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ModBrandModal;