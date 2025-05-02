///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Keyboard, ScrollView, Linking } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Picker } from '@react-native-picker/picker';

import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

import recipeAdd from '../../firebase/Recipes/recipeAdd';

// Fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';
import validateFractionInput from '../../components/Validation/validateFractionInput';

import extractUnit from '../Validation/extractUnit';

// Logos
import { Image } from 'react-native';
import aldi from '../../assets/Logos/aldi.png'
import marketbasket from '../../assets/Logos/market-basket.png'
import starmarket from '../../assets/Logos/star-market.png'
import stopandshop from '../../assets/Logos/stop-and-shop.png'
import target from '../../assets/Logos/target.png'
import walmart from '../../assets/Logos/walmart.png'

// initialize Firebase App
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);

///////////////////////////////// SIGNATURE /////////////////////////////////

const PrepToRecipeModal = ({
  prepData, ingredientsData, ingredientsSnapshot, recipesSnapshot, modalVisible, closeModal
}) => {

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardType, setKeyboardType] = useState("");

  // keyboard listener
  useEffect(() => {

    // listens for keyboard show event
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setIsKeyboardOpen(true);
      if (keyboardType !== "ingredient search") {
        setIngredientDropdownOpen(false);
      }
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

  ///////////////////////////////// SUBMITTING MODAL /////////////////////////////////

  // to compile & calculate recipe data upon submission
  const compileRecipeData = () => {

    // overall data
    const recipeName = overrideRecipeData === null ? prepData.prepName : overrideName;
    const recipeCheck = selectedIngredientData.filter(data => data !== null).length === ingredientChecks.filter(check => check === true).length;
    const recipeTags = overrideRecipeData === null ? [] : overrideRecipeData.recipeTags;
    const ingredientData = selectedIngredientData;
    const ingredientIds = selectedIngredientIds; 

    // populating totals
    let recipeCal = 0;
    let recipePrice = 0;
    let recipeServing = 0;

    ingredientCals.forEach((cal) => { if (cal !== "") { recipeCal = cal + recipeCal; } });
    ingredientPrices.forEach((price) => { if (price !== "") { recipePrice = price + recipePrice; } });
    ingredientServings.forEach((serving) => { if (serving !== "") { recipeServing = serving + recipeServing; } });

    recipeCal = recipeCal.toFixed(0);
    recipePrice = recipePrice.toFixed(2);
    recipeServing = recipeServing.toFixed(2);
    
    // compiled data
    const recipe = {
      recipeName, recipeCheck, recipeTags, recipeCal, recipePrice, recipeServing,
      ingredientChecks, ingredientData, ingredientIds, ingredientAmounts, ingredientStores,
      ingredientCals, ingredientPrices, ingredientServings,
    };

    return recipe;
  }

  const [recipeId, setRecipeId] = useState(null);

  // to submit the modal
  const submitModal = async () => {

    // retrieves and stores data
    const recipeData = compileRecipeData();

    // if not overriding, add the recipe
    if (overrideRecipeData === null) {
      recipeAdd({ recipeName: prepData.prepName, setRecipeId: setRecipeId, recipeData: recipeData });

    // if overriding, update
    } else {
      updateDoc(doc(db, 'recipes', overrideRecipeId), recipeData);
      updateDoc(doc(db, 'globals', 'recipe'), { id: overrideRecipeId });
    }

    // closes modal
    closeModal(true);
  }


  ///////////////////////////////// EDITING INGREDIENTS /////////////////////////////////

  const [editedIndices, setEditedIndices] = useState([ false, false, false, false, false, false, false, false, false, false, false, false ]);
  const [editIngredientIndex, setEditIngredientIndex] = useState(-1);

  const [ingredientChecks, setIngredientChecks] = useState([ false, false, false, false, false, false, false, false, false, false, false, false ]); 
  const [ingredientAmounts, setIngredientAmounts] = useState([ "", "", "", "", "", "", "", "", "", "", "", "" ]); 
  const [ingredientStores, setIngredientStores] = useState([ "", "", "", "", "", "", "", "", "", "", "", "" ]); 
  const [ingredientCals, setIngredientCals] = useState([ "", "", "", "", "", "", "", "", "", "", "", "" ]); 
  const [ingredientPrices, setIngredientPrices] = useState([ "", "", "", "", "", "", "", "", "", "", "", "" ]); 
  const [ingredientServings, setIngredientServings] = useState([ "", "", "", "", "", "", "", "", "", "", "", "" ]); 

  // to store that this index has been edited
  const changeEdited = (index) => {
    if (selectedIngredientIds[index] !== null) {

      // stores the selected index
      setEditIngredientIndex(index);
      
      setEditedIndices((prev) => {
        const updated = [...prev];
        updated[index] = true;
        return updated;
      });
    }
  }

  // to change the edited ingredient's store
  const changeStore = () => {
      
    // the list of stores
    const stores = ["a", "mb", "sm", "ss", "t", "w"];

    // the current and next store
    const currStore = ingredientStores[editIngredientIndex];
    let nextStore = currStore;

    // calculates the next store based on the brands that are and are not empty
    for (let i = 1; i <= 6; i++) {
      if (selectedIngredientData[editIngredientIndex][`${stores[(stores.indexOf(currStore) + i) % 6]}${'Brand'}`] !== "") {
        nextStore = stores[(stores.indexOf(currStore) + i) % 6];
        i = 7;
      }
    }
  
    // updates the current ingredient amounts
    setIngredientStores((prev) => {
      const updated = [...prev];
      updated[editIngredientIndex] = nextStore;
      return updated;
    });

    // retrigger changing the data
    changeAmount(ingredientAmounts[editIngredientIndex], editIngredientIndex, selectedIngredientData[editIngredientIndex], ingredientStores[editIngredientIndex]);
  }

  // to change the edited ingredient's checkbox
  const changeCheck = () => {
    setIngredientChecks((prev) => {
      const updated = [...prev];
      updated[editIngredientIndex] = !ingredientChecks[editIngredientIndex];
      return updated;
    });
  }

  // to change the edited ingredient's amount, which triggers the cal / $ / serving calculation
  const changeAmount = (value, index, ingredient, storeKey) => {
    
    let cals = 0;
    let prices = 0.00;
    let servings = 0.00;
    
    // general variables
    const brandKey = ingredient[`${storeKey}Brand`];

    // fractional calculations
    const amount = new Fractional(value);
    const totalYield = new Fractional(ingredient[`${storeKey}TotalYield`]);
    const calContainer = new Fractional(ingredient[`${storeKey}CalContainer`]);
    const priceContainer = new Fractional(ingredient[`${storeKey}PriceContainer`]);

    // validates the fractional value
    if (value !== "0" && value !== "" && brandKey !== "" && amount !== 0 && !isNaN(amount.numerator) && !isNaN(amount.denominator) && amount.denominator !== 0) {

      // calculate calories if the arguments are valid
      if (Object.entries(totalYield).length !== 0 && Object.entries(calContainer).length !== 0
          && !isNaN((new Fraction(totalYield.toString())) * 1) && !isNaN((new Fraction(calContainer.toString())) * 1)) {
        cals = new Fraction(amount.divide(totalYield).multiply(calContainer).toString()) * 1;
      }

      // calculates prices if the arguments are valid
      if (Object.entries(totalYield).length !== 0 && Object.entries(priceContainer).length !== 0
          && !isNaN((new Fraction(totalYield.toString())) * 1) && !isNaN((new Fraction(priceContainer.toString())) * 1)) {
        prices = new Fraction(amount.divide(totalYield).multiply(priceContainer).toString()) * 1;
      }

      // calculate servings if the arguments are valid
      if (Object.entries(totalYield).length !== 0 && !isNaN((new Fraction(totalYield.toString())) * 1)) {
        servings =  new Fraction(totalYield.divide(amount).toString()) * 1;
      }
    }
    
    // store data
    setIngredientAmounts((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
    setIngredientCals((prev) => {
      const updated = [...prev];
      updated[index] = cals;
      return updated;
    });
    setIngredientPrices((prev) => {
      const updated = [...prev];
      updated[index] = prices;
      return updated;
    });
    setIngredientServings((prev) => {
      const updated = [...prev];
      updated[index] = servings;
      return updated;
    });
  }


  ///////////////////////////////// GETTING INGREDIENT DATA /////////////////////////////////

  // for filtering
  const [filteredIngredientData, setFilteredIngredientData] = useState([]);
  const [ingredientDropdownOpen, setIngredientDropdownOpen] = useState(false);
  
  // updates the current list of ingredients and ingredient types
  useEffect(() => {
    if (ingredientsData !== null) { setFilteredIngredientData(ingredientsData) }
  }, [ingredientsData])
  
  // filters the ingredients based on the selected type
  const filterIngredientData = (ingredientQuery) => {

    if (ingredientsData !== null) {
    
      // filters for ingredient search
      let filtered = ingredientsData.filter(ingredient => {
        const queryWords = ingredientQuery
          .toLowerCase()
          .split(' ')
          .filter(word => word.trim() !== ''); // splits into words and remove empty strings
      
        // checks if every word in the query matches part of the ingredientName
        return queryWords.every(word => ingredient.ingredientName.toLowerCase().includes(word));
      });

      // sets the data and shows the dropdown list of ingredients if there are ingredients to show
      if (filtered.length !== 0) {
        setSearchIngredientQuery(ingredientQuery);
        setFilteredIngredientData(filtered);
        setIngredientDropdownOpen(true);
      } 
    
      // clears selected ingredient if it doesn't match filtering
      if (filtered.filter((ingredient) => ingredient.ingredientName.toLowerCase() === ingredientQuery.toLowerCase()).length === 0) {
        setSearchIngredientName("");
        setSearchIngredientId("");
      }
    }
  };


  // for when an ingredient is selected from the dropdown that appears above the textinput
  const pickIngredient = (item) => {

    // stores the selection
    setSearchIngredientQuery(item.ingredientName);
    setSearchIngredientName(item.ingredientName);
    setSearchIngredientId(item.id);

    // closes the dropdown
    setIngredientDropdownOpen(false);
    Keyboard.dismiss();
    setIsKeyboardOpen(false); 
    setKeyboardType("");
  }

  // for when the "x" button is selected in the ingredient textinput
  const clearIngredientSearch = () => {
    
    // resets the search filtering
    setSearchIngredientQuery("");
    setSearchIngredientName("");
    setSearchIngredientId("");

    // closes the type dropdown
    setIngredientDropdownOpen(false);
  }

  
  // for the ingredient search textinput
  const [searchIngredientQuery, setSearchIngredientQuery] = useState('');
  const [searchIngredientName, setSearchIngredientName] = useState("");
  const [searchIngredientId, setSearchIngredientId] = useState("");


  ///////////////////////////////// INGREDIENT PICKERS /////////////////////////////////

  const [selectedIngredientIds, setSelectedIngredientIds] = useState([null, null, null, null, null, null, null, null, null, null, null, null]);
  const [selectedIngredientData, setSelectedIngredientData] = useState([null, null, null, null, null, null, null, null, null, null, null, null]);
  
  // to update the id of the current index
  const setIngredient = async (index, store) => {
    
    // if a query is provided
    if ((store && searchIngredientName !== null && searchIngredientName !== "") || !store) {
      
      const foundData = ingredientsSnapshot.docs.map((item) => item.data())[ingredientsSnapshot.docs.map((item) => item.id).indexOf(searchIngredientId)];

      let nextStore = null;
      let nextAmount = store ? ingredientAmounts[index] : "";

      // if overriding or the new ingredient was blank before at this index
      if (store) {

        // modifies the amount to match the meal prep data if new
        if (selectedIngredientData[index] === null) {
          nextAmount = prepData.currentAmounts[index];

          setIngredientAmounts((prev) => {
            const updated = [...prev]; 
            updated[index] = nextAmount;
            return updated;
          });
        }
      
        // the list of stores
        const stores = ["a", "mb", "sm", "ss", "t", "w"];
    
        // the current and next store
        const currStore = "";
    
        // calculates the next store based on the brands that are and are not empty
        for (let i = 1; i <= 6; i++) {
          if (foundData[`${stores[(stores.indexOf(currStore) + i) % 6]}${'Brand'}`] !== "") {
            nextStore = stores[(stores.indexOf(currStore) + i) % 6];
            i = 7;
          }
        }
      }
      
      // updates the current ingredient store
      setIngredientStores((prev) => {
        const updated = [...prev];
        updated[index] = nextStore;
        return updated;
      });
      
      // stores the ingredient name
      setSelectedIngredientData((prev) => {
        const updated = [...prev]; 
        updated[index] = store ? foundData : null;
        return updated;
      });

      // stores the ingredient id
      setSelectedIngredientIds((prev) => {
        const updated = [...prev]; 
        updated[index] = store ? (searchIngredientId === "" || searchIngredientId === null ? null : searchIngredientId) : null;
        return updated;
      });

      // clears the query bar
      clearIngredientSearch();

      // retrigger changing the data
      changeAmount(nextAmount, index, foundData, nextStore);
    }
  }


  ///////////////////////////////// FINDING RECIPE /////////////////////////////////

  const [showFindRecipe, setShowFindRecipe] = useState(false);
  
  // for filtering
  const [recipeList, setRecipeList] = useState([]);
  const [filteredRecipeList, setFilteredRecipeList] = useState([]);
  
  // for keyword input
  const [recipeKeywordQuery, setRecipeKeywordQuery] = useState("");
  const [ingredientKeywordQuery, setIngredientKeywordQuery] = useState("");
  
  // updates the current list of recipes
  useEffect(() => {
    if (recipesSnapshot !== null) { 
  
      // reformats each recipe from the snapshot
      const recipesArray = recipesSnapshot.docs.map((doc) => {
        const formattedRecipe = {
          id: doc.id,
          ... doc.data(),
        };
        return formattedRecipe;
      })
      .sort((a, b) => a.recipeName.localeCompare(b.recipeName)); // sort by recipeName alphabetically
  
      setRecipeList(recipesArray);
    }
  }, [recipesSnapshot]);
  
  // to filter the recipe list based on the top section
  const filterRecipeList = async () => {
    
    // maps over the current (full) list of recipes
    let filtered = recipeList.filter(recipe =>
      
      // recipe keywords
      (recipeKeywordQuery?.length > 0 
        ? recipeKeywordQuery
            .split(' ') // Split the string into an array of keywords
            .every(keyword => 
              recipe.recipeName.toLowerCase().includes(keyword.toLowerCase())
            ) 
        : true) &&

      // ingredient keywords
      (ingredientKeywordQuery?.length > 0 
        ? ingredientKeywordQuery
            .split(' ') // Split the string into an array of keywords
            .every(keyword => 
              recipe.ingredientData.some(ingredient =>
                ingredient &&
                ingredient.ingredientName &&
                ingredient.ingredientName.toLowerCase().includes(keyword.toLowerCase())
              )
            )
        : true)
    );

    // sets the filtered data
    setFilteredRecipeList([null, ...filtered]);
    
    // clears the recipe card if there are no matching recipes
    if (selectedRecipeData && !filtered.some(recipe => recipe.recipeName === selectedRecipeData.recipeName)) {
      setSelectedRecipeId(null);
      setSelectedRecipeData(null);
    } 
  }

  // when any of the filtering inputs or the recipe list is changed, refilter
  useEffect(() => {
    filterRecipeList();
    setSelectedRecipeId(null);
    setSelectedRecipeData(null);
    setOverrideRecipeId(null);
    setOverrideRecipeData(null);
  }, [recipeKeywordQuery, ingredientKeywordQuery, recipeList]);


  ///////////////////////////////// RECIPE OVERRIDING /////////////////////////////////

  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [selectedRecipeData, setSelectedRecipeData] = useState(null);
  const [recipeDropdownOpen, setRecipeDropdownOpen] = useState(false);

  const [overrideRecipeId, setOverrideRecipeId] = useState(null);
  const [overrideRecipeData, setOverrideRecipeData] = useState(null);

  const [overrideName, setOverrideName] = useState("");
  const [showOverrideSubmit, setShowOverrideSubmit] = useState(false);

  const [recipeTagList, setRecipeTagList] = useState([]);
  const [showTagList, setShowTagList] = useState(false);

  // when the selected recipe changes, store the data
  useEffect(() => {
    if (selectedRecipeId !== null && selectedRecipeId !== "" && recipeList.filter((recipe) => recipe.id === selectedRecipeId).length !== 0) {
      setSelectedRecipeData(recipeList.filter((recipe) => recipe.id === selectedRecipeId)[0]);
    } else {
      setSelectedRecipeData(null);
    }
  }, [selectedRecipeId]);

  // when the override button is clicked, store the data and redirect
  const setOverride = () => {
    setOverrideRecipeId(selectedRecipeId !== null && selectedRecipeId !== "" ? selectedRecipeId : null);
    setOverrideRecipeData(selectedRecipeData);
    setOverrideName(selectedRecipeId !== null && selectedRecipeId !== "" ? prepData.prepName : "");
    setShowFindRecipe(false);
  }


  ///////////////////////////////// HTML /////////////////////////////////
  
  return (

    // CONTAINER
    <Modal
      transparent={true}
      animationType="slide"
      visible={modalVisible}
      onRequestClose={() => closeModal(false)}
    >
      <View className="flex-1 justify-center items-center">
    
        {/* Background Overlay */}
        <TouchableOpacity onPress={() => closeModal(false)} className="absolute bg-black opacity-50 w-full h-full"/>
            
        {/* Modal Content */}
        <View className={`bg-zinc200 px-7 py-5 rounded-2xl w-4/5 ${editIngredientIndex !== -1 ? "mb-[125px]" : ""}`}>
        
          {/* to choose which name to select */}
          {showOverrideSubmit
          ?
            <View className="flex flex-col">

              {/* Header */}
              <View className="flex flex-row w-full justify-between items-center">

                {/* title */}
                <Text className="text-black font-bold text-[16px]">
                  SELECT RECIPE NAME
                </Text>

                {/* check button */}
                <View className="flex w-1/12">
                  <Icon 
                    size={24}
                    color={colors.zinc900}
                    name="checkmark-sharp"
                    onPress={() => submitModal()}
                  />
                </View>
              </View>

              {/* DIVIDER */}
              <View className="h-[1px] bg-zinc400 mb-5"/>

              <View className="flex flex-col space-y-2">

                {/* Prep Name */}
                <View className="flex flex-row w-full justify-start items-center space-x-2">
                  <Icon
                    name={overrideName === prepData?.prepName ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={colors.theme600}
                    onPress={() => setOverrideName(prepData.prepName)}
                  />
                  <Text className="text-[14px] text-zinc900">
                    {prepData.prepName}
                  </Text>
                </View>

                {/* Recipe Name */}
                <View className="flex flex-row w-full justify-start items-center space-x-2">
                  <Icon
                    name={overrideName === overrideRecipeData?.recipeName ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={colors.theme600}
                    onPress={() => setOverrideName(overrideRecipeData?.recipeName)}
                  />
                  <Text className="text-[14px] text-zinc900">
                    {overrideRecipeData?.recipeName}
                  </Text>
                </View>
              </View>
            </View>


          : // NORMAL MODAL
          <>
            {/* HEADER */}
            <View className="flex-row items-center justify-evenly">

            {/* back button if editing */}
            {(editIngredientIndex !== -1 || showFindRecipe) &&
              <View className="flex w-1/12">
                <Icon
                  name="arrow-back"
                  size={24}
                  color={colors.zinc700}
                  onPress={() => {
                    setEditIngredientIndex(-1);
                    setShowFindRecipe(false);
                  }}
                />
              </View>
            }

            {/* Title */}
            <Text className={`${editIngredientIndex === -1 && !showFindRecipe ? "pl-2 text-center" : "pr-2 text-center"} w-11/12 text-black font-bold py-1 text-[18px]`}>
              {prepData?.prepName || ""}
            </Text>

            {/* check button if not editing */}
            {editIngredientIndex === -1 && !showFindRecipe &&
              <View className="flex w-1/12">
                <Icon 
                  size={24}
                  color={colors.zinc900}
                  name="checkmark-sharp"
                  onPress={() => {overrideRecipeData === null ? submitModal() : setShowOverrideSubmit(true)}}
                />
              </View>
            }
            </View>


            {/* DIVIDER */}
            <View className="h-[1px] bg-zinc400 mb-5"/>

            {!showFindRecipe
            ? 
              // INGREDIENT SECTIONS
              <>
              {editIngredientIndex === -1 
              ?
                // SETTING INGREDIENTS
                <>
                  
                  {/* If there are no ingredients */}
                  {prepData?.currentData?.filter(item => item === null).length === 12 &&
                    <View className="flex w-full py-1 justify-center items-center border-x-2 border-t-2 border-zinc500 bg-zinc400">
                      <Text className="text-black font-semibold text-[12px] italic">
                        no ingredients available
                      </Text>
                    </View>
                  }

                  {/* old and new */}
                  <View className="border-x-2 border-t-2 border-zinc500 bg-zinc500">
                  {Array.from({ length: 12 }, (_, index) => (
                      
                    <View key={`frozen-${index}`}>
                      {prepData?.currentData[index] !== null &&
                      <View className="flex flex-col">

                        {/* original ingredient */}
                        <View className={`flex flex-row w-full min-h-[20px] justify-between items-center px-1 py-0.5 border-b ${index % 2 === 0 ? "bg-zinc400" : "bg-theme300"}`}>
                          {/* name */}
                          <Text className="text-black text-[12px] font-semibold text-center px-1 w-[88%]">
                              {prepData?.currentData[index]?.ingredientData?.ingredientName}
                          </Text>

                          {/* BUTTONS */}
                          <View className="flex flex-row items-center justify-end space-x-[-3px] w-[12%]">
                            
                            {/* + */}
                            {searchIngredientName !== "" &&
                            <Icon 
                              size={20}
                              color={colors.theme800}
                              name="add-sharp"
                              onPress={() => setIngredient(index, true)}
                            />
                            }

                            {/* X */}
                            {selectedIngredientData[index] !== null &&
                            <Icon 
                              size={20}
                              color={colors.theme900}
                              name="close-outline"
                              onPress={() => setIngredient(index, false)}
                            />
                            }
                          </View>
                        </View>

                        {/* selected ingredient */}
                        <View className={`flex flex-row w-full min-h-[25px] justify-between items-center py-0.5 mb-0.5 pl-0.5 pr-1 ${index % 2 === 0 ? "bg-zinc350" : "bg-theme200"}`}>
                          {/* name */}
                          <View className="flex ml-1 pl-1 pr-2">
                            <Text className="text-black text-[12px] italic text-left">
                              {selectedIngredientData[index]?.ingredientName || ""}  
                            </Text>
                          </View>

                          {/* BUTTONS */}
                          {selectedIngredientIds[index] !== null && 
                            <View className="flex flex-row items-center justify-center space-x-[-3px]">
                              {/* Edit */}
                              <Icon 
                                size={20}
                                color={editedIndices[index] ? colors.zinc500 : "white"}
                                name="ellipsis-horizontal"
                                onPress={() => changeEdited(index)}
                              />
                            </View>
                          }
                        </View>
                      </View>
                      }
                      </View>
                  ))}
                  </View>
                  

                  {/* filtering */}          
                  <View className="flex flex-row justify-center items-center pt-5 px-2">
                          
                    {/* MOCK text input */}
                    <TouchableOpacity 
                      className="flex w-full h-full"
                      onPress={() => { 
                        filterIngredientData(searchIngredientQuery);
                        setIsKeyboardOpen(true);
                        setKeyboardType("ingredient search")
                        setIngredientDropdownOpen(false);
                      }}
                    >
                      <Text className={`${searchIngredientQuery !== '' && searchIngredientQuery !== "" ? "text-black" : "text-zinc400"} ${ingredientDropdownOpen ? "rounded-b-[5px] rounded-tr-[5px]" : "rounded-[5px]"} flex-1 bg-white border-[1px] border-zinc300 px-[10px] py-[5px] text-[13px] leading-[16px]`}>
                        {searchIngredientQuery !== '' && searchIngredientQuery !== "" ? searchIngredientQuery : "search for ingredient"}
                      </Text>
                    </TouchableOpacity>
                    
                    {/* BUTTONS */}
                    <View className="flex flex-row space-x-[-2px] absolute right-0 pt-5 px-2 z-20">
          
                      {/* Drop Up */}
                      <Icon
                        name="chevron-up-outline"
                        size={20}
                        color="black"              
                        onPress={() => {
                          filterIngredientData(searchIngredientQuery);
                          setIngredientDropdownOpen(true);
                        }}
                      />
          
                      {/* Clear */}
                      <Icon
                        name="close"
                        size={20}
                        color="black"
                        onPress={() => clearIngredientSearch()}
                      />
                    </View>
                    
                    {/* Ingredient Dropdown */}
                    {(ingredientDropdownOpen && !isKeyboardOpen) && (
                      <View className="absolute left-[8px] right-[50px] bottom-[100%] border-x border-t bg-zinc500 rounded-t-[5px] max-h-[200px] z-50">
                        <ScrollView>
                          {filteredIngredientData.map((item, index) => (
                            <TouchableOpacity
                              key={index}
                              onPress={() => pickIngredient(item)}
                              className={`p-2.5 ${index === 0 && "rounded-t-[5px]"} ${item.ingredientName === searchIngredientName && "bg-zinc600"} ${index < filteredIngredientData.length - 1 && "border-b-[1px] border-zinc600"}`}
                            >
                              {/* name */}
                              <Text className="text-[13px] mr-4 text-white font-semibold">
                                {item.ingredientName}
                              </Text>
                              
                              {/* selected indicator */}
                              {item.ingredientName === searchIngredientName &&
                                <View className="flex-1 mt-2 mb-3 absolute right-1 items-center justify-center">
                                  <Icon
                                    name="checkmark"
                                    color="black"
                                    size={18}
                                  />
                                </View>
                              }
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </>
              :
                // EDITING INGREDIENT DETAILS
                <View className="flex flex-col justify-center items-center space-y-2 px-2">

                  {/* Name */}
                  <View className="flex flex-row w-full justify-center py-1 px-2 items-center bg-theme600 border-2 border-theme700 rounded-t-md">
                    <Text className="text-white font-bold text-[14px] text-center">
                      {selectedIngredientData[editIngredientIndex].ingredientName.toUpperCase()}
                    </Text>
                  </View>
                  
                  {/* Details */}
                  <View className="flex flex-row w-full border-2 border-zinc450 rounded-bl-3xl mb-4">

                    {/* store */}
                    <View className="flex flex-col w-[10%] bg-white justify-center items-center rounded-bl-3xl border-r">
                      <TouchableOpacity 
                        onPress={() => changeStore()} 
                        className="flex items-center justify-center w-[30px]"
                      >
                        {ingredientStores[editIngredientIndex] === "" || ingredientStores[editIngredientIndex] === null ? 
                        <Text>-</Text>
                        :
                        <Image
                          source={
                            ingredientStores[editIngredientIndex] === "a" ? aldi :
                            ingredientStores[editIngredientIndex] === "mb" ? marketbasket :
                            ingredientStores[editIngredientIndex] === "sm" ? starmarket :
                            ingredientStores[editIngredientIndex] === "ss" ? stopandshop :
                            ingredientStores[editIngredientIndex] === "t" ? target :
                            ingredientStores[editIngredientIndex] === "w" ? walmart :
                            null
                          }
                          alt="store"
                          className={`${
                            ingredientStores[editIngredientIndex] === "a" ? "w-[18px] h-[12px]" : 
                            ingredientStores[editIngredientIndex] === "mb" ? "w-[19px] h-[18px]" : 
                            ingredientStores[editIngredientIndex] === "sm" ? "w-[18px] h-[18px]" :
                            ingredientStores[editIngredientIndex] === "ss" ? "w-[16px] h-[18px]" :
                            ingredientStores[editIngredientIndex] === "t" ? "w-[18px] h-[18px]" : 
                            ingredientStores[editIngredientIndex] === "w" ? "w-[18px] h-[18px]" : ""
                          }`}
                        />
                        }
                      </TouchableOpacity>
                    </View>

                    {/* details */}
                    <View className="flex flex-col w-[90%]">

                      {/* Amount */}
                      <View className="flex flex-row h-[30px] bg-zinc350 justify-center items-center mr-[22px]">

                        {/* Input Amount */}
                        <TextInput
                          key={editIngredientIndex}
                          className="p-1 text-[12px] leading-[14px] text-center font-semibold bg-theme100"
                          placeholder={ingredientAmounts[editIngredientIndex] !== "" ? ingredientAmounts[editIngredientIndex] : "_"}
                          placeholderTextColor="black"
                          value={ingredientAmounts[editIngredientIndex]}
                          onChangeText={(value) => changeAmount(validateFractionInput(value), editIngredientIndex, selectedIngredientData[editIngredientIndex], ingredientStores[editIngredientIndex])}
                        />

                        {/* Unit */}
                        <Text className="text-[12px] text-zinc800 font-medium">
                          {` ${selectedIngredientData[editIngredientIndex][`${ingredientStores[editIngredientIndex]}Unit`]}` === " undefined" ? " unit(s)" : ` ${extractUnit(selectedIngredientData[editIngredientIndex][`${ingredientStores[editIngredientIndex]}Unit`], ingredientAmounts[editIngredientIndex])}`}
                        </Text>

                        {/* checkbox */}
                        <View className="absolute right-[-22px] w-[22px] pl-[1px] justify-center items-center h-full z-10">
                          <Icon
                            name={ingredientChecks[editIngredientIndex] ? "checkbox" : "square-outline"}
                            size={20}
                            color={colors.theme800}
                            onPress={() => changeCheck()}
                          />
                        </View>
                      </View>

                      {/* Calculations */}
                      <View className="flex flex-row h-[30px] bg-zinc400 justify-evenly items-center z-50 border-t-[1px] border-t-zinc450">
                        {/* calories */}
                        <Text className="text-[12px] text-white font-semibold">
                          {ingredientCals[editIngredientIndex] === "" ? "0" : ingredientCals[editIngredientIndex].toFixed(0)}{" cals"}
                        </Text>
                        {/* price */}
                        <Text className="text-[12px] text-white font-semibold">
                          {"$"}{ingredientPrices[editIngredientIndex] === "" ? "0.00" : ingredientPrices[editIngredientIndex].toFixed(2)}
                        </Text>
                        {/* servings */}
                        <Text className="text-[12px] text-white font-semibold">
                          {ingredientServings[editIngredientIndex] === "" ? "0.00" : ingredientServings[editIngredientIndex].toFixed(2)}{" servings"}
                        </Text>
                      </View>
                    </View>
                  </View>
              

                  {/* DIVIDER */}
                  <View className="h-[1px] bg-zinc400 my-4 w-full"/>

                  {/* Previous Info */}
                  <View className="flex flex-col w-full justify-center items-center">
                    {/* text */}
                    <View className="w-full bg-theme200 py-1 justify-center items-center border-t-[1px] border-x-[1px] border-zinc350">
                      <Text className="text-[12px] italic font-bold text-zinc800">
                        DETAILS FROM MEAL PREP
                      </Text>
                    </View>

                    {/* Details */}
                    <View className="flex flex-row w-full justify-center items-center border-[1px] border-zinc350">
                      {/* amount / unit */}
                      <View className="w-7/12 bg-white py-1 justify-center items-center border-r-2 border-r-zinc300">
                        <Text className="text-[12px] text-zinc700 font-medium">
                          {prepData.currentAmounts[editIngredientIndex]} {extractUnit(prepData.currentData[editIngredientIndex].ingredientData[`${prepData.currentData[editIngredientIndex].ingredientStore}Unit`], prepData.currentAmounts[editIngredientIndex])}
                        </Text>
                      </View>
                      {/* calories, $ */}
                      <View className="w-5/12 bg-zinc100 py-1 justify-center items-center">
                        <Text className="text-[12px] text-zinc700 font-medium">
                          {prepData.currentCals[editIngredientIndex].toFixed(0)} {"cals, $"}{prepData.currentPrices[editIngredientIndex].toFixed(2)} 
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              }

              {/* Recipe Lookup */}
              {!showFindRecipe && editIngredientIndex === -1 &&
              <>
                {overrideRecipeId === null
                  ? 
                    // pick new
                    <View className="flex justify-center items-center mt-3">
                      {/* button to find a recipe to override */}
                      <TouchableOpacity
                        className="flex flex-row justify-center items-center bg-theme600 py-1.5 px-4 space-x-2 rounded-lg"
                        onPress={() => setShowFindRecipe(true)}
                      >
                        <Icon
                          name="search"
                          color="white"
                          size={18}
                        />
                        <Text className="text-center text-white font-bold text-[13px]">
                          FIND SIMILAR RECIPE
                        </Text>
                      </TouchableOpacity>
                    </View>
                  : 
                    // pick different
                  <View className="flex flex-col">

                    {/* button to change overriding */}
                    <View className="flex flex-row w-full space-x-2 justify-center items-center mt-3">
                      <TouchableOpacity
                        className="flex flex-row justify-center items-center bg-theme600 py-1.5 px-4 space-x-2 rounded-lg"
                        onPress={() => setShowFindRecipe(true)}
                      >
                        <Icon
                          name="shuffle"
                          color="white"
                          size={18}
                        />
                        <Text className="text-center text-white font-bold text-[13px]">
                          {overrideRecipeData.recipeName}
                        </Text>
                      </TouchableOpacity>
        
                      {/* Button to open tag list */}
                      <Icon
                        name="trash"
                        color={colors.zinc700}
                        size={20}
                        onPress={() => {
                          setOverrideRecipeId(null);
                          setOverrideRecipeData(null);
                          setSelectedRecipeId(null);
                          setSelectedRecipeData(null);
                        }}
                      />
                    </View>
                  </View>
                }
              </>
              }
              </>

            :
              // RECIPE SECTION
              <View className="flex flex-col justify-center items-center">

                {/* Current Prep Details */}
                <View className="flex flex-col w-full justify-center items-center">

                  {/* label */}
                  <View className="flex w-11/12 bg-theme700 justify-center items-center py-0.5">
                    <Text className="text-white font-semibold italic text-[12px]">
                      LIST OF INGREDIENTS
                    </Text>
                  </View>
                  
                  {/* If there are no ingredients */}
                  {prepData?.currentData?.filter(item => item === null).length === 12 &&
                    <View className="flex w-11/12 py-1 justify-center items-center bg-zinc400 border-x-2 border-theme700">
                      <Text className="text-black font-semibold text-[12px] italic">
                        ━
                      </Text>
                    </View>
                  }

                  {/* map of ingredients */}
                  {keyboardType !== "recipe keyword" &&
                    <View className="w-11/12 border-x-2 border-b-2 border-theme700">
                      {Array.from({ length: 12 }, (_, index) => (
                          
                        <View key={`frozen-${index}`}>
                          {prepData?.currentData[index] !== null &&
                          <View className="flex flex-col">

                            {/* name */}
                            <View className={`flex flex-row w-full min-h-[20px] justify-between items-center px-1 py-0.5 border-b ${index % 2 === 0 ? "bg-theme100" : "bg-theme200"}`}>
                              <Text className="text-black text-[12px] text-left px-1">
                                  {prepData?.currentData[index]?.ingredientData?.ingredientName}
                              </Text>
                            </View>
                          </View>
                          }
                        </View>
                      ))}
                    </View>
                  }
        
                  {/* LOOKUP */}
                  <View className="flex flex-col w-full">

                    {/* Ingredient Keyword */}
                    <View className="bg-zinc200 w-full h-[30px] mt-3">
          
                      {/* text input */}
                      <TextInput
                        value={ingredientKeywordQuery}
                        onChangeText={setIngredientKeywordQuery}
                        placeholder="ingredient keyword(s)"
                        placeholderTextColor={colors.zinc400}
                        className="flex-1 bg-white rounded-[5px] border-[1px] border-zinc300 pl-2.5 pr-10 text-[13px] leading-[15px]"
                        onFocus={() => setKeyboardType("ingredient keyword")}
                        onBlur={() => setKeyboardType("")}
                      />

                      {/* clear button */}
                      <View className="absolute right-0 justify-center h-[30px]">
                        <Icon
                          name="close-outline"
                          size={20}
                          color="black"
                          onPress={() => setIngredientKeywordQuery([])}
                        />
                      </View>
                    </View>

                    <View className="flex flex-row w-full justify-center items-center space-x-1 mt-1">
                      {/* Recipe Keyword */}
                      <View className="flex-1 bg-zinc200 h-[30px]">
            
                        {/* text input */}
                        <TextInput
                          value={recipeKeywordQuery}
                          onChangeText={setRecipeKeywordQuery}
                          placeholder="recipe keyword(s)"
                          placeholderTextColor={colors.zinc400}
                          className="flex-1 bg-white rounded-[5px] border-[1px] border-zinc300 pl-2.5 pr-10 text-[13px] leading-[15px]"
                          onFocus={() => setKeyboardType("recipe keyword")}
                          onBlur={() => setKeyboardType("")}
                        />
            
                        {/* clear button */}
                        <View className="absolute right-0 justify-center h-[30px]">
                          <Icon
                            name="close-outline"
                            size={20}
                            color="black"
                            onPress={() => setRecipeKeywordQuery("")}
                          />
                        </View>
                      </View>
              
                      {/* numbers of recipes that match the filtering */}
                      <View className="flex justify-center items-center py-1 px-2 bg-zinc700 border border-zinc900">
                        <Text className="text-white font-bold text-[12px]">
                          {filteredRecipeList.length - 1} {filteredRecipeList.length - 1 === 1 ? "RECIPE" : "RECIPES"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* DIVIDER */}
                <View className="h-[1px] bg-zinc400 mt-5 mb-2 w-full"/>


                {/* Recipe Picker */}
                <View className="flex w-full pt-4">
                  <Picker
                    selectedValue={selectedRecipeId}
                    onValueChange={(value) => setSelectedRecipeId(value)}
                    style={{ height: 25, justifyContent: 'center', overflow: 'hidden', backgroundColor: colors.zinc600, }}
                    itemStyle={{ color: 'white', textAlign: 'center', fontSize: 12, fontStyle: 'italic', fontWeight: 'bold', }}
                  >
                    {filteredRecipeList.map((item) => {
                      return (
                        <Picker.Item
                          key={item?.id || Math.random()}
                          label={item?.recipeName || "no recipe chosen to override"}
                          value={item?.id || ""}
                        />
                      );
                    })}
                  </Picker>
                </View>
                  
                {/* If there are no ingredients */}
                {selectedRecipeData?.ingredientData?.filter(item => item === null).length === 12 &&
                  <View className="flex w-full py-1 justify-center items-center border-x-2 border-zinc500 bg-zinc400">
                    <Text className="text-black font-semibold text-[12px] italic">
                      no ingredients available
                    </Text>
                  </View>
                }

                {/* map of ingredients */}
                {selectedRecipeId !== null && selectedRecipeId !== "" && selectedRecipeData !== null  && selectedRecipeData.ingredientData && 
                  <View className="w-full border-x-2 border-b-2 border-zinc500">
                    
                    {Array.from({ length: 12 }, (_, index) => (
                      <View key={`frozen-${index}`}>
                        {selectedRecipeData !== null && selectedRecipeData.ingredientData[index] !== null &&
                        <View className="flex flex-col">

                          {/* name */}
                          <View className={`flex flex-row w-full min-h-[20px] justify-between items-center px-1 py-0.5 border-b ${index % 2 === 0 ? "bg-zinc300" : "bg-zinc350"}`}>
                            <Text className="text-black text-[12px] text-left px-1">
                                {selectedRecipeData?.ingredientData[index]?.ingredientName}
                            </Text>
                          </View>
                        </View>
                        }
                      </View>
                    ))}
                  </View>
                }

                {/* Selected Recipe Tag List */}
                {showTagList && selectedRecipeId !== null && selectedRecipeId !== "" &&
                  <View className="flex w-full py-1.5 mx-2 items-center justify-center bg-white border-x-2 border-b-2 border-theme300">
                    <Text className="text-theme800 font-extrabold text-[10px]">
                      {selectedRecipeData?.recipeTags?.join(", ").toUpperCase() || "no tags available"}
                    </Text>
                  </View>
                }

                {/* Recipe Override */}
                <View className="flex flex-row justify-center items-center mt-3">
                  {selectedRecipeId !== null && selectedRecipeId !== "" 
                  ?
                    // override chosen
                    <View className="flex flex-row w-full justify-center items-center space-x-4">
                      <TouchableOpacity
                        className="flex flex-row justify-center items-center bg-theme600 py-1.5 px-4 space-x-2 rounded-lg"
                        onPress={() => setOverride()}
                      >
                        {/* Icon */}
                        <Icon
                          name="repeat"
                          color="white"
                          size={20}
                        />
                        {/* Text */}
                        <Text className="text-center text-white font-bold text-[13px]">
                          OVERRIDE RECIPE
                        </Text>
                      </TouchableOpacity>
      
                      {/* Button to open tag list */}
                      <View className="bg-white p-1 border-2 border-theme100">
                        <Icon
                          name="pricetags"
                          color={colors.zinc700}
                          size={20}
                          onPress={() => setShowTagList(!showTagList)}
                        />
                      </View>
                    </View>
                  :
                    // un-override
                    <View>
                      <View className="flex absolute z-20 w-1/12 justify-center h-[25px] top-[-37px] pl-1">
                        {/* button to trigger going back, setting null */}
                        <Icon
                          name="arrow-undo-circle"
                          color="white"
                          size={20}
                          onPress={() => setOverride()}
                        />
                      </View>
                    </View>
                  }
                </View>
              </View>
            }
            </>
          }
        </View>
              
              
        {/* KEYBOARD POPUP SECTION */}
        {isKeyboardOpen && keyboardType === "ingredient search" && 
          <>
            {/* Grayed Out BG */}
            <TouchableOpacity 
              className="absolute bg-black bg opacity-40 w-full h-full z-10"
              onPress={() => {
                Keyboard.dismiss();
                setIsKeyboardOpen(false); 
                setKeyboardType("");
              }}
            />
          
            {/* Popup */}
            <View className="flex flex-col justify-center items-center w-full absolute bottom-[365px] space-y-1.5">
            
              {/* INGREDIENT SEARCH */}
              <View className="w-1/2 h-[70px]">
      
                {/* Filter TextInput */}
                <TextInput
                  value={searchIngredientQuery}
                  onChangeText={(value) => {
                    filterIngredientData(value);
                    setIngredientDropdownOpen(true);
                  }}
                  placeholder="search for ingredient"
                  placeholderTextColor={colors.zinc400}
                  className={`${ingredientDropdownOpen ? "rounded-b-[5px]" : "rounded-[5px]"} flex-1 bg-white border-[1px] border-zinc300 px-[10px] text-[14px] leading-[16px] z-20`}
                  multiline={true}
                  blurOnSubmit={true}
                  onFocus={() => {
                    filterIngredientData(searchIngredientQuery);
                    setIngredientDropdownOpen(true);
                  }}
                />
                
                {/* Ingredient Dropdown */}
                {ingredientDropdownOpen && (
                 <View className="absolute w-full bottom-[100%] border-x border-t bg-zinc350 rounded-t-[5px] max-h-[200px] z-50">
                    <ScrollView>
                      {filteredIngredientData.map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => pickIngredient(item)}
                          className={`p-2.5 ${index === 0 && "rounded-t-[5px]"} ${item.ingredientName === searchIngredientName && "bg-zinc400"} ${index < filteredIngredientData.length - 1 && "border-b-[1px] border-zinc400"}`}
                        >
                          {/* name */}
                          <Text className="text-[13px] mr-4">
                            {item.ingredientName}
                          </Text>
                          
                          {/* selected indicator */}
                          {item.ingredientName === searchIngredientName &&
                            <View className="flex-1 mt-2 mb-3 absolute right-1 items-center justify-center">
                              <Icon
                                name="checkmark"
                                color="black"
                                size={18}
                              />
                            </View>
                          }
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
      
                {/* BUTTONS */}
                <View className="flex flex-row space-x-[-2px] absolute right-0 bottom-0 z-20">
      
                  {/* Drop Up */}
                  <Icon
                    name="chevron-up-outline"
                    size={20}
                    color="black"              
                    onPress={() => {
                      filterIngredientData(searchIngredientQuery);
                      setIngredientDropdownOpen(true);
                    }}
                  />
      
                  {/* Clear */}
                  <Icon
                    name="close"
                    size={20}
                    color="black"
                    onPress={() => clearIngredientSearch()}
                  />
                </View>
              </View>
            </View>
          </>
        }
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default PrepToRecipeModal;