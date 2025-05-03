///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useRef, useState, useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';

import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

import { View, Text, ScrollView, TextInput, TouchableOpacity, Linking, Keyboard, } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Picker } from '@react-native-picker/picker';

import CalcIngredientModal from '../../components/MultiUse/CalcIngredientModal';
import ModMealModal from '../../components/MultiUse/ModMealModal';
import ViewIngredientModal from '../../components/MultiUse/ViewIngredientModal';
import NewTagModal from '../../components/Food-Recipes/NewTagModal';
import ModTagModal from '../../components/Food-Recipes/ModTagModal';

import { allIngredientFetch } from '../../firebase/Ingredients/allIngredientFetch'; 

// Fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';
import validateFractionInput from '../../components/Validation/validateFractionInput';

import extractUnit from '../../components/Validation/extractUnit';

// Logos
import { Image } from 'react-native';
import aldi from '../../assets/Logos/aldi.png'
import marketbasket from '../../assets/Logos/market-basket.png'
import starmarket from '../../assets/Logos/star-market.png'
import stopandshop from '../../assets/Logos/stop-and-shop.png'
import target from '../../assets/Logos/target.png'
import walmart from '../../assets/Logos/walmart.png'

// initialize Firebase App
import { getFirestore, doc, updateDoc, getDoc, collection, getDocs, query } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

