///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useRef, useState, useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';

// UI components
import { View, Text, ScrollView, TextInput, Image, Linking, Keyboard, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Picker } from '@react-native-picker/picker';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// store lists
import storeKeys from '../../assets/storeKeys';
import storeLabels from '../../assets/storeLabels';
import storeImages from '../../assets/storeImages';

// fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

// validation
import extractUnit from '../../components/Validation/extractUnit';

// initialize firebase app
import { getFirestore, doc, collection, getDocs } from 'firebase/firestore';
import { app } from '../../firebase.config';
import validateFractionInput from '../Validation/validateFractionInput';
import validateWholeNumberInput from '../Validation/validateWholeNumberInput';
import validateDecimalInput from '../Validation/validateDecimalInput';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const ExtraIngredientsModal = ({ 
  modalVisible, setModalVisible, extras, closeModal
}) => {


  ///////////////////////////////// KEYBOARD /////////////////////////////////

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardType, setKeyboardType] = useState("");

  // keyboard listener
  useEffect(() => {

    // listens for keyboard show event
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setIsKeyboardOpen(true);
    });

    // listens for keyboard hide event
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardOpen(false);
      setKeyboardType("");
    });

    // cleans up listeners on unmount
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [keyboardType]);


  ///////////////////////////////// ON OPEN /////////////////////////////////
  
  // when the modal opens, load in the lists of ingredients
  useEffect(() => {
    if (modalVisible) {
      populateIngredients();
    }
  }, [modalVisible]);
  
  // when the modal opens, load in the lists of extras
  useEffect(() => {
    if (extras) {
      populateExtras();
    }
  }, [extras]);
  
  
  ///////////////////////////////// INGREDIENTS /////////////////////////////////
  
  const [ingredientsSnapshot, setIngredientsSnapshot] = useState([]);

  // to populate the sorted list of ingredients and their types
  const populateIngredients = async () => {
    
    // fetches and stores the full data
    const querySnapshot = await getDocs(collection(db, 'INGREDIENTS'));
    setIngredientsSnapshot(querySnapshot);
  
    // sorts the list of types from that data alphabetically
    const ingredientTypes = [
      { label: "ALL TYPES", value: "ALL TYPES" },
      ...[...new Set(
        querySnapshot.docs
          .flatMap(item => item.data().ingredientTypes)
          .filter(type => type !== undefined && type !== null)
      )]
        .sort((a, b) => a.localeCompare(b))
        .map(type => ({
          label: type === "" ? "no type" : type, 
          value: type,
        })),
    ];

    // sets the list of types
    setTypeList(ingredientTypes);

    // finds all brands
    const valuesMap = new Map(storeKeys.map(storeKey => [storeKey, new Set()]));
    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // collects store brands
      storeKeys.forEach(storeKey => {
        const storeData = data.ingredientData?.[storeKey];
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
    
    // dynamically sets initial brand lists
    storeKeys.forEach((storeKey) => setBrandLists(prev => ({ ...prev, [storeKey]: brandListsObj[storeKey] })));
    filterBrandList("-", "", 
      storeKeys.reduce((acc, storeKey) => {
        acc[storeKey] = brandListsObj[storeKey];
        return acc;
      }, {})
    );

    // extracts the ingredients
    const ingredients = querySnapshot.docs.map((doc) => {
      const formattedIngredient = {
        id: doc.id,
        ... doc.data()
      }
      return formattedIngredient;
    })
    .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName)); // sort by ingredientName alphabetically

  
    // maps over each ingredient and store
    let units = [];
    querySnapshot.docs.map(ingredient => {
      storeKeys.map(store => {
        // adds the unit if new
        if (!units.includes(ingredient.data()?.ingredientData[store]?.unit) && ingredient.data()?.ingredientData[store]?.unit !== "") {
          units.push(ingredient.data()?.ingredientData[store]?.unit);
        }
      })
    })

    // alphabetizes
    units = units.sort((a,b) => a.localeCompare(b))

    // stores units
    setUnitList(units);
    setFilteredUnitList(units);


    // filters the ingredient data based on the selected type
    setFilteredIngredientData(ingredients);
  }


  ///////////////////////////////// EXTRAS /////////////////////////////////

  const [extraIngredients, setExtraIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState(null);

  // loading in all the extras in the beginning
  const populateExtras = async () => {
    setExtraIngredients(extras);
  }

  // for clicking the add button
  const addIngredient = () => {
    let ingredientData = selectedIngredientData;
    if (selectedIngredientId === "") {
      
      // values
      const servingSize = ingredientData[currIngredientStore].servingSize; 
      const servingContainer = ingredientData[currIngredientStore].servingContainer; 
      const calServing = ingredientData[currIngredientStore].calServing; 
      const priceContainer = ingredientData[currIngredientStore].priceContainer; 
  
      // calculations
      ingredientData[currIngredientStore].totalYield = (servingSize === "" || servingContainer === "") ? "" : `${(new Fractional(servingSize)).multiply(new Fractional(servingContainer)).toString()}`;
      ingredientData[currIngredientStore].calContainer = (calServing === "" || servingContainer === "") ? "" : `${((new Fraction((new Fractional(calServing)).multiply(new Fractional(servingContainer)).toString())) * 1).toFixed(0)}`;
      ingredientData[currIngredientStore].priceServing = (priceContainer === "" || servingContainer === "") ? "" : `${((new Fraction((new Fractional(priceContainer)).divide(new Fractional(servingContainer)).toString())) * 1).toFixed(2)}`;
    }

    // stores new ingredient
    setExtraIngredients((prev) => [
      ...prev, 
      {
        ingredientId: selectedIngredientId === "" ? "." + doc(collection(db, 'INGREDIENTS')).id : selectedIngredientId,
        ingredientStore: currIngredientStore, 
        ingredientName: selectedIngredientName,
        ingredientServings: "",
        ingredientData: ingredientData,
      } 
    ]);

    // stores new ingredient
    setNewIngredient(selectedIngredientName);

    // resets states
    setAddingIngredient(false);
    setCurrIngredientStore("-");
    setSearchIngredientQuery("");
    setSelectedIngredientName("");
    setSelectedIngredientId("");
    setSelectedIngredientData(null);
    filterIngredientData("");
  }


  ///////////////////////////////// PICKING /////////////////////////////////

  const [addingIngredient, setAddingIngredient] = useState(false);
  
  // for ingredient dropdown
  const [ingredientDropdownOpen, setIngredientDropdownOpen] = useState(false);
  
  // for store picker
  const [currIngredientStore, setCurrIngredientStore] = useState("-");

  // for the ingredient search textinput
  const [searchIngredientQuery, setSearchIngredientQuery] = useState('');
  const [selectedIngredientName, setSelectedIngredientName] = useState("");
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [selectedIngredientData, setSelectedIngredientData] = useState(null);

  // for when an ingredient is selected from the dropdown that appears above the textinput
  const pickIngredient = (item) => {
    
    // stores the selection
    setSearchIngredientQuery(item.ingredientName);
    setSelectedIngredientName(item.ingredientName);
    setSelectedIngredientId(item.id);
    setSelectedIngredientData(item.ingredientData);
  
    // calculates the initial store based on the brands that are and are not empty
    const currStore = storeKeys[0];
    for (let i = 0; i < storeKeys.length; i++) {
      if (item?.ingredientData?.[storeKeys[(storeKeys.indexOf(currStore) + i) % storeKeys.length]].brand !== "") {
        setCurrIngredientStore(storeKeys[(storeKeys.indexOf(currStore) + i) % storeKeys.length]);
        filterBrandList(storeKeys[(storeKeys.indexOf(currStore) + i) % storeKeys.length], item?.ingredientData?.[storeKeys[(storeKeys.indexOf(currStore) + i) % storeKeys.length]]?.brand, brandLists)
        break;
      }
    }

    // closes the dropdown
    setIngredientDropdownOpen(false);
  }

  // for when the "x" button is selected in the ingredient textinput
  const clearIngredientSearch = () => {
    
    // resets the search filtering
    setCurrIngredientStore("-");
    setSearchIngredientQuery("");
    setSelectedIngredientName("");
    setSelectedIngredientId("");
    setSelectedIngredientData(null);
    filterIngredientData("");

    // closes the type dropdown
    setIngredientDropdownOpen(false);
  }


  ///////////////////////////////// FILTERING INGREDIENTS /////////////////////////////////

  const [filteredIngredientData, setFilteredIngredientData] = useState(null);
  
  // for type picker
  const [selectedIngredientType, setSelectedIngredientType] = useState("ALL TYPES"); 
  const [typeList, setTypeList] = useState([]);
  const [brandLists, setBrandLists] = useState({});

  // filters the ingredients based on the "search for ingredient" text input
  const filterIngredientData = (ingredientQuery) => {
    setSearchIngredientQuery(ingredientQuery);
    setSelectedIngredientName(ingredientQuery);

    let filtered = [];
    
    // filters for ingredient search
    if (ingredientsSnapshot?.docs?.length > 0) {
      filtered = ingredientsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(ingredient => {
          const queryWords = ingredientQuery
            .toLowerCase()
            .split(' ')
            .filter(word => word.trim() !== ''); // splits into words and remove empty strings
      
        return queryWords.every(word => ingredient.ingredientName.toLowerCase().includes(word));
      }).sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
    }
    
    // filters for type
    if (selectedIngredientType !== "ALL TYPES") {
      filtered = filtered.filter(ingredient => 
        Array.isArray(ingredient.ingredientTypes) && ingredient.ingredientTypes.includes(selectedIngredientType)
      );
    }

    // sets the data and shows the dropdown list of ingredients
    setFilteredIngredientData(filtered);
    setIngredientDropdownOpen(filtered.length !== 0);
  
    // clears selected ingredient if it doesn't match filtering
    if (filtered.filter((ingredient) => ingredient.ingredientName.toLowerCase() === ingredientQuery.toLowerCase()).length === 0) {
      setSelectedIngredientId("");
      setCurrIngredientStore("-");
      setSelectedIngredientData({
        ["-"]: {
          "brand": "", 
          "calContainer": "", 
          "calServing": "", 
          "link": "", 
          "priceContainer": "", 
          "priceServing": "", 
          "servingContainer": "", 
          "servingSize": "", 
          "totalYield": "", 
          "unit": ""
        }
      });
    }
  }
      
  // refilters when the type or store changes
  useEffect(() => {
    setSearchIngredientQuery("");
    setIngredientDropdownOpen(false);
    filterIngredientData(searchIngredientQuery);
  }, [selectedIngredientType, ingredientsSnapshot]); 
  
  
  ///////////////////////////////// STORE SELECTION /////////////////////////////////

  // to transition to the next store
  const changeStore = () => {
    let prevStore = currIngredientStore;
    let nextStore = currIngredientStore;

    // calculates the next store based on the brands that are and are not empty
    for (let i = 1; i <= storeKeys.length; i++) {
      if (selectedIngredientData[storeKeys[(storeKeys.indexOf(currIngredientStore) + i) % storeKeys.length]]?.brand !== "") {
        nextStore = storeKeys[(storeKeys.indexOf(currIngredientStore) + i) % storeKeys.length];
        break;
      }
    }
    
    // stores in state
    setCurrIngredientStore(nextStore);

    // updates data's store if custom
    if (selectedIngredientId === "") {
      setSelectedIngredientData({ [nextStore]: selectedIngredientData[prevStore] });
    }
  }

  // to transition to the next store
  const changeStoreGrid = (index) => {
    let prevStore = extraIngredients[index].ingredientStore;
    let nextStore = extraIngredients[index].ingredientStore;
    
    // calculates the next store based on the brands that are and are not empty
    for (let i = 1; i <= storeKeys.length; i++) {
      if (extraIngredients[index]?.ingredientData[storeKeys[(storeKeys.indexOf(prevStore) + i) % storeKeys.length]]?.brand !== "") {
        nextStore = storeKeys[(storeKeys.indexOf(prevStore) + i) % storeKeys.length];
        break;
      }
    }

    // updates data's store if custom
    if (selectedIngredientId === "") {
      setExtraIngredients(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          ingredientStore: nextStore,
        };
        return updated;
      });
    }
  }
  
  
  ///////////////////////////////// BRAND LIST /////////////////////////////////

  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
  const [filteredBrandLists, setFilteredBrandLists] = useState(null);

  // to filter a store's brand
  const filterBrandList = (currStore, value, brands) => {
    let uniqueList = [];
    if (selectedIngredientData?.[currStore]) {
      setSelectedIngredientData((prev) => {
        const updated = { ...prev }; 
        updated[currStore]["brand"] = value;
        return updated;
      })
    }
    
    // gets all of the current store's brands
    if (currStore !== "-") {
      brands[currStore].map(brand => {
        uniqueList.push({
          "value": brand.value, 
          "bgColor": 'white', 
          "textColor": 'black',
          "textStyle": "font-semibold",
        })
      })
    }

    // adds the unique values from the other stores
    storeKeys.map(store => {
      if (store !== currStore) {
        brands?.[store].map(brand => {
          if (!uniqueList.map(uniqueBrand => uniqueBrand.value).includes(brand.value)) {
            uniqueList.push({
              "value": brand.value, 
              "bgColor": colors.zinc100,
              "textColor": colors.zinc500,
              "textStyle": "",
            })
          }
        })
      }
    })
    
    // sorts the list, then filters for the keyword
    const queryWords = value
      .toLowerCase().split(" ").filter((word) => word.trim() !== "");
      
    uniqueList = uniqueList
      .sort((a,b) => a.value.localeCompare(b.value))
      .filter((brand) => queryWords.every((value) => brand.value.toLowerCase().includes(value)));
      
    // stores the values
    setFilteredBrandLists(prev => ({ ...prev, [currStore]: uniqueList }))
    setBrandDropdownOpen((prev) => ({ ...prev, [currStore]: true }));
  }
  
  
  ///////////////////////////////// UNIT LIST /////////////////////////////////

  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);
  const [unitList, setUnitList] = useState(null);
  const [filteredUnitList, setFilteredUnitList] = useState(null);
  
  // filters the list of units on keyword entry
  const filterUnits = (value) => {

    // stores the updated unit
    setSelectedIngredientData((prev) => {
      const updated = { ...prev }; 
      updated[currIngredientStore]["unit"] = value;
      return updated;
    })
    
    // filters by keyword
    const queryWords = value
      .toLowerCase().split(" ").filter((word) => word.trim() !== "");
  
    let units = unitList?.filter((unit) =>
      queryWords.every((word) => unit.toLowerCase().includes(word))
    );

    // stores filtering
    setFilteredUnitList(units);
    setUnitDropdownOpen(value !== "" && units?.length !== 0);
  }
    
    
  ///////////////////////////////// EDITING EXTRA /////////////////////////////////

  // to edit the extra ingredient at the given index
  const editExtraIngredients = (index) => {
    
    // for the ingredient search textinput
    filterIngredientData(extraIngredients[index].ingredientName);
    setCurrIngredientStore(extraIngredients[index].ingredientStore);
    setSelectedIngredientId(extraIngredients[index].ingredientId);
    setSearchIngredientQuery(extraIngredients[index].ingredientName);
    setSelectedIngredientName(extraIngredients[index].ingredientName);
    setSelectedIngredientData(extraIngredients[index].ingredientData);

    // changes screen
    setAddingIngredient(true);

    // removes the old ingredient
    setExtraIngredients(extraIngredients.filter((_, i) => i !== index));
  }
    
  
  ///////////////////////////////// SCROLLING /////////////////////////////////
  
  const [scrollY, setScrollY] = useState(0);
  
  // syncs store scrolling to grid scrolling
  const syncScroll = (event) => {
    const contentOffsetY = event.nativeEvent.contentOffset.y;
    setScrollY(contentOffsetY);
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
        <View className="absolute bg-black opacity-50 w-full h-full"/>

        {/* Modal Content */}
        <View className={`flex flex-col w-3/4 py-4 px-2 bg-zinc200 rounded-xl border-[1px] border-zinc-400 z-50 ${(keyboardType === "amt" && isKeyboardOpen) ? "mb-[150px]" : "mb-[50px]"}`}>

          {/* HEADER */}
          <View className="flex flex-row items-center justify-between px-5">

            {/* ingredient name */}
            <Text className="font-bold text-[20px] text-center text-black">
              Extra Ingredients
            </Text>

            {/* BUTTONS */}
            <View className="flex flex-row items-center justify-center">
              {/* Check */}
              <Icon 
                size={24}
                color="black"
                name="checkmark"
                onPress={() => closeModal(extraIngredients)}
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

          {/* INGREDIENTS */}
          {!addingIngredient
          ?
            <View className="flex flex-col w-full mx-[-15px] justify-center items-center space-y-3">

              {/* CURRENT EXTRAS */}
              {(extraIngredients.length > 0)
              ?
                // if ingredients are present
                <ScrollView 
                  className="flex flex-col z-10 max-h-[250px] ml-[15px] mr-[-15px]"
                  onScroll={syncScroll}
                >
                  {extraIngredients.map((ingredient, index) => (

                    // Frozen Columns
                    <View key={index} className="flex flex-row bg-white px-[15px]">
                              
                      {/* edit extra ingredient */}
                      <TouchableOpacity 
                        className="absolute w-[15px] bg-zinc200 h-full justify-center items-center left-0 border-r-[1px] border-r-zinc700 z-50"
                        onPress={() => editExtraIngredients(index)}
                        activeOpacity={0.5}
                      >
                        <Icon
                          name="ellipsis-vertical"
                          size={16}
                          color={colors.zinc600}
                        />
                      </TouchableOpacity>
                        
                      {/* ingredient names */}
                      <View className={`flex p-1 items-center justify-center w-[37.5%] border-y-[1px] border-y-zinc700 border-l-zinc700 border-r-0.5 border-r-theme900 z-20 ${(newIngredient === ingredient?.ingredientName) ? " bg-zinc500" : " bg-theme600"}`}>
                        <Text 
                          className={`text-white text-center text-[10px] font-semibold ${ingredient?.ingredientData?.[ingredient?.ingredientStore]?.link ? 'underline' : 'none'}`}
                          onPress={ingredient?.ingredientData?.[ingredient?.ingredientStore]?.link ? () => Linking.openURL(ingredient?.ingredientData?.[ingredient?.ingredientStore]?.link) : undefined }
                        >
                          {ingredient.ingredientName}
                        </Text>
                      </View>

                      {/* details per container */}
                      <View className="flex flex-col space-y-0.5 py-1.5 items-center justify-center w-[40%] border-y-[1px] border-y-zinc700 bg-zinc100 z-10">
                        {/* Total Yield */}
                        <Text className="text-[10px] text-center">
                          {`${ingredient?.ingredientData?.[ingredient?.ingredientStore]?.totalYield} ${extractUnit(ingredient?.ingredientData?.[ingredient?.ingredientStore]?.unit, ingredient?.ingredientData?.[ingredient?.ingredientStore]?.totalYield)}`}
                        </Text>
                        {/* Calories, Price */}
                        <Text className="text-[10px] text-center italic text-theme900">
                          {`${ingredient?.ingredientData?.[ingredient?.ingredientStore]?.calContainer} cal, $${ingredient?.ingredientData?.[ingredient?.ingredientStore]?.priceContainer}`}
                        </Text>
                      </View>

                      {/* servings possible */}
                      <View className="flex flex-row w-[12.5%] px-1 bg-white border-y-[1px] border-y-zinc700 border-r-0.5 border-r-zinc400 h-full justify-center items-center z-20 space-x-0.5">
                        <Text className="text-[10px]">x</Text>
                        <TextInput
                          key={index}
                          className="text-[10px] leading-[12px] text-center"
                          placeholder={ingredient?.ingredientServings !== "" ? ingredient.ingredientServings : "_"}
                          placeholderTextColor="black"
                          value={ingredient.ingredientServings}
                          onChangeText={(value) => {
                            setExtraIngredients((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, ingredientServings: value } : item
                              )
                            )
                          }}
                          onFocus={() => setKeyboardType("amt")}
                          onBlur={() => setKeyboardType("")}
                        />
                      </View>
                              
                      {/* store logo */}
                      <TouchableOpacity 
                        onPress={() => {!ingredient?.ingredientId.includes(".") && changeStoreGrid(index)}} 
                        activeOpacity={!ingredient?.ingredientId.includes(".") ? 0.5 : 1}
                        className="flex items-center justify-center w-[10%] border-y-[1px] border-y-zinc700 bg-theme200"
                      >
                        {ingredient?.ingredientStore === "-" ? (
                          <Text>-</Text>
                        ) : (
                          <Image
                            source={storeImages[ingredient.ingredientStore]?.src}
                            alt="store"
                            style={{
                              width: storeImages[ingredient.ingredientStore]?.width,
                              height: storeImages[ingredient.ingredientStore]?.height,
                            }}
                          />
                        )}
                      </TouchableOpacity>
                              
                      {/* remove extra ingredient */}
                      <TouchableOpacity 
                        className="absolute w-[15px] bg-zinc200 h-full justify-center items-center right-0 border-l-[1px] border-l-zinc700 z-50"
                        onPress={() => setExtraIngredients(extraIngredients.filter((_, i) => i !== index))}
                        activeOpacity={0.5}
                      >
                        <Icon
                          name="close"
                          size={16}
                          color={colors.zinc600}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              :
                // if no ingredients are part of the extras list
                <View className="flex px-4 py-2 ml-[15px] mr-[-15px] justify-center items-center bg-zinc450 border-2 border-zinc500">
                  <Text className="text-white italic font-bold">
                    NO INGREDIENTS SELECTED
                  </Text>
                </View>
              }


              {/* TOGGLING ADDING */}
              <TouchableOpacity 
                onPress={() => setAddingIngredient(true)}
                className="flex py-0.5 px-6 bg-theme800 ml-[15px] mr-[-15px] border border-theme900 rounded-3xl"
              >
                <Icon
                  name="add-sharp"
                  color={colors.zinc100}
                  size={16}
                />
              </TouchableOpacity>
            </View>
          :
            // when finding a new extra ingredient
            <View className="flex flex-col space-y-3 justify-center items-center">
            
              {/* TOP ROW */}
              <View className="flex flex-row w-[225px] items-center justify-between pr-[5px]">
    
                {/* Type Picker */}
                <View className="flex w-[160px] z-0 bg-zinc350 border-0.5 border-zinc400 overflow-hidden">
                  <Picker
                    selectedValue={selectedIngredientType}
                    onValueChange={(itemValue) => setSelectedIngredientType(itemValue)}
                    style={{ height: 30, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -20, }}
                    itemStyle={{ color:'black', fontWeight: 'bold', textAlign: 'center', fontSize: 12, }}
                  >
                    {typeList.length > 1 ? (
                      typeList.map((item) => (
                        <Picker.Item
                          key={item.value}
                          label={item.label}
                          value={item.value}
                        />
                      ))
                    ) : (
                      <Picker.Item
                        label="ALL TYPES"
                        value="none"
                        color="black"
                        enabled={false}
                      />
                    )}
                  </Picker>
                </View>

                {/* Buttons */}
                <View className="flex flex-row space-x-0.5">

                  {/* back */}
                  <Icon
                    name="backspace"
                    size={20}
                    color={colors.zinc700}
                    onPress={() => setAddingIngredient(false)}
                  />

                  {/* submit */}
                  <Icon
                    name="add-circle"
                    size={20}
                    color={colors.zinc700}
                    onPress={() => addIngredient()}
                  />
                </View>
              </View>

                        
              {/* INGREDIENT SEARCH */}
              <View className={`flex ${ingredientDropdownOpen ? "rounded-t-[5px]" : "rounded-[5px]"} w-5/6 h-[60px] mb-2 bg-white border-2 border-zinc350`}>
  
                {/* Filter TextInput */}
                <TextInput
                  value={searchIngredientQuery}
                  onChangeText={filterIngredientData}
                  placeholder="search for ingredient"
                  placeholderTextColor={colors.zinc400}
                  className="flex h-[40px] px-[10px] text-[14px] leading-[17px] z-10"
                  multiline={true}
                  blurOnSubmit={true}
                  onFocus={() => {
                    filterIngredientData(searchIngredientQuery);
                    setIngredientDropdownOpen(true);
                  }}
                />
  
                {/* Ingredient Dropdown */}
                {ingredientDropdownOpen && (
                  <View className="absolute w-full top-[100%] border-x-0.5 border-b-0.5 border-zinc800 bg-zinc350 rounded-b-[5px] max-h-[200px] z-50">
                    <FlatList
                      data={filteredIngredientData}
                      keyExtractor={(_, index) => index.toString()}
                      renderItem={({ item, index }) => {
                        return (
                          <TouchableOpacity
                            onPress={() => {pickIngredient(item)}}
                            className={`p-2.5 ${(index === 0) && "rounded-t-[5px]"} ${(item.ingredientName === selectedIngredientName) && "bg-zinc400"} ${(index < filteredIngredientData.length - 1 && index !== 0) && "border-t-[1px] border-zinc400"}`}
                          >
                            {/* name */}
                            <Text className="text-[13px] mr-4">
                              {item.ingredientName}
                            </Text>
                            
                            {/* price / cal */}
                            <View className="flex flex-row pt-1 justify-between items-end">
                              <Text className="text-[10.5px] text-mauve700 italic font-bold">
                                {`${(Math.min(...storeKeys
                                    .map(store => item.ingredientData[store].priceContainer / (item.ingredientData[store].calContainer === "0" ? item.ingredientData[store].totalYield : item.ingredientData[store].calContainer))
                                    .filter(calc => !isNaN(calc))
                                  ) * 100).toFixed(4)
                                  }￠ / cal`}
                              </Text>
  
                              {/* the store */}
                              <Text className="text-[10px] text-mauve900 font-bold">
                                {`${storeLabels[
                                  storeKeys.indexOf(storeKeys.reduce(
                                    (minStore, store) => {
                                      const val = item.ingredientData[store].priceContainer / item.ingredientData[store].calContainer;
                                      return (!isNaN(val) &&
                                        (minStore === null ||
                                          val < item.ingredientData[minStore].priceContainer / item.ingredientData[minStore].calContainer))
                                        ? store
                                        : minStore;
                                    },
                                    null
                                  ))
                                ].toUpperCase()}`}
                              </Text>
                            </View>
  
                            {/* selected indicator */}
                            {(item.ingredientName === selectedIngredientName) && (
                              <View className="flex-1 mt-2 mb-3 absolute right-1 items-center justify-center">
                                <Icon
                                  name="checkmark"
                                  color="black"
                                  size={18}
                                />
                              </View>
                            )}
                          </TouchableOpacity>
                        )
                      }}
                    />
                  </View>
                )}
          
                {/* BUTTONS */}
                <View className={`flex flex-row absolute bottom-0.5 z-20 ${ingredientDropdownOpen ? "right-0.5" : "justify-between w-full pl-2"}`}>

                  {(!ingredientDropdownOpen && selectedIngredientName !== "") && (
                    <Icon
                      name={(selectedIngredientId === "" || currIngredientStore === "-") ? "unlink-outline" : "link-outline"}
                      size={18}
                      onPress={() => {
                        if (selectedIngredientId !== "") {
                          setSelectedIngredientId("")
                          setBrandDropdownOpen(false)
                          setCurrIngredientStore("-");
                          setSelectedIngredientData({
                            ["-"]: {
                              "brand": "", 
                              "calContainer": "", 
                              "calServing": "", 
                              "link": "", 
                              "priceContainer": "", 
                              "priceServing": "", 
                              "servingContainer": "", 
                              "servingSize": "", 
                              "totalYield": "", 
                              "unit": ""
                            }
                          })
                        }
                      }}
                    />
                  )}

                  <View className="flex flex-row space-x-[-2px]">
  
                    {/* Drop Up / Down */}
                    <Icon
                      name={ingredientDropdownOpen ? "chevron-up-outline" : "chevron-down-outline"}
                      size={18}
                      color="black"
                      onPress={() =>  {
                        if (ingredientDropdownOpen) { filterIngredientData(searchIngredientQuery) }
                        setIngredientDropdownOpen(!ingredientDropdownOpen);
                      }}
                    />
    
                    {/* Clear */}
                    <Icon
                      name="close"
                      size={18}
                      color="black"
                      onPress={() => clearIngredientSearch()}
                    />
                  </View>
                </View>
              </View>


              {/* ENTERING / VIEWING DETAILS */}
              {(!ingredientDropdownOpen && selectedIngredientName !== "") && (
                <View className="flex flex-col w-full">

                  {/* Divider */}
                  <View className="h-[1px] bg-zinc400 mx-5 mb-6"/>

                  {/* Details */}
                  <View className="flex flex-col justify-center items-center">
                    <View className="flex flex-row w-5/6 mb-2">
                      <View className="flex flex-col w-1/4">

                        {/* STORE ICON */}
                        <TouchableOpacity 
                          onPress={() => changeStore()} 
                          className="flex items-center justify-center max-h-[30px] p-[3px]"
                        >
                          {(currIngredientStore === "-") ? (
                            <Text>-</Text>
                          ) : (
                            <View className="w-full h-full justify-center items-center rounded-r-md z-0">
                              <Image
                                source={storeImages[currIngredientStore]?.src}
                                alt="store"
                                style={{
                                  width: storeImages[currIngredientStore]?.width,
                                  height: storeImages[currIngredientStore]?.height,
                                }}
                              />
                            </View>
                          )}
                        </TouchableOpacity>

                        {/* LINK */}
                        <View className="flex flex-row h-[30px] w-full justify-center items-center mb-3">

                          {/* clear */}
                          {(selectedIngredientId === "" && selectedIngredientData[currIngredientStore]?.["link"] !== "") && (
                            <View className="absolute -left-1.5">
                              <Icon
                                name="close"
                                size={15}
                                color={colors.zinc450}
                                onPress={() => {
                                  setSelectedIngredientData((prev) => {
                                    const updated = { ...prev }; 
                                    updated[currIngredientStore]["link"] = "";
                                    return updated;
                                  })
                                }}
                              />
                            </View>
                          )}
                          
                          {/* input */}
                          <TextInput
                            className="flex bg-zinc100 border-[1px] border-zinc300 rounded-md px-2 w-[40px] h-[30px] text-[14px] leading-[17px]"
                            placeholder="link"
                            placeholderTextColor={colors.zinc400}
                            value={selectedIngredientData[currIngredientStore]?.["link"]}
                            multiline={false}
                            editable={selectedIngredientId === ""}
                            onChangeText={(value) => {
                              setSelectedIngredientData((prev) => {
                                const updated = { ...prev }; 
                                updated[currIngredientStore]["link"] = value.slice(value.lastIndexOf(" ") + 1);
                                return updated;
                              })
                            }}
                            onFocus={() => setKeyboardType("details")}
                            onBlur={() => setKeyboardType("")}
                          />
                        </View>
                      </View>
                  
                      {/* BRAND */}
                      <View className="flex flex-row w-3/4 h-full pb-3">

                        {/* Custom Input */}
                        <View className="flex flex-row">
                          <TextInput
                            value={selectedIngredientData[currIngredientStore]?.["brand"]}
                            onChangeText={(value) => filterBrandList(currIngredientStore, value, brandLists)}
                            placeholder="brand"
                            placeholderTextColor={colors.zinc500}
                            className={`flex w-full bg-theme200 border-[1px] border-zinc400 text-[14px] text-center leading-[17px] ${filteredBrandLists?.[currIngredientStore]?.map(brand => brand.value).includes(selectedIngredientData[currIngredientStore]?.["brand"]) ? "text-mauve800" : "text-black"} ${(selectedIngredientData[currIngredientStore]?.["brand"] === "") && "italic"} ${(selectedIngredientId !== "") ? "rounded-[5px]" : brandDropdownOpen  ? "rounded-t-[5px] border-b-0" : "rounded-[5px]"}`}
                            onFocus={() => {
                              setBrandDropdownOpen(true)
                              setKeyboardType("details")
                            }}
                            onBlur={() => setKeyboardType("")}
                            editable={selectedIngredientId === ""}
                          />
                        </View>
                                      
                        {/* Toggle Dropdown Button */}
                        {(selectedIngredientId === "") && (
                          <View className="absolute h-full items-center right-2 justify-center">
                            <Icon
                              name={brandDropdownOpen ? "chevron-up-outline" : "chevron-down-outline"}
                              size={20}
                              color={colors.zinc700}
                              onPress={() => {
                                if (brandDropdownOpen) { setBrandDropdownOpen(false); }
                                else { filterBrandList(currIngredientStore, selectedIngredientData[currIngredientStore]["brand"], brandLists) }
                              }}
                            />
                          </View>
                        )}
                          
                        {/* Clearing Brand */}
                        {(brandDropdownOpen && selectedIngredientId === "") && (
                          <View className="absolute -right-4 justify-center h-full">
                            <Icon
                              name="close"
                              size={15}
                              color={colors.zinc450}
                              onPress={() => {
                                filterBrandList(currIngredientStore, "", brandLists)
                                setBrandDropdownOpen(false)
                              }}
                            />
                          </View>
                        )}
                      
                        {/* Brand Dropdown */}
                        {(brandDropdownOpen && filteredBrandLists?.[currIngredientStore]?.length > 0 && selectedIngredientId === "") && (
                          <View className="flex w-full absolute top-[100%] border border-zinc400 bg-white z-50">
                            <ScrollView className="max-h-[170px]">
                              {filteredBrandLists[currIngredientStore].map((item, index) => (
                                <TouchableOpacity
                                  key={index}
                                  className="flex flex-row justify-center items-center p-2.5 border-b-[1px] border-zinc300"
                                  style={{ backgroundColor: item.bgColor }}
                                  onPress={() => {
                                    filterBrandList(currIngredientStore, item.value, brandLists)
                                    setBrandDropdownOpen(false)
                                  }}
                                >
                                  {/* text */}
                                  <Text className="w-full text-center pl-[35px] mr-[35px]" style={{ color: item.textColor, fontWeight: item.textStyle }}>
                                    {item.value}
                                  </Text>

                                  {/* indicator */}
                                  {(item.value === selectedIngredientData[currIngredientStore]?.["brand"]) && (
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
                    </View>


                    {/* SERVING SECTION */}
                    <View className={`flex flex-col w-5/6 ${(keyboardType === "details" && isKeyboardOpen) && "mb-[175px]"}`}>

                      {/* Serving Size */}
                      <View className="flex flex-row justify-between items-center mb-4">

                        {/* Label */}
                        <Text className="text-theme700 mr-4">
                          Serving Size
                        </Text>

                        <View className="flex-1 flex-row justify-center items-center bg-theme100 border-0.5 border-zinc500 px-2">
                          {/* Size */}
                          <TextInput
                            className="p-1 flex-auto text-right text-[12px] leading-[15px]"
                            placeholder="0 0/0"
                            placeholderTextColor={colors.zinc400}
                            value={selectedIngredientData[currIngredientStore]?.["servingSize"]}
                            onChangeText={(value) => {
                              setSelectedIngredientData((prev) => {
                                const updated = { ...prev }; 
                                updated[currIngredientStore]["servingSize"] = validateFractionInput(value);
                                return updated;
                              })
                            }}
                            onFocus={() => setKeyboardType("details")}
                            onBlur={() => setKeyboardType("")}
                            editable={selectedIngredientId === ""}
                          />

                          {/* Units */}
                          <View className="p-1 flex-auto relative mr-[-16.5px]">
                            <TextInput
                              className="text-left text-[12px] leading-[15px] mr-[16.5px]"
                              placeholder="unit(s)"
                              placeholderTextColor={colors.zinc400}
                              value={selectedIngredientData[currIngredientStore]?.["unit"]}
                              onChangeText={(value) => filterUnits(value)}
                              onFocus={() => setKeyboardType("details")}
                              onBlur={() => setKeyboardType("")}
                              editable={selectedIngredientId === ""}
                            />

                            {/* dropdown */}
                            {(unitDropdownOpen && filteredUnitList && selectedIngredientId === "") && (
                              <FlatList
                                className="absolute top-[100%] mt-2 max-h-[50px] w-full border bg-zinc100 border-zinc400 ml-[-0.5px] z-50"
                                data={filteredUnitList}
                                keyExtractor={(_, index) => index.toString()}
                                renderItem={({ item: unit, index }) => (
                                  <TouchableOpacity
                                    className="bg-zinc100 border-b-0.5 border-zinc350 p-1"
                                    onPress={() => {
                                      setUnitDropdownOpen(false);
                                      setSelectedIngredientData((prev) => {
                                        const updated = { ...prev }; 
                                        updated[currIngredientStore]["unit"] = unit;
                                        return updated;
                                      })
                                    }}
                                  >
                                    <Text 
                                      className="text-[12px] italic text-zinc600"
                                      numberOfLines={1}
                                    >
                                      {unit}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              />
                            )}
                          </View>

                          {/* Button to close the dropdown */}
                          {(unitDropdownOpen && selectedIngredientId === "") && (
                            <View className="absolute -right-5">
                              <Icon
                                name="chevron-up-outline"
                                size={15}
                                color={colors.zinc450}
                                onPress={() => setUnitDropdownOpen(false)}
                              />
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Servings / Container */}
                      <View className="flex flex-row justify-between items-center mb-4">

                        {/* Label */}
                        <Text className="text-theme700 mr-4">
                          Servings Per Container
                        </Text>
                        

                        {/* Input */}
                        <TextInput
                          className="flex-1 bg-theme100 border-0.5 border-zinc500 p-1 text-center text-[12px] leading-[15px] px-2"
                          placeholder="0 0/0"
                          placeholderTextColor={colors.zinc400}
                          value={selectedIngredientData[currIngredientStore]?.["servingContainer"]}
                          onChangeText={(value) => {
                            setSelectedIngredientData((prev) => {
                              const updated = { ...prev }; 
                              updated[currIngredientStore]["servingContainer"] = validateFractionInput(value);
                              return updated;
                            })
                          }}
                          onFocus={() => setKeyboardType("details")}
                          onBlur={() => setKeyboardType("")}
                          editable={selectedIngredientId === ""}
                        />
                      </View>

                      {/* Calories / Serving */}
                      <View className="flex flex-row justify-between items-center mb-4">

                        {/* Label */}
                        <Text className="text-theme700 mr-4">
                          Calories Per Serving
                        </Text>

                        {/* Input */}
                        <TextInput
                          className="flex-1 bg-theme100 border-0.5 border-zinc500 p-1 text-center text-[12px] leading-[15px] px-2"
                          placeholder="0"
                          placeholderTextColor={colors.zinc400}
                          value={selectedIngredientData[currIngredientStore]?.["calServing"]}
                          onChangeText={ (value) => {
                            setSelectedIngredientData((prev) => {
                              const updated = { ...prev }; 
                              updated[currIngredientStore]["calServing"] = validateWholeNumberInput(value);
                              return updated;
                            })
                          }}
                          onFocus={() => setKeyboardType("details")}
                          onBlur={() => setKeyboardType("")}
                          editable={selectedIngredientId === ""}
                        />
                      </View>

                      {/* Price / Container */}
                      <View className="flex flex-row justify-between items-center mb-4">

                        {/* Label */}
                        <Text className="text-theme700 mr-4">
                          Price Per Container
                        </Text>

                        {/* Input */}
                        <View className="flex-1 flex-row justify-center items-center border-0.5 border-zinc500 p-1 bg-theme100 px-2">

                          {/* Dummy $ */}
                          <TextInput
                            className="flex-auto text-right text-[12px] leading-[15px]"
                            placeholder="$"
                            placeholderTextColor={selectedIngredientData[currIngredientStore]?.["priceContainer"] ? "black" : colors.zinc400}
                            editable={false}
                          />

                          {/* User Input */}
                          <TextInput
                            className="flex-auto text-left text-[12px] leading-[15px]"
                            placeholder="0.00"
                            placeholderTextColor={colors.zinc400}
                            value={selectedIngredientData[currIngredientStore]?.["priceContainer"]}
                            onChangeText={(value) => {
                              setSelectedIngredientData((prev) => {
                                const updated = { ...prev }; 
                                updated[currIngredientStore]["priceContainer"] = validateDecimalInput(value);
                                return updated;
                              })
                            }}
                            onFocus={() => setKeyboardType("details")}
                            onBlur={() => setKeyboardType("")}
                            editable={selectedIngredientId === ""}
                          />
                        </View>
                      </View>
                    </View>

                  </View>
                </View>
              )}
            </View>
          }
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ExtraIngredientsModal;