export default function Recipes ({ isSelectedTab }) {

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
      if (keyboardType !== "ingredient search") {
        setIsKeyboardOpen(false);
        setKeyboardType("");
      }
    });

    // cleans up listeners on unmount
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [keyboardType]);
  

  ///////////////////////////////// NAVIGATION LOGIC /////////////////////////////////

  // when the tab is switched to recipes
  useEffect(() => {

    if (isSelectedTab) {    
      refreshRecipes();
      fetchGlobalRecipe(); 
      updateIngredients();
    }
  }, [isSelectedTab])
    
  const previousIndexRef = useRef(null);
  const currentIndex = useNavigationState((state) => state.index);

  // if the screen has changed
  useEffect(() => {
    
    // if the page has changed to the current one, refetch the spotlight snapshot
    if (isSelectedTab && previousIndexRef !== null && previousIndexRef.current !== currentIndex && currentIndex === 3) {
      setTimeout(() => {
        fetchGlobalRecipe(); 
      }, 1000);
    }

    // updates the ref to the new index
    previousIndexRef.current = currentIndex;
  }, [currentIndex]);
  

  ///////////////////////////////// GETTING INGREDIENT DATA /////////////////////////////////

  // for the full ingredient data
  const [ingredientData, setIngredientData] = useState([]);

  // for type picker
  const [selectedIngredientType, setSelectedIngredientType] = useState("ALL TYPES"); 
  const [ingredientTypeList, setIngredientTypeList] = useState([]);

  // for store picker
  const [selectedIngredientStore, setSelectedIngredientStore] = useState("");

  // for filtering
  const [filteredIngredientData, setFilteredIngredientData] = useState([]);

  // for ingredient dropdown
  const [ingredientDropdownOpen, setIngredientDropdownOpen] = useState(false);

  // closes other dropdowns when ingredient search dropdown is open
  useEffect(() => {

    // only does so on opening, not closing
    if (ingredientDropdownOpen) {
      setTagDropdownOpen(false); // tag dropdown
      setRecipeDropdownOpen(false);         // recipe dropdown
    }
  }, [ingredientDropdownOpen]);

  
  // updates the current list of ingredients and ingredient types
  const updateIngredients = async () => {
    
    // fetches and stores the full data
    const data = await allIngredientFetch();
    setIngredientData(data);
    
    // sorts the list of types from that data alphabetically
    const ingredientTypeList = [
      { label: "ALL TYPES", value: "ALL TYPES" },
      ...[...new Set(
        data
          .flatMap(item => item.ingredientType)
          .filter(type => type !== undefined && type !== null)
      )]
        .sort((a, b) => a.localeCompare(b))
        .map(type => ({
          label: type === "" ? "no type" : type, 
          value: type,
        })),
    ];

    // sets the list of types
    setIngredientTypeList(ingredientTypeList);

    // filters the ingredient data based on the selected type
    setFilteredIngredientData(data);
  }

  // filters the ingredients based on the "search for ingredient" text input
  const filterIngredientData = (ingredientQuery) => {

    // filters for ingredient search
    let filtered = ingredientData.filter(ingredient => {
      const queryWords = ingredientQuery
        .toLowerCase()
        .split(' ')
        .filter(word => word.trim() !== ''); // splits into words and remove empty strings
    
      return queryWords.every(word => ingredient.ingredientName.toLowerCase().includes(word));
    });

    // filters for type
    if (selectedIngredientType !== "ALL TYPES") {
      filtered = filtered.filter(ingredient => 
        Array.isArray(ingredient.ingredientType) && ingredient.ingredientType.includes(selectedIngredientType)
      );
    }

    // filers for store
    if (selectedIngredientStore !== "") {
      filtered = filtered.filter(ingredient => 
        ingredient[`${selectedIngredientStore}Brand`] !== ""
      );
    }

    // sets the data and shows the dropdown list of ingredients if there are ingredients to show
    if (filtered.length !== 0) {
      setSearchIngredientQuery(ingredientQuery);
      setIngredientDropdownOpen(true);
      setFilteredIngredientData(filtered);
    } else {
      setFilteredIngredientData(filteredIngredientData);
    }
  
    // clears selected ingredient if it doesn't match filtering
    if (filtered.filter((ingredient) => ingredient.ingredientName.toLowerCase() === ingredientQuery.toLowerCase()).length === 0) {
      setSelectedIngredientName("");
      setSelectedIngredientId("");
    }
  };
  
  // refilters when the type or store changes
  useEffect(() => {
    setSearchIngredientQuery("");
    setIngredientDropdownOpen(false);
    filterIngredientData(searchIngredientQuery);
  }, [selectedIngredientType, selectedIngredientStore]);

  // decides the next store
  const changeSelectedStore = () => {
    const stores = ["", "a", "mb", "sm", "ss", "t", "w"];
    setSelectedIngredientStore(stores[(stores.indexOf(selectedIngredientStore) + 1) % 7]); 
  }
  

  ///////////////////////////////// INGREDIENT SEARCH LOGIC /////////////////////////////////

  // for the ingredient index picker
  const [selectedIngredientIndex, setSelectedIngredientIndex] = useState(1);

  // for the ingredient search textinput
  const [searchIngredientQuery, setSearchIngredientQuery] = useState('');
  const [selectedIngredientName, setSelectedIngredientName] = useState("");
  const [selectedIngredientId, setSelectedIngredientId] = useState("");


  // for when an ingredient is selected from the dropdown that appears above the textinput
  const pickIngredient = (item) => {

    // stores the selection
    setSearchIngredientQuery(item.ingredientName);
    setSelectedIngredientName(item.ingredientName);
    setSelectedIngredientId(item.id);

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
    setSelectedIngredientName("");
    setSelectedIngredientId("");

    // closes the type dropdown
    setIngredientDropdownOpen(false);
  }


  // for when the check button is selected next to the ingredient textinput
  const submitIngredient = async () => {

    // if an ingredient has been selected from the search and a recipe is selected
    if (selectedIngredientName !== "" && selectedRecipeId) {

      // gets the data of the searched ingredient
      const docSnap = await getDoc(doc(db, 'ingredients', selectedIngredientId)); 
      const data = docSnap.exists() ? docSnap.data() : null;
      
      // checks the checkbox if the overall checkbox is true
      if (selectedRecipeData.recipeCheck) {
        selectedRecipeData.ingredientChecks[selectedIngredientIndex - 1] = true;
      }
      
      // sets the ingredient's data to be default
      selectedRecipeData.ingredientIds[selectedIngredientIndex - 1] = selectedIngredientId;
      selectedRecipeData.ingredientData[selectedIngredientIndex - 1] = data;

      // if a store is not being filtered, calculates the initial store based on the brands that are and are not empty
      if (selectedIngredientStore === "") {
        const stores = ["a", "mb", "sm", "ss", "t", "w"];
        const currStore = "a";
  
        for (let i = 0; i < 6; i++) {
          if (selectedRecipeData.ingredientData[selectedIngredientIndex - 1][`${stores[(stores.indexOf(currStore) + i) % 6]}${'Brand'}`] !== "") {
            selectedRecipeData.ingredientStores[selectedIngredientIndex - 1] = stores[(stores.indexOf(currStore) + i) % 6];
            i = 6;
          }
        }
      // otherwise, just use the selected store
      } else {
        selectedRecipeData.ingredientStores[selectedIngredientIndex - 1] = selectedIngredientStore;
      }
      
      // calculates the details and totals
      let calcData = calcAmounts(selectedRecipeData);

      // loops over the 12 ingredients backwards to find the first empty one
      for (let i = 11; i >= 0; i--) {
        if (!calcData.ingredientData[i]) {
          setSelectedIngredientIndex(i + 1);
        }
      }

      // stores the recipe data in the firebase
      await updateDoc(doc(db, 'recipes', selectedRecipeId), calcData);
  
      // updates the selected recipe
      setSelectedRecipeData({ ...calcData });

      // clears the search
      clearIngredientSearch();
    }
  }

  // for when the collapse (isCollapsing) or expand (!isCollapsing) buttons are selected next to the ingredient textinput
  const collapseIngredients = (isCollapsing) => {

    // if a recipe is selected
    if (selectedRecipeId) {

      // the current ingredient data 
      let checksArr = selectedRecipeData.ingredientChecks;
      let dataArr = selectedRecipeData.ingredientData;
      let idsArr = selectedRecipeData.ingredientIds;
      let amountsArr = selectedRecipeData.ingredientAmounts;
      let storesArr = selectedRecipeData.ingredientStores;
      let calsArr = selectedRecipeData.ingredientCals;
      let pricesArr = selectedRecipeData.ingredientPrices;
      let servingsArr = selectedRecipeData.ingredientServings;

      // to store the new ingredient data - default values at first
      let newChecksArr = [ false, false, false, false, false, false, false, false, false, false, false, false ];
      let newDataArr = [ null, null, null, null, null, null, null, null, null, null, null, null ];
      let newIdsArr = [ "", "", "", "", "", "", "", "", "", "", "", "" ];
      let newAmountsArr = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 
      let newStoresArr = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 
      let newCalsArr = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 
      let newPricesArr = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 
      let newServingsArr = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 


      // if the collapse button was pressed
      if (isCollapsing) {
        let index = 0;

        // loops over the ingredients and removes empty spaces between ingredients
        for (var i = 0; i < 12; i++) {
          if(dataArr[i] !== null) {
            newChecksArr[index] = checksArr[i];
            newDataArr[index] = dataArr[i];
            newIdsArr[index] = idsArr[i];
            newAmountsArr[index] = amountsArr[i];
            newStoresArr[index] = storesArr[i];
            newCalsArr[index] = calsArr[i];
            newPricesArr[index] = pricesArr[i];
            newServingsArr[index] = servingsArr[i];

            // increments the index
            index = index + 1;
          }
        }

      // if the expand button was pressed
      } else {
        
        for (var i = 0; i < 11; i++) {

          // the index of the new array is dependent on the selectedIngredientIndex
          // if i is currently less than the selected index, the ingredient stays put
          // otherwise, it is shifted to the next index (will chop off end values, be careful)
          let index = (i < (selectedIngredientIndex-1)) ? i : i+1;
          
          if(dataArr[i] !== null) {
            newChecksArr[index] = checksArr[i];
            newDataArr[index] = dataArr[i];
            newIdsArr[index] = idsArr[i];
            newAmountsArr[index] = amountsArr[i];
            newStoresArr[index] = storesArr[i];
            newCalsArr[index] = calsArr[i];
            newPricesArr[index] = pricesArr[i];
            newServingsArr[index] = servingsArr[i];
          } 
        }
      }

      // stores the newly shifted data
      selectedRecipeData.ingredientChecks = newChecksArr;
      selectedRecipeData.ingredientData = newDataArr;
      selectedRecipeData.ingredientIds = newIdsArr;
      selectedRecipeData.ingredientAmounts = newAmountsArr;
      selectedRecipeData.ingredientStores = newStoresArr;
      selectedRecipeData.ingredientCals = newCalsArr;
      selectedRecipeData.ingredientPrices = newPricesArr;
      selectedRecipeData.ingredientServings = newServingsArr;

      // calculates the details and totals
      let calcData = calcAmounts(selectedRecipeData);

      // loops over the 12 ingredients backwards to find the first empty one
      for (let i = 11; i >= 0; i--) {
        if (!calcData.ingredientData[i]) {
          setSelectedIngredientIndex(i + 1);
        }
      }

      // stores the recipe data in the firebase
      updateDoc(doc(db, 'recipes', selectedRecipeId), calcData);
  
      // updates the selected recipe
      setSelectedRecipeData(calcData);

      // clears the current storage of the amounts so the placeholders aren't janky
      setCurrIngredientAmounts(["", "", "", "", "", "", "", "", "", "", "", ""]);

      // reload settings
      refreshRecipes();
    }
  }

  // for when the trash button is selected next to the ingredient textinput
  const deleteIngredient = () => {

    // clears the ingredient search textinput
    clearIngredientSearch();

    // resets the ingredient data at the selected index to be null
    selectedRecipeData.ingredientChecks[selectedIngredientIndex - 1] = false;
    selectedRecipeData.ingredientData[selectedIngredientIndex - 1] = null;
    selectedRecipeData.ingredientIds[selectedIngredientIndex - 1] = "";
    selectedRecipeData.ingredientAmounts[selectedIngredientIndex - 1] = "";
    selectedRecipeData.ingredientStores[selectedIngredientIndex - 1] = "";
    selectedRecipeData.ingredientCals[selectedIngredientIndex - 1] = "";
    selectedRecipeData.ingredientPrices[selectedIngredientIndex - 1] = "";
    selectedRecipeData.ingredientServings[selectedIngredientIndex - 1] = "";

    // clears the current storage of the amounts so the placeholders aren't janky
    setCurrIngredientAmounts(["", "", "", "", "", "", "", "", "", "", "", ""]);

    // calculates the details and totals
    let calcData = calcAmounts(selectedRecipeData);

    // loops over the 12 ingredients backwards to find the first empty one
    for (let i = 11; i >= 0; i--) {
      if (!calcData.ingredientData[i]) {
        setSelectedIngredientIndex(i + 1);
      }
    }

    // stores the recipe data in the firebase
    updateDoc(doc(db, 'recipes', selectedRecipeId), calcData);

    // updates the selected recipe
    setSelectedRecipeData(calcData);

    // reload settings
    refreshRecipes();
  }
  

  ///////////////////////////////// INGREDIENT AMOUNT LOGIC /////////////////////////////////

  // for the placeholders of the amount textinputs
  const [currIngredientAmounts, setCurrIngredientAmounts] = useState(["", "", "", "", "", "", "", "", "", "", "", ""]);

  // to store the entered amount in the current ingredient's data if it is valid
  const setAmount = (value, index) => {
  
    // if the recipe data and required fields and valid
    if (selectedRecipeData && selectedRecipeData.ingredientData && selectedRecipeData.ingredientStores) {
  
      // general variables
      const ingredient = selectedRecipeData.ingredientData[index];
      const brandKey = `${selectedRecipeData.ingredientStores[index]}Brand`;
      const unitKey = `${selectedRecipeData.ingredientStores[index]}Unit`;
    
      // checks if the brand is valid, meaning the ingredient has data
      if (ingredient && ingredient[brandKey] && ingredient[brandKey] !== "" && ingredient[unitKey] && ingredient[unitKey] !== "") {
    
        // updates the current ingredient amounts
        setCurrIngredientAmounts((prev) => {
          const updated = [...prev];
          updated[index] = value;
          return updated;
        });
        
        // stores the ingredient amount and calculates the details and totals
        selectedRecipeData.ingredientAmounts[index] = value;
        let calcData = calcAmounts(selectedRecipeData);
        
        // stores the recipe data in the firebase
        updateDoc(doc(db, 'recipes', selectedRecipeId), calcData);
        
        // updates the selected recipe's data
        setSelectedRecipeData(calcData);
      }
    }
  }
  
  // to calculate each of the ingredient's details, and the totals at the bottom
  const calcAmounts = (data) => {

    // running totals
    let totalCal = 0;
    let totalPrice = 0;
    let totalServing = 0;
    
    // loops over the list of all ingredients
    data.ingredientAmounts.forEach((value, index) => {
      
      // if the ingredient data exists
      if (data.ingredientData[index]) {

        // general variables
        const ingredient = data.ingredientData[index];
        const storeKey = data.ingredientStores[index];
        const brandKey = ingredient[`${storeKey}Brand`];

        // fractional calculations
        const amount = new Fractional(value);
        const totalYield = new Fractional(ingredient[`${storeKey}TotalYield`]);
        const calContainer = new Fractional(ingredient[`${storeKey}CalContainer`]);
        const priceContainer = new Fractional(ingredient[`${storeKey}PriceContainer`]);
        
        // invalid (1)
        if (value === "" || brandKey === "") {
          data.ingredientAmounts[index] = "";
          data.ingredientCals[index] = 0;
          data.ingredientPrices[index] = 0.00;
          data.ingredientServings[index] = 0.00;
        
        // invalid (2)
        } else if (value === "0") {
          data.ingredientAmounts[index] = "0";
          data.ingredientCals[index] = 0;
          data.ingredientPrices[index] = 0.00;
          data.ingredientServings[index] = 0.00;
          
        // validates the fractional value
        } else if (amount !== 0 && !isNaN(amount.numerator) && !isNaN(amount.denominator) && amount.denominator !== 0) {

          data.ingredientAmounts[index] = value;
          
          // calculate calories if the arguments are valid
          if (Object.entries(totalYield).length !== 0 && Object.entries(calContainer).length !== 0
              && !isNaN((new Fraction(totalYield.toString())) * 1) && !isNaN((new Fraction(calContainer.toString())) * 1)) {

            // individual
            data.ingredientCals[index] = new Fraction(amount.divide(totalYield).multiply(calContainer).toString()) * 1;
          
            // overall if the current checkbox is checked
            if (data.ingredientChecks[index]) {
              totalCal = (new Fractional(totalCal)).add(amount.divide(totalYield).multiply(calContainer)).toString();
            }

          // set individual calories to 0 if arguments are not valid
          } else {
            data.ingredientCals[index] = new Fraction(0) * 1;
          }

          // calculates prices if the arguments are valid
          if (Object.entries(totalYield).length !== 0 && Object.entries(priceContainer).length !== 0
              && !isNaN((new Fraction(totalYield.toString())) * 1) && !isNaN((new Fraction(priceContainer.toString())) * 1)) {
          
            // individual
            data.ingredientPrices[index] = new Fraction(amount.divide(totalYield).multiply(priceContainer).toString()) * 1;

            // overall if the current checkbox is checked
            if (data.ingredientChecks[index]) {
              totalPrice = (new Fractional(totalPrice)).add(amount.divide(totalYield).multiply(priceContainer)).toString();
            }

          // set individual prices to 0 if arguments are not valid
          } else {
            data.ingredientPrices[index] = new Fraction(0) * 1;
          }

          // calculate servings if the arguments are valid
          if (Object.entries(totalYield).length !== 0 && !isNaN((new Fraction(totalYield.toString())) * 1)) {
         
            // individual
            data.ingredientServings[index] =  new Fraction(totalYield.divide(amount).toString()) * 1;

            // overall if the current checkbox is checked
            if (data.ingredientChecks[index]) {
              totalServing = (index === 0 || totalServing > new Fraction(totalYield.divide(amount).toString()) * 1) ? new Fraction(totalYield.divide(amount).toString()) * 1 : totalServing;
            }

          // set individual servings to 0 if arguments are not valid
          } else {
            data.ingredientServings[index] = new Fraction(0) * 1;
          }
        }
      }

      // stores the current amount in the state
      setCurrIngredientAmounts((prev) => {
        const updated = [...prev]; 
        updated[index] = data.ingredientAmounts[index];
        return updated;
      });
    });
    
    // stores the totals
    data.recipeCal = ((new Fraction(totalCal.toString())) * 1).toFixed(0);
    data.recipePrice = ((new Fraction(totalPrice.toString())) * 1).toFixed(2);
    data.recipeServing = ((new Fraction(totalServing.toString())) * 1).toFixed(2);

    return data;
  }


  ///////////////////////////////// INGREDIENT STORE LOGIC /////////////////////////////////

  // to transition to the next store
  const changeStore = (index) => {
    
    // the list of stores
    const stores = ["a", "mb", "sm", "ss", "t", "w"];

    // the current store
    const currStore = selectedRecipeData.ingredientStores[index];

    // the next store
    let nextStore = currStore;

    // calculates the next store based on the brands that are and are not empty
    for (let i = 1; i <= 6; i++) {
      if (selectedRecipeData.ingredientData[index][`${stores[(stores.indexOf(currStore) + i) % 6]}${'Brand'}`] !== "") {
        nextStore = stores[(stores.indexOf(currStore) + i) % 6];
        i = 7;
      }
    }

    // stores the new data 
    selectedRecipeData.ingredientStores[index] = nextStore;

    // recalculates the details and totals
    let calcData = calcAmounts(selectedRecipeData);

    // stores the recipe data in the firebase
    updateDoc(doc(db, 'recipes', selectedRecipeId), calcData);

    // updates the selected recipe
    setSelectedRecipeData(calcData);

    // reload settings
    refreshRecipes();
  }


  ///////////////////////////////// GETTING RECIPE DATA /////////////////////////////////

  // for the overall recipe list
  const [recipeList, setRecipeList] = useState([]);

  // for recipe dropdown
  const [selectedRecipeId, setSelectedRecipeId] = useState(null); 
  const [selectedRecipeData, setSelectedRecipeData] = useState(null); 
  const [recipeDropdownOpen, setRecipeDropdownOpen] = useState(false);

  // closes other dropdowns when recipe dropdown is open
  useEffect(() => {

    // only does so on opening, not closing
    if (recipeDropdownOpen) {
      setTagDropdownOpen(false);        // tag dropdown
      setIngredientDropdownOpen(false); // ingredient search dropdown
    }
  }, [recipeDropdownOpen]);

  // gets the recipe document data from the globals collection
  const fetchGlobalRecipe = async () => {
    
    try {

      // gets the global recipe id
      const globalDoc = (await getDoc(doc(db, 'globals', 'recipe')));
      if (globalDoc.exists()) {

        let recipeId = globalDoc.data().id;
        if (recipeId) {

          // gets the recipe data
          const recipeDoc = (await getDoc(doc(db, 'recipes', recipeId)));
          if (recipeDoc.exists()) {
            const recipeData = recipeDoc.data();

            // loops over the 12 ingredients backwards to find the first empty one
            for (let i = 11; i >= 0; i--) {
              if (!recipeData.ingredientData[i]) {
                setSelectedIngredientIndex(i + 1);
              }
            }
            
            setSelectedRecipeId(recipeId);     // stores the recipe id
            setSelectedRecipeData(recipeData); // updates the selected recipe's data

            // stores the ingredient amounts
            if (recipeData && recipeData.ingredientAmounts) {
              setCurrIngredientAmounts(recipeData.ingredientAmounts);
            } else {
              setCurrIngredientAmounts(["", "", "", "", "", "", "", "", "", "", "", ""]);
            }
          }

        // otherwise, store default values
        } else {
          setSelectedRecipeId(null);
          setSelectedRecipeData(null);
          setSelectedIngredientIndex(1);
          setCurrIngredientAmounts(["", "", "", "", "", "", "", "", "", "", "", ""]);
        }

        // reload settings
        reloadRecipe(recipeId);
      }

    } catch (error) {
      console.error('Error fetching recipe document:', error);
    }
  };

  // helper function to reload the selected recipe's data
  const reloadRecipe = async (selectedRecipeId) => {

    // if a recipe is selected
    if (selectedRecipeId) {

      // stores the recipe data in the firebase
      updateDoc(doc(db, 'globals', 'recipe'), { id: selectedRecipeId });

      // gets the data
      const docRef = doc(db, 'recipes', selectedRecipeId);        // creates a reference to the document
      const docSnap = await getDoc(docRef);                       // fetches the document

      // sets the recipe based on the given id and data
      if (docSnap.exists()) {
        data = docSnap.data();

        // if there are amounts of ingredients, update them
        if (data.ingredientAmounts) {
          let calcData = calcAmounts(data);

          // loops over the 12 ingredients backwards to find the first empty one
          for (let i = 11; i >= 0; i--) {
            if (!calcData.ingredientData[i]) {
              setSelectedIngredientIndex(i + 1);
            }
          }

          // updates the collection data
          await updateDoc(doc(db, 'recipes', selectedRecipeId), calcData);
      
          // updates the selected data
          setSelectedRecipeData({ ...calcData });
        }
      }
    
    // if a recipe is not selected, set default data
    } else {
      setSelectedIngredientIndex(1);
      setSelectedRecipeData(null);
    }
  }
  
  // fetches the data of the selected recipe when the selected recipe changes
  useEffect(() => {
    if (isSelectedTab) {
      reloadRecipe(selectedRecipeId);
    }
  }, [selectedRecipeId]);

  
  // helper function to refresh the list of recipes
  const refreshRecipes = async () => {
    
    // gets the collection of recipes
    const querySnapshot = await getDocs(collection(db, 'recipes'));

    // reformats each one
    const recipesArray = querySnapshot.docs.map((doc) => {
      const formattedRecipe = {
        id: doc.id,
        ... doc.data(),
      };
      return formattedRecipe;
    })
    .sort((a, b) => a.recipeName.localeCompare(b.recipeName)); // sort by recipeName alphabetically

    setRecipeList(recipesArray);

    fetchUniqueRecipeTags(querySnapshot);
  };


  ///////////////////////////////// RECIPE FILTERING /////////////////////////////////

  // for type dropdown
  const [selectedRecipeTag, setSelectedRecipeTag] = useState("ALL TAGS"); 

  // for keyword input
  const [recipeKeywordQuery, setRecipeKeywordQuery] = useState("");
  const [ingredientKeywordQuery, setIngredientKeywordQuery] = useState("");

  // for filtering
  const [filteredRecipeList, setFilteredRecipeList] = useState([]);

  // to filter the recipe list based on the top section
  const filterRecipeList = async (recipeQuery, ingredientQuery) => {
    
    // maps over the current (full) list of recipes
    let filtered = recipeList.filter(recipe =>
  
      // tags - if ALL TAGS show all, if NO TAGS show only the recipes with no tags
      (selectedRecipeTag === "ALL TAGS" || 
        (selectedRecipeTag === "NO TAGS" && recipe.recipeTags.length === 0) || 
        recipe.recipeTags.some(tag => tag === selectedRecipeTag)) &&
      
      // recipe keywords
      (recipeQuery?.length > 0 
        ? recipeQuery
            .split(' ') // Split the string into an array of keywords
            .every(keyword => 
              recipe.recipeName.toLowerCase().includes(keyword.toLowerCase())
            ) 
        : true) &&

      // ingredient keywords
      (ingredientQuery?.length > 0 
        ? ingredientQuery
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
    if (filtered.length !== 0) {
      setRecipeKeywordQuery(recipeQuery);
      setIngredientKeywordQuery(ingredientQuery);
      setFilteredRecipeList(filtered);
    } else {
      setFilteredRecipeList(filteredRecipeList);
    }
    
    // clears the recipe card if there are no matching recipes
    if (selectedRecipeData && !filtered.some(recipe => recipe.recipeName === selectedRecipeData.recipeName)) {
      setSelectedRecipeId(null);
      setSelectedRecipeData(null);
      setTagDropdownOpen(false);

      // stores the recipe data in the firebase
      await updateDoc(doc(db, 'globals', 'recipe'), { id: null });
    } 
  }

  // for when a tag is changed
  useEffect(() => {
    filterRecipeList(recipeKeywordQuery, ingredientKeywordQuery);
    setRecipeDropdownOpen(true);
  }, [selectedRecipeTag]);

  // for when the data changes
  useEffect(() => {
    filterRecipeList(recipeKeywordQuery, ingredientKeywordQuery);
    setRecipeDropdownOpen(false);
  }, [recipeList]);


  ///////////////////////////////// NEW RECIPE /////////////////////////////////

  const [newModalVisible, setNewModalVisible] = useState(false);

  // when closing the new recipe modal
  const closeNewModal = (type) => { 
    setNewModalVisible(false);

    // resets filtering
    setRecipeKeywordQuery("");
    setIngredientKeywordQuery("");
    setSelectedRecipeTag("ALL TAGS");

    // resets ingredients
    setCurrIngredientAmounts(["", "", "", "", "", "", "", "", "", "", "", ""]);
    setSelectedIngredientType("ALL TYPES");
    setIngredientDropdownOpen(false);

    // reload settings
    refreshRecipes();
  };


  ///////////////////////////////// EDIT RECIPE /////////////////////////////////

  const [editModalVisible, setEditModalVisible] = useState(false);

  // if the edit recipe modal is opened/closed
  useEffect(() => {

    // if it is opened but the selected id is not valid, close it
    if (editModalVisible) {
      if (!selectedRecipeId) {
        setEditModalVisible(false);
      }
    }
  }, [editModalVisible]);

  // when closing the add modal to edit
  const closeEditModal = (type) => {
    setEditModalVisible(false);
    
    // if deleting the recipe
    if (type === "delete") {

      // resets filtering
      setRecipeKeywordQuery("");
      setIngredientKeywordQuery("");
      setSelectedRecipeTag("ALL TAGS");
  
      // resets ingredients
      setCurrIngredientAmounts(["", "", "", "", "", "", "", "", "", "", "", ""]);
      setSelectedIngredientType("ALL TYPES");
      setIngredientDropdownOpen(false);
      setSelectedIngredientIndex(1);
    }

    // reload settings
    refreshRecipes();
  };


  ///////////////////////////////// RECIPE TAG LOGIC /////////////////////////////////

  const [recipeTagList, setRecipeTagList] = useState([]);                     // for the list of tags
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);              // for the tag dropdown
  const [newTagModalVisible, setNewTagModalVisible] = useState(false);        // for the new tag modal
  
  const [editTagModalVisible, setEditTagModalVisible] = useState(false);      // for the edit tag modal
  const [selectedEditTag, setSelectedEditTag] = useState("");

  // gets the unique list of tags based on the recipes in the system
  const fetchUniqueRecipeTags = async (querySnapshot) => {
    try {
  
      // to store the collected recipe tags
      let allRecipeTags = ["NEW TAG"];
      
      // loops through the recipes and adds all found tags
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (Array.isArray(data.recipeTags)) {
          allRecipeTags.push(...data.recipeTags);
        }
      });
  
      // removes duplicates and sort alphabetically, excluding "NEW TAG"
      const uniqueTags = [...new Set(allRecipeTags)];
      const sortedTags = uniqueTags
        .filter(tag => tag !== "NEW TAG") // Exclude "NEW TAG" from sorting
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })); // Case-insensitive sort
  
      // adds the "NEW TAG" at the start
      sortedTags.unshift("NEW TAG");

      // maps the sorted tags to an array of objects with label and value properties
      const tagsWithLabelsAndValues = sortedTags.map(tag => ({
        label: tag,
        value: tag,
      }));
      
      // sets the list of recipe tags
      setRecipeTagList(tagsWithLabelsAndValues);
      
    } catch (error) {
      console.error('Error fetching recipe tags:', error);
    }
  };

  // uses the previous function to update the tag list every time the tag dropdown is toggled
  useEffect(() => {

    // closes all other dropdowns if open
    if (tagDropdownOpen) {
      setIngredientDropdownOpen(false); // ingredient search dropdown
      setRecipeDropdownOpen(false);                // recipe dropdown
    }
  }, [tagDropdownOpen]);

  // when the user clicks a tag in the dropdown
  const toggleTag = (tag) => {

    // if a recipe is currently selected
    if (selectedRecipeId) {

      // if the tag is a new tag, open the modal to create one
      if (tag === "NEW TAG") {
        setNewTagModalVisible(true);

      // if the recipe already has the tag, remove it
      } else if (selectedRecipeData.recipeTags.includes(tag)) {
        const updatedTags = selectedRecipeData.recipeTags.filter(item => item !== tag);
        selectedRecipeData.recipeTags = updatedTags;
      
      // if the recipe does not already have the tag, add it
      } else {
        selectedRecipeData.recipeTags.push(tag);
      }
    }

    // removes duplicates and sorts alphabetically
    const uniqueTags = [...new Set(selectedRecipeData.recipeTags)]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    // stores the unique tags
    selectedRecipeData.recipeTags = uniqueTags;

    // stores the recipe data in the firebase
    updateDoc(doc(db, 'recipes', selectedRecipeId), selectedRecipeData);

    // updates the selected recipe
    setSelectedRecipeData(selectedRecipeData);
    
    // reload settings
    refreshRecipes();
  }


  // when the new tag modal is closed, use the new tag title that was provided
  const closeNewTagModal = async (newTag) => {

    // closes the modal and dropdown
    setTagDropdownOpen(false);
    setNewTagModalVisible(false);
    
    // if the new tag name is valid (it should be, this is an extra check)
    if (newTag !== "") {

      // adds the new tag to the list of current tags
      selectedRecipeData.recipeTags.push(newTag);

      // removes duplicates and sorts alphabetically
      const uniqueTags = [...new Set(selectedRecipeData.recipeTags)]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

      // stores the unique tags
      selectedRecipeData.recipeTags = uniqueTags;

      // stores the recipe data in the firebase
      updateDoc(doc(db, 'recipes', selectedRecipeId), selectedRecipeData);
  
      // updates the selected recipe
      setSelectedRecipeData(selectedRecipeData);
      
      // reload settings
      refreshRecipes();
    } 
  }

  // when the edit tag modal is closed, use the edited tag title that was provided
  const closeEditTagModal = async (editedData) => {
    
    if (editedData !== null) {
      
      // closes the modal and dropdown
      setTagDropdownOpen(false);
      setEditTagModalVisible(false);

      if (editedData !== "") {

        // updates the selected recipe
        setSelectedRecipeData(editedData);
        
        // reload settings
        refreshRecipes();
      }
    }
  }


  ///////////////////////////////// CHECKBOX LOGIC /////////////////////////////////

  // toggling the checkbox that controls all ingredients
  const toggleAllIngredients = async () => {
    
    // if a recipe is selected
    if (selectedRecipeData) {

      // actually toggles the checkbox by setting its value to be opposite
      selectedRecipeData.recipeCheck = !selectedRecipeData.recipeCheck;

      // if the overall checkbox is now true, set all individual checkboxes to be true
      if (selectedRecipeData.recipeCheck) {
        for (var i = 0; i < 12; i++) {
          if (selectedRecipeData.ingredientData[i]) {
            selectedRecipeData.ingredientChecks[i] = selectedRecipeData.recipeCheck;
          }
        }
      }

      // calculates the details and totals
      let calcData = calcAmounts(selectedRecipeData);

      // stores the recipe data in the firebase
      updateDoc(doc(db, 'recipes', selectedRecipeId), calcData);
  
      // updates the selected recipe
      setSelectedRecipeData(calcData);

      // reload settings
      refreshRecipes();
    }
  }

  // toggling an individual checkbox
  const toggleIngredient = async (index) => {
    
    // if a recipe is selected and the checkbox is for a valid ingredient
    if (selectedRecipeData && selectedRecipeData.ingredientData[index]) {

      // actually toggles the checkbox by setting its value to be opposite
      selectedRecipeData.ingredientChecks[index] = !selectedRecipeData.ingredientChecks[index];

      // loops over all ingredients and checks if their checkboxes are all selected
      let allChecked = true;
      for (var i = 0; i < 12; i++) {
        if (!selectedRecipeData.ingredientChecks[i] && selectedRecipeData.ingredientData[i]) {
          allChecked = false;
        }
      }

      // if they are, set the overall checkbox to true; if not, to false
      selectedRecipeData.recipeCheck = allChecked;

      // calculates the details and totals
      let calcData = calcAmounts(selectedRecipeData);

      // stores the recipe data in the firebase
      updateDoc(doc(db, 'recipes', selectedRecipeId), calcData);
  
      // updates the selected recipe
      setSelectedRecipeData(calcData);

      // reload settings
      refreshRecipes();
    }
  }
  

  ///////////////////////////////// CALCULATE DATA DETAILS MODAL /////////////////////////////////

  const [calcModalVisible, setCalcModalVisible] = useState(false);
  const [calcIndex, setCalcIndex] = useState(-1);
  
  // when an ingredient's details are clicked to view the modal
  const showCalcModal = (index) => {
    if (selectedRecipeData?.ingredientData[index] !== null) {
      setCalcIndex(index);
      setCalcModalVisible(true);
    }
  }

  // when the arrow inside the modal is clicked to save the amount
  const submitCalcModal = async (amount) => {
    setAmount(amount, calcIndex);
    setCalcIndex(-1);
    setCalcModalVisible(false);
  }
  
  
  ///////////////////////////////// VIEWING INGREDIENT /////////////////////////////////

  const [ingredientModalVisible, setIngredientModalVisible] = useState(false);
  const [selectedIngredientData, setSelectedIngredientData] = useState("");
  
  // when the selected ingredient id chanegs get its data
  useEffect(() => {
    if (selectedIngredientId !== null && selectedIngredientId !== "") {
      fetchIngredientData(selectedIngredientId);
    }
  }, [selectedIngredientId]);

  // to get the ingredient data from the db
  const fetchIngredientData = async (id) => {
    const docSnap = await getDoc(doc(db, 'ingredients', id));
    if (docSnap.exists()) { setSelectedIngredientData(docSnap.data()); }
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

    // CONTAINER
    <View className="flex-1 items-center justify-center bg-zinc200 border-0.5">

      {/* RECIPE FILTERING SECTION */}
      <View className="flex flex-row w-full justify-center items-center mb-[20px]">
        
        {/* KEYWORD INPUT */}
        <View className="flex flex-col w-2/3 space-y-[5px]">
          
          {/* Recipe */}
          <View className={`bg-zinc200 h-[30px] ${keyboardType !== "ingredient search" && "z-10"}`}>

            {/* text input */}
            <TextInput
              value={recipeKeywordQuery}
              onChangeText={(value) => filterRecipeList(value, ingredientKeywordQuery)}
              placeholder="recipe keyword(s)"
              placeholderTextColor={colors.zinc400}
              className="flex-1 bg-white radius-[5px] border-[1px] border-zinc300 pl-2.5 pr-10 text-[14px] leading-[16px]"
            />

            {/* clear button */}
            <View className="absolute right-0 h-[30px] justify-center">
              <Icon
                name="close-outline"
                size={20}
                color="black"
                onPress={() => {
                  setRecipeKeywordQuery("");
                  filterRecipeList("", ingredientKeywordQuery);
                }}
              />
            </View>
          </View>

          {/* Ingredient */}
          <View className="bg-zinc200 h-[30px]">

            {/* text input */}
            <TextInput
              value={ingredientKeywordQuery}
              onChangeText={(value) => filterRecipeList(recipeKeywordQuery, value)}
              placeholder="ingredient keyword(s)"
              placeholderTextColor={colors.zinc400}
              className="flex-1 bg-white radius-[5px] border-[1px] border-zinc300 pl-2.5 pr-10 text-[14px] leading-[16px]"
            />
            {/* clear button */}
            <View className="absolute right-0 h-[30px] justify-center">
              <Icon
                name="close-outline"
                size={20}
                color="black"
                onPress={() => {
                  setIngredientKeywordQuery([]);
                  filterRecipeList(recipeKeywordQuery, []);
                }}
              />
            </View>
          </View>
        </View>

        {/* RIGHT BOXES */}
        <View className="flex flex-col w-[27%]">

          {/* Tag Picker */}
          <View className="flex z-0 bg-theme200 border-0.5 border-theme400 ml-[10px]">
            <Picker
              selectedValue={selectedRecipeTag}
              onValueChange={(itemValue) => setSelectedRecipeTag(itemValue)}
              style={{ height: 30, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -25, }}
              itemStyle={{ color:'black', fontWeight: 'bold', textAlign: 'center', fontSize: 12, }}
            >
              {recipeTagList.length > 1 ? (
                [
                  { value: "ALL TAGS", label: "ALL TAGS" },
                  { value: "NO TAGS", label: "NO TAGS" },
                  ...recipeTagList.slice(1) // removes the first tag
                ].map((item) => (
                  <Picker.Item
                    key={item.value}
                    label={item.label}
                    value={item.value}
                  />
                ))
              ) : (
                [
                  { value: "ALL TAGS", label: "ALL TAGS" },
                  { value: "NO TAGS", label: "NO TAGS" }
                ].map((item) => (
                  <Picker.Item
                    key={item.value}
                    label={item.label}
                    value={item.value}
                  />
                ))
              )}
            </Picker>
          </View>

          {/* numbers of recipes that match the filtering */}
          <View className="flex justify-center items-center z-0 ml-[10px] h-[30px] bg-zinc700 border-0.5 border-zinc900">
            <Text className="text-white font-bold text-[12px]">
              {filteredRecipeList.length} {filteredRecipeList.length === 1 ? "RECIPE" : "RECIPES"}
            </Text>
          </View>
        </View>
      </View>


      {/* RECIPE CARD SECTION */}
      <View className={`w-11/12 ${selectedRecipeId ? "mr-[20px]" : ""} bg-zinc100 border-[1px] border-black ${isKeyboardOpen && keyboardType === "ingredient search" ? "z-0" : ""}`}>

        {/* TITLE ROW */}
        <View className="flex-row bg-theme800 border-b-[1px]">
    
          {/* Buttons */}
          <View className="flex-col items-center justify-center h-[50px] w-[27.5px] z-30">
              {/* Add a new recipe */}
              <Icon
                  size={15}
                  color="white"
                  name="add-outline"
                  onPress={() => {
                    setNewModalVisible(true);
                    setTagDropdownOpen(false);
                  }}
              />
              {/* Edit/Delete the current recipe */}
              {selectedRecipeData !== null &&
              <Icon
                  size={15}
                  color="white"
                  name="ellipsis-horizontal-outline"
                  onPress={() => {
                    setEditModalVisible(true);
                    setTagDropdownOpen(false);
                  }}
              />
              }
          </View>

          {/* Recipe Dropdown */}
          <View className="flex ml-[-27.5px] pl-[27.5px] items-center justify-center w-full">
            <DropDownPicker 
              open={recipeDropdownOpen}
              setOpen={setRecipeDropdownOpen}
              value={selectedRecipeId}
              setValue={setSelectedRecipeId}
              items={filteredRecipeList.map((recipe) => ({
                label: recipe.recipeName,
                value: recipe.id,
                key: recipe.id,
                labelStyle: { color: 'black' }
              }))}
              className="text-white font-bold text-[18px]"
              placeholder={selectedRecipeData ? selectedRecipeData.recipeName : ""} // loads in the previously stored recipe
              style={{ height: 50, backgroundColor: colors.theme800, borderWidth: 0, justifyContent: 'center', }}
              dropDownContainerStyle={{ backgroundColor: 'white', }}
              textStyle={{ color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 12, }}
              listItemContainerStyle={{ borderBottomWidth: 0.5, borderBottomColor: colors.theme100, }}
              ArrowDownIconComponent={() => {
                return (
                  <Icon
                    size={18}
                    color={ colors.theme100 }
                    name="chevron-down"
                  />
                );
              }}
              ArrowUpIconComponent={() => {
                return (
                  <Icon
                    size={18}
                    color={ colors.theme100 }
                    name="chevron-up"
                  />
                );
              }}
            />
          </View>
        </View>

        {/* HEADER ROW */}
        <View className="flex flex-row h-[30px] bg-theme900 border-b-[1px] z-20">
          {selectedRecipeData !== null &&
          <>
            
            {/* overall checkbox */}
            <View className="flex items-center justify-center w-[27.5px]">
              <Icon
                name={(selectedRecipeData && selectedRecipeData.recipeCheck) ? "checkbox" : "square-outline"}
                color="white"
                size={18}
                onPress={() => toggleAllIngredients()}
              />
            </View>

            {/* ingredient header */}
            <View className="flex items-center justify-center w-[145px] border-r-0.5">
              <Text className="text-white text-xs font-bold">
                INGREDIENT
              </Text>
            </View>

            {/* amount header */}
            <View className="flex items-center justify-center w-[117.5px] border-r-0.5">
              <Text className="text-white text-xs font-bold">
                AMOUNT
              </Text>
            </View>

            {/* details */}
            <View className="flex items-center justify-center absolute w-full h-full pl-[290px]">
              <Text className="text-white text-xs font-bold">
                DETAILS
              </Text>
            </View>
            
          </>
          }
        </View>


        {/* 12 INGREDIENTS GRID */}
        <ScrollView 
          className="flex flex-col z-10 bg-zinc700 max-h-[360px]"
          scrollEnabled={keyboardType === "" && isKeyboardOpen}
          onScroll={syncScroll}
        >

          {/* Frozen Columns */}
          {Array.from({ length: 12 }, (_, index) => (
            <View key={`frozen-${index}`} className="flex flex-row h-[30px]">
                
              {/* checkboxes */}
              <View className="flex items-center justify-center bg-theme500 w-[27.5px] border-b-0.5 border-b-theme900 z-10">
                {selectedRecipeData !== null && 
                <Icon
                  name={(selectedRecipeData && selectedRecipeData.ingredientChecks[index]) ? "checkbox" : "square-outline"}
                  color={selectedRecipeData.ingredientData[index] === null ? colors.zinc350 : "white"}
                  size={18}
                  onPress={() => toggleIngredient(index)}
                />
                }
              </View>
                
              {/* ingredient names */}
              <View className="flex pl-1 items-start justify-center w-[145px] bg-theme600 border-b-0.5 border-r-0.5 border-theme900 pr-[5px] z-20">
                <View className="flex flex-wrap flex-row">
                  <Text 
                    className={`text-white text-[10px] ${selectedRecipeData?.ingredientData?.[index]?.[selectedRecipeData.ingredientStores[index] + "Link"] ? 'underline' : 'none'}`}
                    onPress={selectedRecipeData?.ingredientData?.[index]?.[selectedRecipeData.ingredientStores[index] + "Link"] ? () => Linking.openURL(selectedRecipeData?.ingredientData?.[index]?.[selectedRecipeData.ingredientStores[index] + "Link"]) : undefined }
                  >
                    {selectedRecipeData && selectedRecipeData.ingredientData[index] ? selectedRecipeData.ingredientData[index].ingredientName : ""}
                  </Text>
                </View>
              </View>

              {/* amount */}
              <View className="flex flex-row items-center justify-center w-[117.5px] h-[30px] bg-zinc100 border-r-0.5 border-r-zinc400 border-b-0.5 border-b-zinc400 z-10">
                
                {/* indicator of the current ingredient */}
                {selectedRecipeData !== null && (selectedIngredientIndex - 1) === (index) &&
                  <View className="absolute left-[-15px] z-0">
                    <Icon
                      name="reorder-four"
                      size={30}
                      color={colors.zinc350}
                    />
                  </View>
                }

                {/* amount and units */}
                {selectedRecipeData?.ingredientData?.[index] ?
                  <View className="flex flex-row">
                    {/* Input Amount */}
                    <TextInput
                      key={index}
                      className="bg-zinc100 text-[10px] leading-[12px] text-center"
                      placeholder={selectedRecipeData.ingredientAmounts[index] !== "" ? selectedRecipeData.ingredientAmounts[index] : "_"}
                      placeholderTextColor="black"
                      value={currIngredientAmounts[index]}
                      onChangeText={(value) => setAmount(validateFractionInput(value), index)}
                    />
                    {/* Unit */}
                    <Text className="text-[10px]">
                      {` ${selectedRecipeData.ingredientData[index][`${selectedRecipeData.ingredientStores[index]}Unit`]}` === undefined ? " unit(s)": ` ${extractUnit(selectedRecipeData.ingredientData[index][`${selectedRecipeData.ingredientStores[index]}Unit`], currIngredientAmounts[index])}`}
                    </Text>
                  </View>
                : null }
              </View>


              {/* details */}
              <TouchableOpacity 
                onPress={() => showCalcModal(index)}
                className="flex flex-col items-center justify-center absolute w-full h-full pl-[290px] bg-white border-b-0.5 border-b-zinc400 border-l-0.5 border-l-zinc400 z-0"
              >
                <View className="flex flex-row">
                  {/* calories */}
                  {selectedRecipeData?.ingredientCals?.[index] ?
                    <Text className="text-[10px]">
                      {selectedRecipeData.ingredientCals[index].toFixed(0)} {"cal"}
                    </Text>
                  : selectedRecipeData?.ingredientData?.[index] ?
                    <Text className="text-[10px]">
                      {"0 cal"}
                    </Text> 
                  : null }

                  {/* price */}
                  {selectedRecipeData?.ingredientPrices?.[index] ?
                    <Text className="text-[10px]">
                      {", $"}{selectedRecipeData.ingredientPrices[index].toFixed(2)}
                    </Text>
                  : selectedRecipeData?.ingredientData?.[index] ?
                    <Text className="text-[10px]">
                      {", $0.00"}
                    </Text> 
                  : null }
                </View>

                {/* servings possible */}
                {selectedRecipeData?.ingredientServings?.[index] ?
                  <Text className="text-[10px]">
                    {selectedRecipeData.ingredientServings[index].toFixed(2)} {"servings"}
                  </Text>
                : selectedRecipeData?.ingredientData?.[index] ?
                  <Text className="text-[10px]">
                    {"0.00 servings"}
                  </Text> 
                : null }
              </TouchableOpacity>
            </View>
          ))}
          
          {/* empty space at the bottom if the keyboard is open */}
          {(keyboardType === "" && isKeyboardOpen) &&
            <View className="flex flex-row h-[120px]"/>
          }
        </ScrollView>

        {/* CALCULATION MODAL */}
        {calcModalVisible &&
          <CalcIngredientModal
            modalVisible={calcModalVisible}
            setModalVisible={setCalcModalVisible}
            submitModal={submitCalcModal}
            ingredientData={selectedRecipeData?.ingredientData[calcIndex]}
            ingredientStore={selectedRecipeData?.ingredientStores[calcIndex]}
            initialCals={selectedRecipeData?.ingredientCals[calcIndex].toFixed(0)}
            initialPrice={selectedRecipeData?.ingredientPrices[calcIndex].toFixed(2)}
            initialServings={selectedRecipeData?.ingredientServings[calcIndex].toFixed(2)}
            initialAmount={selectedRecipeData?.ingredientAmounts[calcIndex]}
            amountUsed={null}
            amountContainer={selectedRecipeData?.ingredientData[calcIndex][`${selectedRecipeData?.ingredientStores[calcIndex]}TotalYield`] === "" ? 0 : new Fractional (selectedRecipeData?.ingredientData[calcIndex][`${selectedRecipeData?.ingredientStores[calcIndex]}TotalYield`]).toString()}
            servingSize={null}
          />
        }


        {/* FROZEN STORE SECTION */}
        <ScrollView 
          className="absolute mt-[80px] right-[-28px] z-40"
          contentOffset={{ y: scrollY }}
          scrollEnabled={false}
        >
          {Array.from({ length: 12 }, (_, index) => (
              <View key={`frozen-${index}`} className="flex flex-row h-[30px]">
                
                {/* logo section */}
                {selectedRecipeData?.ingredientStores && selectedRecipeData?.ingredientData[index] !== null && 
                  <TouchableOpacity 
                    onPress={() => changeStore(index)} 
                    className="flex items-center justify-center w-[30px]"
                  >
                    {selectedRecipeData?.ingredientStores?.[index] === "" ? 
                    <Text>-</Text>
                    :
                    <Image
                      source={
                        selectedRecipeData?.ingredientStores?.[index] === "a" ? aldi :
                        selectedRecipeData?.ingredientStores?.[index] === "mb" ? marketbasket :
                        selectedRecipeData?.ingredientStores?.[index] === "sm" ? starmarket :
                        selectedRecipeData?.ingredientStores?.[index] === "ss" ? stopandshop :
                        selectedRecipeData?.ingredientStores?.[index] === "t" ? target :
                        selectedRecipeData?.ingredientStores?.[index] === "w" ? walmart :
                        null
                      }
                      alt="store"
                      className={`${
                        selectedRecipeData?.ingredientStores?.[index] === "a" ? "w-[18px] h-[12px]" : 
                        selectedRecipeData?.ingredientStores?.[index] === "mb" ? "w-[19px] h-[18px]" : 
                        selectedRecipeData?.ingredientStores?.[index] === "sm" ? "w-[18px] h-[18px]" :
                        selectedRecipeData?.ingredientStores?.[index] === "ss" ? "w-[16px] h-[18px]" :
                        selectedRecipeData?.ingredientStores?.[index] === "t" ? "w-[18px] h-[18px]" : 
                        selectedRecipeData?.ingredientStores?.[index] === "w" ? "w-[18px] h-[18px]" : ""
                      }`}
                    />
                    }
                  </TouchableOpacity>
                }
            </View>
          ))}
        
          {/* empty space at the bottom if the keyboard is open */}
          {(keyboardType === "" && isKeyboardOpen) &&
            <View className="flex flex-row h-[120px]"/>
          }
        </ScrollView>


        {/* TOTAL ROW */}
        <View className="flex flex-row h-[30px] border-t-[0.25px] border-b-[1px]">
            
          {/* Tag Info */}
          <View className="flex items-center justify-center w-[27.5px] bg-theme900 z-20">
            {selectedRecipeData !== null &&
            <>
              
              {/* Button to open tag list */}
              <Icon
                name="information-circle-outline"
                color="white"
                size={20}
                onPress={() => selectedRecipeId ? setTagDropdownOpen(!tagDropdownOpen) : null }
              />

              {/* Tag List Dropdown */}
              {tagDropdownOpen && (
                <View className="absolute mb-[2px] left-0 right-0 bottom-[100%] bg-white z-80 w-[150px] rounded-[5px] max-h-[175px]">
                  {/* Fixed "NEW TAG" Option */}
                  <View className="flex flex-row w-full items-center border-0.5 border-black bg-zinc400 rounded-t">
                    <TouchableOpacity
                      className="p-2.5"
                      onPress={() => toggleTag('NEW TAG')}
                    >
                      <Text className="text-white font-bold">
                        NEW TAG
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Scrollable Tag List */}
                  <ScrollView>
                    {recipeTagList.map((item, index) => (
                      index !== 0 && ( // skips the "NEW TAG" item, already rendered above
                        <View 
                          key={index}
                          className="flex flex-row w-full items-center border-0.5 border-zinc350 bg-white"
                        >
                          {/* selection button */}
                          <TouchableOpacity
                            className="w-4/5 p-2.5"
                            onPress={() => toggleTag(item.value)}
                          >
                            <Text className="text-zinc800">
                              {item.label}
                            </Text>
                          </TouchableOpacity>

                          {/* edit button */}
                          <Icon 
                            name="ellipsis-horizontal"
                            color={colors.theme500}
                            size={18}
                            onPress={() => {
                              setEditTagModalVisible(true);
                              setSelectedEditTag(item.value);
                            }}
                          />
                        </View>
                      )
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Modal that appears to add a tag */}
              {newTagModalVisible && (
                <NewTagModal
                  modalVisible={newTagModalVisible} 
                  closeModal={closeNewTagModal} 
                />
              )}

              {/* Modal that appears to edit a tag */}
              {editTagModalVisible && (
                <ModTagModal
                  modalVisible={editTagModalVisible} 
                  closeModal={closeEditTagModal} 
                  currTag={selectedEditTag}
                />
              )}
            </>
            }
          </View>

          {/* Recipe's Tag List */}
          <View className="flex items-start justify-center w-[145px] border-r-0.5 bg-theme900 z-10">
            {selectedRecipeData !== null &&
            <>
              <Text className="text-white italic text-[10px]">
                {selectedRecipeData?.recipeTags?.join(", ") || "no tags available"}
              </Text>
            </>
            }
          </View>


          {/* Total Row */}
          <View className="flex flex-row justify-evenly items-center absolute w-full h-full pl-[167.5px] bg-theme800 z-0">
            {selectedRecipeData !== null &&
            <>

              {/* calorie header */}
              <View className="flex flex-row items-center justify-center">
                {selectedRecipeData?.recipeCal ?
                  <Text className="text-white text-[11px] italic">
                    {selectedRecipeData.recipeCal} {"cal"}
                  </Text>
                : 
                  <Text className="text-white text-[11px] italic">
                    {"0 cal"}
                  </Text> 
                }
              </View>

              {/* price header */}
              <View className="flex items-center justify-center">
                {selectedRecipeData?.recipePrice ?
                  <Text className="text-white text-[11px] italic">
                    {"$"}{selectedRecipeData.recipePrice}
                  </Text>
                : 
                  <Text className="text-white text-[11px] italic">
                    {"$0.00"}
                  </Text> 
                }
              </View>

              {/* servings header */}
              <View className="flex items-center justify-center">
                {selectedRecipeData?.recipeServing ?
                  <Text className="text-white text-[11px] italic">
                    {selectedRecipeData.recipeServing} {"servings"}
                  </Text>
                : 
                  <Text className="text-white text-[11px] italic">
                    {"0.00 servings"}
                  </Text> 
                }
              </View>
            </>
            }
          </View>
        </View>

        {/* Modal that appears to create a recipe */}
        {newModalVisible && (
          <ModMealModal
            modalVisible={newModalVisible} 
            closeModal={closeNewModal} 
            editingId={null}
            setEditingId={setSelectedRecipeId}
            editingData={null}
            setEditingData={setSelectedRecipeData}
            defaultName={recipeList.length + 1}
            type={"recipe"}
          />
        )}

        {/* Modal that appears to edit a recipe name */}
        {(editModalVisible && selectedRecipeId) && (
          <ModMealModal
            modalVisible={editModalVisible} 
            closeModal={closeEditModal} 
            editingId={selectedRecipeId}
            setEditingId={setSelectedRecipeId}
            editingData={selectedRecipeData}
            setEditingData={setSelectedRecipeData}
            defaultName={""}
            type={"recipe"}
          />
        )}
      </View>


      {/* INGREDIENT FILTERING SECTION */}
      {selectedRecipeData !== null &&
      <View className="flex flex-row mt-[20px] space-x-2 px-2">

        {/* Left Boxes */}
        <View className="flex flex-col items-center justify-center pr-[5px] ml-[-5px]">
          <View className="flex flex-row border-0.5 border-zinc900">

            {/* Store Selection */}
            <TouchableOpacity 
              className="z-10 w-[30px] bg-zinc100 border-2 border-zinc700 justify-center items-center"
              onPress={() => changeSelectedStore()}
            >
              {selectedIngredientStore === "" 
              ? // when no store is selected
              <Icon
                name="menu"
                size={20}
                color={colors.theme500}
              />
              : // when store is selected
              <Image
                source={
                  selectedIngredientStore === "a" ? aldi :
                  selectedIngredientStore === "mb" ? marketbasket :
                  selectedIngredientStore === "sm" ? starmarket :
                  selectedIngredientStore === "ss" ? stopandshop :
                  selectedIngredientStore === "t" ? target :
                  selectedIngredientStore === "w" ? walmart :
                  null
                }
                alt="store"
                className={`${
                  selectedIngredientStore === "a" ? "w-[18px] h-[12px]" : 
                  selectedIngredientStore === "mb" ? "w-[19px] h-[18px]" : 
                  selectedIngredientStore === "sm" ? "w-[18px] h-[18px]" :
                  selectedIngredientStore === "ss" ? "w-[16px] h-[18px]" :
                  selectedIngredientStore === "t" ? "w-[18px] h-[18px]" : 
                  selectedIngredientStore === "w" ? "w-[18px] h-[18px]" : ""
                }`}
              />
              }
            </TouchableOpacity>

            {/* Index Picker */}
            <View className="flex z-0 w-[120px] bg-zinc700">
              <Picker
                selectedValue={selectedIngredientIndex}
                onValueChange={setSelectedIngredientIndex}
                style={{ height: 30, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -30, }}
                itemStyle={{ color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 12, }}
              >
                {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).map((item) => (
                  <Picker.Item
                    key={item}
                    label={"INGREDIENT " + item}
                    value={item}
                  />
                ))}
              </Picker>
            </View>
          </View> 

          {/* Type Picker */}
          <View className="flex w-[150px] z-0 bg-theme200 border-0.5 border-theme400">
            <Picker
              selectedValue={selectedIngredientType}
              onValueChange={(itemValue) => {
                setSelectedIngredientType(itemValue);
                setIngredientDropdownOpen(true);
              }}
              style={{ height: 30, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -30, }}
              itemStyle={{ color:'black', fontWeight: 'bold', textAlign: 'center', fontSize: 12, }}
            >
              {ingredientTypeList.length > 1 ? (
                ingredientTypeList.map((item) => (
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
        </View>

        {/* Ingredient Search */}
        <View className="flex flex-row w-[45%] h-[70px]">
        
          {/* MOCK text input */}
          <TouchableOpacity 
            className="flex w-full h-full"
            onPress={() => { 
              if (selectedRecipeId !== null) {
                filterIngredientData(searchIngredientQuery);
                setIngredientDropdownOpen(false);
                setKeyboardType("ingredient search");
                setIsKeyboardOpen(true);
                setTagDropdownOpen(false);
                setNewTagModalVisible(false);
            }}}
          >
            <Text
              multiline={true}
              className={`${searchIngredientQuery !== '' && searchIngredientQuery !== "" ? "text-black" : "text-zinc400"} ${ingredientDropdownOpen ? "rounded-b-[5px]" : "rounded-[5px]"} flex-1 bg-white border-[1px] border-zinc300 px-[10px] py-[5px] text-[14px] leading-[16px]`}
            >
              {searchIngredientQuery !== '' && searchIngredientQuery !== "" ? searchIngredientQuery : "search for ingredient"}
            </Text>
          </TouchableOpacity>

          
          {/* Ingredient Dropdown */}
          {ingredientDropdownOpen && selectedRecipeId && !isKeyboardOpen && (
            <View className="absolute w-full bottom-[100%] border-x-0.5 border-t-0.5 bg-zinc350 rounded-t-[5px] max-h-[200px] z-50">
              <ScrollView>
                {filteredIngredientData.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {pickIngredient(item)}}
                    className={`p-2.5 ${index === 0 && "rounded-t-[5px]"} ${item.ingredientName === selectedIngredientName && "bg-zinc400"} ${index < filteredIngredientData.length - 1 && "border-b-[1px] border-zinc400"}`}
                  >
                    {/* name */}
                    <Text className="text-[13px] mr-4">
                      {item.ingredientName}
                    </Text>

                    {/* selected indicator */}
                    {item.ingredientName === selectedIngredientName &&
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

          {/* INDICATOR */}
          {(selectedIngredientName !== null && selectedIngredientName !== "") &&
          <View className="absolute left-1 bottom-0">
            <Icon
              name="link"
              size={20}
              color={colors.theme800}
              onPress={() => setIngredientModalVisible(true)}
            />
          </View>
          }

          {ingredientModalVisible &&
            <ViewIngredientModal
              modalVisible={ingredientModalVisible}
              setModalVisible={setIngredientModalVisible}
              ingredientData={selectedIngredientData}
            />
          }

          {/* BUTTONS */}
          <View className="flex flex-row space-x-[-2px] absolute right-0 bottom-0">

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

        {/* Buttons */}
        <View className="flex mr-[-5px] my-[-5px] justify-center">
          <View className="flex flex-col space-y-[5px] items-center rounded bg-zinc300 py-1">
            
            {/* Submit */}
            {(selectedIngredientId !== "" && selectedIngredientId !== null) &&
            <Icon
              name="checkmark-circle"
              size={20}
              color={colors.theme900}
              onPress={() => submitIngredient()}
            />
            }

            <View className="flex flex-row space-x-[-5px]">
              {/* Compress */}
              <Icon
                name="chevron-collapse"
                size={20}
                color={colors.theme900}
                onPress={() => collapseIngredients(true)}
              />
                
              {/* Add Space Between */}
              <Icon
                name="chevron-expand"
                size={20}
                color={colors.theme900}
                onPress={() => collapseIngredients(false)}
              />
            </View>

            {/* Delete */}
            {selectedRecipeData.ingredientData[selectedIngredientIndex - 1] !== null &&
            <Icon
              name="trash"
              size={20}
              color={colors.theme900}
              onPress={() => deleteIngredient()}
            />
            }
          </View>
        </View>
      </View>
      }
      
      
      {/* KEYBOARD POPUP SECTION */}
      {isKeyboardOpen && selectedRecipeId && keyboardType === "ingredient search" &&
        <>
          {/* Grayed Out BG */}
          <View className="absolute bg-black bg opacity-40 w-full h-full z-10"/>
        
          {/* Popup */}
          <View className="flex flex-col justify-center items-center w-full absolute bottom-[270px] space-y-1.5">
                
            {/* INGREDIENT SEARCH */}
            <View className="w-1/2 h-[70px]">

              {/* Filter TextInput */}
              <TextInput
                value={searchIngredientQuery}
                onChangeText={filterIngredientData}
                placeholder="search for ingredient"
                placeholderTextColor={colors.zinc400}
                className={`${ingredientDropdownOpen ? "rounded-b-[5px]" : "rounded-[5px]"} flex-1 bg-white border-[1px] border-zinc300 px-[10px] text-[14px] leading-[16px] z-10`}
                multiline={true}
                blurOnSubmit={true}
                onFocus={() => {
                  filterIngredientData(searchIngredientQuery);
                  setIngredientDropdownOpen(true);
                  setRecipeDropdownOpen(false);
                }}
              />
      
              {/* Ingredient Dropdown */}
              {ingredientDropdownOpen && (
                <View className="absolute w-full bottom-[100%] border-x-0.5 border-t-0.5 bg-zinc350 rounded-t-[5px] max-h-[200px] z-50">
                  <ScrollView>
                    {filteredIngredientData.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {pickIngredient(item)}}
                        className={`p-2.5 ${index === 0 && "rounded-t-[5px]"} ${item.ingredientName === selectedIngredientName && "bg-zinc400"} ${index < filteredIngredientData.length - 1 && "border-b-[1px] border-zinc400"}`}
                      >
                        {/* name */}
                        <Text className="text-[13px] mr-4">
                          {item.ingredientName}
                        </Text>

                        {/* selected indicator */}
                        {item.ingredientName === selectedIngredientName &&
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
                  onPress={() =>  {
                    setIngredientDropdownOpen(true);
                    filterIngredientData(searchIngredientQuery);
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
  
            {/* CLOSE BUTTON */}
            <TouchableOpacity
              className="flex bg-theme100 border-[1px] border-theme300 rounded-md py-1 px-4 z-50"
              onPress={() => {
                Keyboard.dismiss();
                setIsKeyboardOpen(false); 
                setKeyboardType("");
              }}
            > 
              <Text className="text-[12px] text-center font-bold">
                CLOSE
              </Text>
            </TouchableOpacity>
          </View>
        </>
      }
    </View>
  );
};