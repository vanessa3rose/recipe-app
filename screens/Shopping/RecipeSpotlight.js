///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useRef, useState, useEffect } from 'react';
import { useNavigation, useNavigationState } from '@react-navigation/native';

import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

import { View, Text, ScrollView, TextInput, Keyboard, TouchableOpacity, Linking, } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Picker } from '@react-native-picker/picker';

import CalcIngredientModal from '../../components/MultiUse/CalcIngredientModal';
import ModMealModal from '../../components/MultiUse/ModMealModal';
import ViewIngredientModal from '../../components/MultiUse/ViewIngredientModal';
import StoreRecipeModal from '../../components/Shopping-Spotlight/StoreRecipeModal';

import spotlightAdd from '../../firebase/Spotlights/spotlightAdd';
import { allIngredientFetch } from '../../firebase/Ingredients/allIngredientFetch'; 

// Fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';
import validateFractionInput from '../../components/Validation/validateFractionInput';

// Logos
import { Image } from 'react-native';
import aldi from '../../assets/Logos/aldi.png'
import marketbasket from '../../assets/Logos/market-basket.png'
import starmarket from '../../assets/Logos/star-market.png'
import stopandshop from '../../assets/Logos/stop-and-shop.png'
import target from '../../assets/Logos/target.png'
import walmart from '../../assets/Logos/walmart.png'

// initialize Firebase App
import { getFirestore, doc, updateDoc, collection, getDocs, getDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

export default function RecipeSpotlight ({ isSelectedTab }) {

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

  const navigation = useNavigation();
  
  // when the tab is switched to recipes
  useEffect(() => {
    if (isSelectedTab) {
      updateIngredients();
      refreshRecipes();
      refreshSpotlights();
      fetchGlobalSpotlight();
      setRecipeDropdownOpen(false);
    }
  }, [isSelectedTab])

  const previousIndexRef = useRef(null);
  const currentIndex = useNavigationState((state) => state.index);

  // if the screen has changed
  useEffect(() => {
    
    // if the page has changed to the current one, refetch the current data from the globals
    if (isSelectedTab && previousIndexRef !== null && previousIndexRef.current !== currentIndex && currentIndex === 0) {
      setTimeout(() => {
        updateIngredients();
        refreshRecipes();
        refreshSpotlights();
        fetchGlobalSpotlight();
        setRecipeDropdownOpen(false);}
      , 1000);
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
      setRecipeDropdownOpen(false); // recipe dropdown
      setSpotlightDropdownOpen(false);         // spotlight dropdown
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
    filterIngredientData("");

    // closes the type dropdown
    setIngredientDropdownOpen(false);
  }

  // for when the check button is selected next to the ingredient textinput
  const submitIngredient = async () => {

    // if an ingredient has been selected from the search and a spotlight is selected
    if (selectedIngredientName !== "" && selectedSpotlightId) {

      // gets the data of the searched ingredient
      const docSnap = await getDoc(doc(db, 'ingredients', selectedIngredientId)); 
      const data = docSnap.exists() ? docSnap.data() : null;
      
      // sets the ingredient's data to be default
      selectedSpotlightData.ingredientIds[selectedIngredientIndex - 1] = selectedIngredientId;
      selectedSpotlightData.ingredientData[selectedIngredientIndex - 1] = data;

      // if a store is not being filtered, calculates the initial store based on the brands that are and are not empty
      if (selectedIngredientStore === "") {

        // calculates the initial store based on the brands that are and are not empty
        const stores = ["a", "mb", "sm", "ss", "t", "w"];
        const currStore = "a";

        for (let i = 0; i < 6; i++) {
          if (selectedSpotlightData.ingredientData[selectedIngredientIndex - 1][`${stores[(stores.indexOf(currStore) + i) % 6]}${'Brand'}`] !== "") {
            selectedSpotlightData.ingredientStores[selectedIngredientIndex - 1] = stores[(stores.indexOf(currStore) + i) % 6];
            i = 6;
          }
        }
      // otherwise, just use the selected store
      } else {
        selectedSpotlightData.ingredientStores[selectedIngredientIndex - 1] = selectedIngredientStore;
      }
      
      // sets the store to match whatever is at that current index
      // setAmount(currIngredientAmounts[selectedIngredientIndex - 1], selectedIngredientIndex - 1);
      setCurrIngredientStores((prev) => {
        const updated = [...prev]; 
        updated[selectedIngredientIndex - 1] = selectedSpotlightData.ingredientStores[selectedIngredientIndex - 1];
        return updated;
      });

      // calculates the details and totals
      let calcData = calcAmounts(selectedSpotlightData);

      // determines changed stores
      determineEdited(calcData, recipeList);

      // loops over the 12 ingredients backwards to find the first empty one
      for (let i = 11; i >= 0; i--) {
        if (!calcData.ingredientData[i]) {
          setSelectedIngredientIndex(i + 1);
        }
      }

      // stores the spotlight data in the firebase
      await updateDoc(doc(db, "spotlights", selectedSpotlightId), calcData);

      // updates the selected spotlight's data
      setSelectedSpotlightData({ ...calcData });

      // clears the search
      clearIngredientSearch();
    }
  }

  // for when the collapse (isCollapsing) or expand (!isCollapsing) buttons are selected next to the ingredient textinput
  const collapseIngredients = (isCollapsing) => {

    // if a spotlight is selected
    if (selectedSpotlightId) {

      // the current ingredient data 
      let dataArr = selectedSpotlightData.ingredientData;
      let idsArr = selectedSpotlightData.ingredientIds;
      let amountsArr = selectedSpotlightData.ingredientAmounts;
      let storesArr = selectedSpotlightData.ingredientStores;
      let calsArr = selectedSpotlightData.ingredientCals;
      let pricesArr = selectedSpotlightData.ingredientPrices;
      let servingsArr = selectedSpotlightData.ingredientServings;

      // to store the new ingredient data - default values at first
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
          
          if (dataArr[i] !== null) {
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
      selectedSpotlightData.ingredientData = newDataArr;
      selectedSpotlightData.ingredientIds = newIdsArr;
      selectedSpotlightData.ingredientAmounts = newAmountsArr;
      selectedSpotlightData.ingredientStores = newStoresArr;
      selectedSpotlightData.ingredientCals = newCalsArr;
      selectedSpotlightData.ingredientPrices = newPricesArr;
      selectedSpotlightData.ingredientServings = newServingsArr;

      // calculates the details and totals
      let calcData = calcAmounts(selectedSpotlightData);

      // determines changed stores
      determineEdited(calcData, recipeList);

      // loops over the 12 ingredients backwards to find the first empty one
      for (let i = 11; i >= 0; i--) {
        if (!calcData.ingredientData[i]) {
          setSelectedIngredientIndex(i + 1);
        }
      }
      
      // stores the spotlight data in the firebase
      updateDoc(doc(db, 'spotlights', selectedSpotlightId), calcData);

      // updates the selected spotlight's data
      setSelectedSpotlightData(calcData);

      // clears the current storage of the amounts so the placeholders aren't janky
      setCurrIngredientAmounts(["", "", "", "", "", "", "", "", "", "", "", ""]);
      setCurrIngredientStores(newStoresArr);

      // reload settings
      refreshSpotlights();
    }
  }

  // for when the trash button is selected next to the ingredient textinput
  const deleteIngredient = () => {

    // clears the ingredient search textinput
    clearIngredientSearch();

    // resets the ingredient data at the selected index to be null
    selectedSpotlightData.ingredientData[selectedIngredientIndex - 1] = null;
    selectedSpotlightData.ingredientIds[selectedIngredientIndex - 1] = "";
    selectedSpotlightData.ingredientAmounts[selectedIngredientIndex - 1] = "";
    selectedSpotlightData.ingredientStores[selectedIngredientIndex - 1] = "";
    selectedSpotlightData.ingredientCals[selectedIngredientIndex - 1] = "";
    selectedSpotlightData.ingredientPrices[selectedIngredientIndex - 1] = "";
    selectedSpotlightData.ingredientServings[selectedIngredientIndex - 1] = "";

    // sets the current storage of the data so the placeholders aren't janky
    setCurrIngredientAmounts(["", "", "", "", "", "", "", "", "", "", "", ""]);
    setCurrIngredientStores((prev) => {
      const updated = [...prev]; 
      updated[selectedIngredientIndex - 1] = "";
      return updated;
    });

    // calculates the details and totals
    let calcData = calcAmounts(selectedSpotlightData);

    // determines changed stores
    determineEdited(calcData, recipeList);
    
    // loops over the 12 ingredients backwards to find the first empty one
    for (let i = 11; i >= 0; i--) {
      if (!calcData.ingredientData[i]) {
        setSelectedIngredientIndex(i + 1);
      }
    }
    
    // stores the spotlight data in the firebase
    updateDoc(doc(db, 'spotlights', selectedSpotlightId), calcData);

    // updates the selected spotlight's data
    setSelectedSpotlightData(calcData);

    // reload settings
    refreshSpotlights();
  }
  

  ///////////////////////////////// INGREDIENT AMOUNT LOGIC /////////////////////////////////

  // for the placeholders of the amount textinputs
  const [currIngredientAmounts, setCurrIngredientAmounts] = useState(["", "", "", "", "", "", "", "", "", "", "", ""]);

  // to store the entered amount in the current ingredient's data if it is valid
  const setAmount = (value, index) => {
    
    // if the spotlight data and required fields and valid
    if (selectedSpotlightData && selectedSpotlightData.ingredientData && selectedSpotlightData.ingredientStores) {
  
      // general variables
      const ingredient = selectedSpotlightData.ingredientData[index];
      const brandKey = `${selectedSpotlightData.ingredientStores[index]}Brand`;
      const unitKey = `${selectedSpotlightData.ingredientStores[index]}Unit`;

      // checks if the brand is valid, meaning the ingredient has data
      if (ingredient && ingredient[brandKey] && ingredient[brandKey] !== "" && ingredient[unitKey] && ingredient[unitKey] !== "") {
    
        // updates the current ingredient amounts
        setCurrIngredientAmounts((prev) => {
          const updated = [...prev];
          updated[index] = value;
          return updated;
        });

        // stores the ingredient amount and calculates the details and totals
        selectedSpotlightData.ingredientAmounts[index] = value;
        let calcData = calcAmounts(selectedSpotlightData);

        // determines changed stores
        determineEdited(calcData, recipeList);
        
        // stores the spotlight data in the firebase
        updateDoc(doc(db, 'spotlights', selectedSpotlightId), calcData);
    
        // updates the selected spotlight's data
        setSelectedSpotlightData(calcData);
      }
    }
  };  

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
          if (totalYield.toString() !== "NaN NaN/undefined" && !isNaN((new Fraction(totalYield.toString())) * 1) && calContainer.toString() !== "NaN NaN/undefined" && !isNaN((new Fraction(calContainer.toString())) * 1)) {
          
            // individual
            data.ingredientCals[index] = new Fraction(amount.divide(totalYield).multiply(calContainer).toString()) * 1;
          
            // overall
            totalCal = (new Fractional(totalCal)).add(amount.divide(totalYield).multiply(calContainer)).toString();

          // set individual calories to 0 if arguments are not valid
          } else {
            data.ingredientCals[index] = new Fraction(0) * 1;
          }

          // calculates prices if the arguments are valid
          if (totalYield.toString() !== "NaN NaN/undefined" && !isNaN((new Fraction(totalYield.toString())) * 1) && priceContainer.toString() !== "NaN NaN/undefined" && !isNaN((new Fraction(priceContainer.toString())) * 1)) {
          
            // individual
            data.ingredientPrices[index] = new Fraction(amount.divide(totalYield).multiply(priceContainer).toString()) * 1;

            // overall
            totalPrice = (new Fractional(totalPrice)).add(amount.divide(totalYield).multiply(priceContainer)).toString();

          // set individual prices to 0 if arguments are not valid
          } else {
            data.ingredientPrices[index] = new Fraction(0) * 1;
          }
    
          // calculate servings if the arguments are valid
          if (totalYield.toString() !== "NaN NaN/undefined" && !isNaN((new Fraction(totalYield.toString())) * 1)) {
          
            // individual
            data.ingredientServings[index] = amount.toString() === "0" ? 0 : new Fraction(totalYield.divide(amount).toString()) * 1;

            // overall
            totalServing = (index === 0 || totalServing > new Fraction(totalYield.divide(amount).toString()) * 1) ? new Fraction(totalYield.divide(amount).toString()) * 1 : totalServing;

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
    data.spotlightCal = ((new Fraction(totalCal.toString())) * 1).toFixed(0);
    data.spotlightPrice = ((new Fraction(totalPrice.toString())) * 1).toFixed(2);
    data.spotlightServing = ((new Fraction(totalServing.toString())) * 1).toFixed(2);

    return data;
  }


  ///////////////////////////////// INGREDIENT STORE LOGIC /////////////////////////////////

  // for the placeholders of the store logos
  const [currIngredientStores, setCurrIngredientStores] = useState([ "", "", "", "", "", "", "", "", "", "", "", "" ]);

  // to transition to the next store
  const changeStore = (index) => {
    
    // the list of stores
    const stores = ["a", "mb", "sm", "ss", "t", "w"];

    // the current store
    const currStore = selectedSpotlightData?.ingredientStores[index];

    // the next store
    let nextStore = currStore;

    // calculates the next store based on the brands that are and are not empty
    for (let i = 1; i <= 6; i++) {
      if (selectedSpotlightData.ingredientData[index][`${stores[(stores.indexOf(currStore) + i) % 6]}${'Brand'}`] !== "") {
        nextStore = stores[(stores.indexOf(currStore) + i) % 6];
        i = 7;
      }
    }

    // stores the new data 
    selectedSpotlightData.ingredientStores[index] = nextStore;

    // recalculates the details and totals
    let calcData = calcAmounts(selectedSpotlightData);

    // determines changed stores
    determineEdited(calcData, recipeList);
    
    // stores the spotlight data in the firebase
    updateDoc(doc(db, 'spotlights', selectedSpotlightId), calcData);

    // updates the selected spotlight's data
    setSelectedSpotlightData(calcData);

    // reload settings
    refreshSpotlights();

    // sets the store of the current index
    setCurrIngredientStores((prev) => {
      const updated = [...prev]; 
      updated[index] = nextStore;
      return updated;
    });
  }


  ///////////////////////////////// GETTING RECIPE DATA /////////////////////////////////

  // for the overall recipe list
  const [recipeList, setRecipeList] = useState([]);

  // for recipe dropdown
  const [selectedRecipeId, setSelectedRecipeId] = useState(null); 
  const [selectedRecipeData, setSelectedRecipeData] = useState(null); 


  // helper function to reload the selected recipe's data
  const reloadRecipe = async () => {
    if (selectedRecipeId) {
      const docSnap = await getDoc(doc(db, 'recipes', selectedRecipeId));
      const data = docSnap.exists() ? docSnap.data() : null;
      setSelectedRecipeData(data);
    }
  }
  
  // fetches the data of the selected recipe when the selected recipe changes
  useEffect(() => {
    reloadRecipe();
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

  
    // to store the collected recipe tags
    let allRecipeTags = ["NEW TAG"];
  
    // loops through the recipes
    querySnapshot.forEach((doc) => {

      // resets selected data
      const data = doc.data();
      if (selectedRecipeId === doc.id) { setSelectedRecipeData(data); }

      // adds all tags
      if (Array.isArray(data.recipeTags)) { allRecipeTags.push(...data.recipeTags); }
    });

    // determines changed details
    let calcData = calcAmounts(selectedSpotlightData);
    determineEdited(calcData, recipesArray);

    // updates the data
    await updateDoc(doc(db, "spotlights", selectedSpotlightId), calcData);
    setSelectedSpotlightData({ ...calcData });
  
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
  };


  ///////////////////////////////// RECIPE FILTERING /////////////////////////////////

  // for tag dropdown
  const [recipeTagList, setRecipeTagList] = useState([]);
  const [selectedRecipeTag, setSelectedRecipeTag] = useState("ALL TAGS"); 

  // for keyword input
  const [recipeKeywordQuery, setRecipeKeywordQuery] = useState("");
  const [ingredientKeywordQuery, setIngredientKeywordQuery] = useState("");

  // for filtering
  const [filteredRecipeList, setFilteredRecipeList] = useState([]);
  const [recipeDropdownOpen, setRecipeDropdownOpen] = useState(false);
  
  // closes other dropdowns when recipe dropdown is open
  useEffect(() => {

    // only does so on opening, not closing
    if (recipeDropdownOpen) {
      setIngredientDropdownOpen(false); // ingredient dropdown
      setSpotlightDropdownOpen(false);             // spotlight dropdown
    }
  }, [recipeDropdownOpen]);

  // to filter the recipe list of the top section
  const filterRecipeList = (recipeQuery, ingredientQuery) => {
    
    // filters for recipe search
    let filtered = recipeList.filter(recipe => {
      const queryWords = recipeQuery
        .toLowerCase()
        .split(' ')
        .filter(word => word.trim() !== ''); // splits into words and remove empty strings
    
      return queryWords.every(word => recipe.recipeName.toLowerCase().includes(word));
    });

    if (ingredientQuery !== "") {
      // filters for ingredient search
      filtered = filtered.filter(recipe => {
        const queryWords = ingredientQuery
          .toLowerCase()
          .split(' ')
          .filter(word => word.trim() !== ''); // splits into words and remove empty strings

        // checks if every keyword is in at least one of the 12 ingredient names
        return queryWords.every(word =>
          recipe.ingredientData.some((ingredient, index) => 
            index < 12 && ingredient && ingredient.ingredientName.toLowerCase().includes(word)
          )
        );
      });
    }

    // filters for tags
    if (selectedRecipeTag !== "ALL TAGS") {
      if (selectedRecipeTag === "NO TAGS") {
        filtered = filtered.filter(recipe => recipe.recipeTags.length === 0); // checks if array is empty
      } else {
        filtered = filtered.filter(recipe => recipe.recipeTags.includes(selectedRecipeTag));
      }
    }

    // sets the data and shows the dropdown list of ingredients if there are ingredients to show
    if (filtered.length !== 0) {
      setRecipeKeywordQuery(recipeQuery);
      setIngredientKeywordQuery(ingredientQuery);
      setRecipeDropdownOpen(true);
      setFilteredRecipeList(filtered);
    } else {
      setFilteredRecipeList(filteredRecipeList);
    }
  
    // clears selected ingredient if it doesn't match filtering
    if (filtered.filter((recipe) => recipe.recipeName.toLowerCase() === recipeQuery.toLowerCase()).length === 0) {
      setSelectedRecipeData(null);
      setSelectedRecipeId(null);
    }
  };

  // for when a keyword is changed
  useEffect(() => {
    filterRecipeList(recipeKeywordQuery, ingredientKeywordQuery);
    setRecipeDropdownOpen(true);
  }, [selectedRecipeTag]);

  // for when an recipe is selected from the dropdown that appears above the textinput
  const pickRecipe = (item) => {
    
    // stores the selection if the id is valid
    if (item.id) {
      setRecipeKeywordQuery(item.recipeName);
      setSelectedRecipeId(item.id);

    // otherwise, store default values
    } else {
      setRecipeKeywordQuery("");
      setSelectedRecipeId(null);
      setFilteredRecipeList(recipeList);
    }
    
    // closes the dropdown
    setRecipeDropdownOpen(false);
  }

  // for when the "x" button is selected in the recipe textinput
  const clearRecipeSearch = () => {
    
    // resets the search filtering
    setRecipeKeywordQuery("");
    setSelectedRecipeId(null);
    setSelectedRecipeData(null);

    // closes the type dropdown
    setRecipeDropdownOpen(false);
  }
  
  // to change the data of the recipe document under the global collection
  const changeGlobalRecipe = async () => {
    
    // as long as a recipe was collected
    if (selectedRecipeId) {
      updateDoc(doc(db, 'globals', 'recipe'), { id: selectedRecipeId });
    }
  }
  

  ///////////////////////////////// STORING A RECIPE /////////////////////////////////

  const [storeRecipeModalVisible, setStoreRecipeModalVisible] = useState(false);

  // for when overriding a recipe using the checkmark circle's modal
  const storeRecipeOverride = async () => {
    
    if (selectedSpotlightId && selectedRecipeId) {
      selectedSpotlightData.ingredientAmounts = selectedRecipeData.ingredientAmounts;
      selectedSpotlightData.ingredientCals = selectedRecipeData.ingredientCals;
      selectedSpotlightData.ingredientData = selectedRecipeData.ingredientData;
      selectedSpotlightData.ingredientIds = selectedRecipeData.ingredientIds;
      selectedSpotlightData.ingredientPrices = selectedRecipeData.ingredientPrices;
      selectedSpotlightData.ingredientServings = selectedRecipeData.ingredientServings;
      selectedSpotlightData.ingredientStores = selectedRecipeData.ingredientStores;
      selectedSpotlightData.spotlightCal = selectedRecipeData.recipeCal;
      selectedSpotlightData.spotlightName = selectedRecipeData.recipeName;
      selectedSpotlightData.spotlightPrice = selectedRecipeData.recipePrice;
      selectedSpotlightData.spotlightServing = selectedRecipeData.recipeServing;
      selectedSpotlightData.recipeId = selectedRecipeId;

      // stores that the amount and name are unchanged, as they match a recipe
      selectedSpotlightData.spotlightNameEdited = false;
      selectedSpotlightData.ingredientNameEdited = [ false, false, false, false, false, false, false, false, false, false, false, false ];
      selectedSpotlightData.ingredientAmountEdited = [ false, false, false, false, false, false, false, false, false, false, false, false ];
      selectedSpotlightData.ingredientStoreEdited = [ false, false, false, false, false, false, false, false, false, false, false, false ];

      // updates the collection data
      updateDoc(doc(db, 'spotlights', selectedSpotlightId), selectedSpotlightData);
  
      // updates the selected spotlight's data
      setSelectedSpotlightData(selectedSpotlightData);

      // change the data of the table
      setCurrIngredientAmounts(selectedRecipeData ? selectedRecipeData.ingredientAmounts : ["", "", "", "", "", "", "", "", "", "", "", ""]);
      setCurrIngredientStores(selectedRecipeData ? selectedRecipeData.ingredientStores : ["", "", "", "", "", "", "", "", "", "", "", ""]);

      // reload settings
      reloadSpotlight(selectedSpotlightId);
    }

    // closes the modal
    setStoreRecipeModalVisible(false);
  }

  // for when making a new recipe using the checkmark circle's modal
  const storeRecipeNew = async () => {
    
    if (selectedRecipeData !== null) {
      // resets the spotlight multiplicity
      setCurrSpotlightMult(0);

      // compiles the spotlight data from the recipe data
      const selectedData = {
        ingredientAmounts: selectedRecipeData.ingredientAmounts,
        ingredientCals: selectedRecipeData.ingredientCals,
        ingredientData: selectedRecipeData.ingredientData,
        ingredientIds: selectedRecipeData.ingredientIds,
        ingredientPrices: selectedRecipeData.ingredientPrices,
        ingredientServings: selectedRecipeData.ingredientServings,
        ingredientStores: selectedRecipeData.ingredientStores,
        spotlightCal: selectedRecipeData.recipeCal,
        spotlightName: selectedRecipeData.recipeName,
        spotlightPrice: selectedRecipeData.recipePrice,
        spotlightServing: selectedRecipeData.recipeServing,
        spotlightNameEdited: false,
        recipeId: selectedRecipeId,
        ingredientNameEdited: [ false, false, false, false, false, false, false, false, false, false, false, false ],
        ingredientAmountEdited: [ false, false, false, false, false, false, false, false, false, false, false, false ],
        ingredientStoreEdited: [ false, false, false, false, false, false, false, false, false, false, false, false ],
      }
  
      // adds a new spotlight and then immediately updates its data
      const [docId, spotlightData] = await spotlightAdd({ numSpotlights: spotlightList.length });
      updateDoc(doc(db, 'spotlights', docId), selectedData);
      
      // stores data
      setSelectedSpotlightId(docId);
      setSelectedSpotlightData(selectedData);
  
      // updates the list of selected spotlights and ids
      let newSelected = spotlightsSelected;
      spotlightsSelected.push(false);
      setSpotlightsSelected(newSelected);
  
      let newIds = spotlightsIds;
      spotlightsIds.push(docId);
      setSpotlightsIds(newIds);
  
      // stores the new data
      const spotlightsData = newIds.map((id) => ({
        id,
        selected: newSelected[newIds.indexOf(id)],
      }));
      updateDoc(doc(db, 'globals', 'shopping'), { spotlights: spotlightsData });
      
      // reload settings
      refreshSpotlights();
    }

    // closes the modal
    setStoreRecipeModalVisible(false);
  }
  

  ///////////////////////////////// SPOTLIGHT SELECTION /////////////////////////////////

  const [spotlightsIds, setSpotlightsIds] = useState(null);
  const [spotlightsSelected, setSpotlightsSelected] = useState(null);

  // to toggle the current spotlight's selected checkbox
  const changeSelected = async () => {

    // changes only the current spotlight's selection
    const newSelected = spotlightsSelected;
    newSelected[spotlightsIds.indexOf(selectedSpotlightId)] = !spotlightsSelected[spotlightsIds.indexOf(selectedSpotlightId)];

    // stores the data for the db
    const spotlightsData = spotlightsIds.map((id, index) => ({
      id,
      selected: newSelected[spotlightsIds.indexOf(id)],
    }));
      
    // stores the change
    updateDoc(doc(db, 'globals', 'shopping'), { spotlights: spotlightsData });
    setSpotlightsSelected(newSelected);

    // reloads
    setSpotlightDropdownOpen(false);
    reloadSpotlight(selectedSpotlightId);
  }
  

  ///////////////////////////////// GETTING SPOTLIGHT DATA /////////////////////////////////

  // for the overall spotlight list
  const [spotlightList, setSpotlightList] = useState([]);

  // for spotlight dropdown
  const [selectedSpotlightId, setSelectedSpotlightId] = useState(null); 
  const [selectedSpotlightData, setSelectedSpotlightData] = useState(null); 
  const [spotlightDropdownOpen, setSpotlightDropdownOpen] = useState(false);
  
  // closes other dropdowns when ingredient search dropdown is open
  useEffect(() => {

    // only does so on opening, not closing
    if (spotlightDropdownOpen) {
      setIngredientDropdownOpen(false); // ingredient dropdown
      setRecipeDropdownOpen(false);     // spotlight dropdown
    }
  }, [spotlightDropdownOpen]);
  
  
  // gets the spotlight document data from the globals collection
  const fetchGlobalSpotlight = async () => {
    
    try {
    
      // gets the global spotlight id
      const globalDoc = await getDoc(doc(db, 'globals', 'spotlight'));
      if (globalDoc.exists()) {
        
        let spotlightId = globalDoc.data().id;
        if (spotlightId) {

          // gets the spotlight data
          const spotlightDoc = await getDoc(doc(db, 'spotlights', spotlightId));
          if (spotlightDoc.exists()) {
            const spotlightData = spotlightDoc.data();

            // loops over the 12 ingredients backwards to find the first empty one
            for (let i = 11; i >= 0; i--) {
              if (!spotlightData.ingredientData[i]) {
                setSelectedIngredientIndex(i + 1);
              }
            }
            
            setSelectedSpotlightId(spotlightId);
            setSelectedSpotlightData(spotlightData);

            // if the data is not null
            if (spotlightData) {
              setCurrIngredientAmounts(spotlightData.ingredientAmounts);
              setCurrIngredientStores(spotlightData.ingredientStores);
              setCurrSpotlightMult(spotlightData.spotlightMult);

            // otherwise, default values
            } else {
              setCurrIngredientAmounts(["", "", "", "", "", "", "", "", "", "", "", ""]);
              setCurrIngredientStores(["", "", "", "", "", "", "", "", "", "", "", ""]);
              setCurrSpotlightMult(0);
              setSelectedIngredientIndex(1);
            }
          }

        // otherwise, store default values
        } else {
          setSelectedSpotlightId(null);
          setSelectedSpotlightData(null);
          setSelectedIngredientIndex(1);
          setCurrIngredientAmounts(["", "", "", "", "", "", "", "", "", "", "", ""]);
          setCurrIngredientStores(["", "", "", "", "", "", "", "", "", "", "", ""]);
          setCurrSpotlightMult(0);
        }
      }

    } catch (error) {
      console.error('Error fetching spotlight document:', error);
    }
  };

  // helper function to reload the selected spotlight's data
  const reloadSpotlight = async (selectedSpotlightId) => {
    
    // if a spotlight is selected
    if (selectedSpotlightId) {

      // stores the recipe data in the firebase
      updateDoc(doc(db, 'globals', 'spotlight'), { id: selectedSpotlightId });

      // gets the data
      const docSnap = await getDoc(doc(db, 'spotlights', selectedSpotlightId));

      // sets the spotlight based on the given id and data
      if (docSnap.exists()) {
        data = docSnap.data();

        setCurrIngredientStores(data.ingredientStores)
        setCurrSpotlightMult(data.spotlightMult)

        // if there are amounts of ingredients, update them
        if (data.ingredientAmounts) {
          let calcData = calcAmounts(data);

          // loops over the 12 ingredients backwards to find the first empty one
          for (let i = 11; i >= 0; i--) {
            if (!calcData.ingredientData[i]) {
              setSelectedIngredientIndex(i + 1);
            }
          }

          // determines changed stores
          determineEdited(calcData, recipeList);

          // updates the collection data
          await updateDoc(doc(db, "spotlights", selectedSpotlightId), calcData);
      
          // updates the selected data
          setSelectedSpotlightData({ ...calcData });
        }
      }
    
    // if a spotlight is not selected, set default data
    } else {
      setSelectedSpotlightId(null);
      setSelectedSpotlightData(null);
      setSelectedIngredientIndex(1);
      setCurrIngredientAmounts(["", "", "", "", "", "", "", "", "", "", "", ""]);
      setCurrIngredientStores(["", "", "", "", "", "", "", "", "", "", "", ""]);
      setCurrSpotlightMult(0);
    }
  }
  
  // fetches the data of the selected spotlight when the selected spotlight changes
  useEffect(() => {
    if (isSelectedTab) {
      reloadSpotlight(selectedSpotlightId);
    }
  }, [selectedSpotlightId]);


  // helper function to refresh the list of spotlights
  const refreshSpotlights = async () => {

    // gets the collection of spotlights
    const querySnapshot = await getDocs(collection(db, 'spotlights'));
    
    // reformats each one
    const spotlightsArray = querySnapshot.docs.map((doc) => {
      const formattedSpotlight = {
        id: doc.id,
        ... doc.data(),
      };
      return formattedSpotlight;
    })
    .sort((a, b) => a.spotlightName.localeCompare(b.spotlightName)); // sort by spotlightName alphabetically
    
    setSpotlightList(spotlightsArray);
        
    // gets current global spotlight info
    const shopping = await getDoc(doc(db, 'globals', 'shopping'));
    const shoppingData = shopping.data();
    const shoppingIds = shoppingData.spotlights.map((doc) => doc.id);
    const shoppingSelected = shoppingData.spotlights.map((doc) => doc.selected);

    // stores it
    setSpotlightsIds(shoppingIds);
    setSpotlightsSelected(shoppingSelected);
  };


  ///////////////////////////////// NEW SPOTLIGHT /////////////////////////////////

  // when creating a new spotlight, creates a blank one in firebase
  const newSpotlight = async () => { 
    setCurrIngredientAmounts([ "", "", "", "", "", "", "", "", "", "", "", "" ]);
    setCurrIngredientStores([ "", "", "", "", "", "", "", "", "", "", "", "" ]);
    setCurrSpotlightMult(0);

    // resets ingredient filtering
    setSelectedIngredientType("ALL TYPES");
    clearIngredientSearch();

    const [docId, spotlightData] = await spotlightAdd({ numSpotlights: spotlightList.length });
    
    setSelectedSpotlightData(spotlightData);
    setSelectedSpotlightId(docId);

    // updates the list of selected spotlights and ids
    let newSelected = spotlightsSelected;
    spotlightsSelected.push(false);
    setSpotlightsSelected(newSelected);

    let newIds = spotlightsIds;
    spotlightsIds.push(docId);
    setSpotlightsIds(newIds);

    // stores the new data
    const spotlightsData = newIds.map((id) => ({
      id,
      selected: newSelected[newIds.indexOf(id)],
    }));
    updateDoc(doc(db, 'globals', 'shopping'), { spotlights: spotlightsData });
    
    // reload settings
    refreshSpotlights();
  };


  ///////////////////////////////// EDIT SPOTLIGHT /////////////////////////////////

  const [modModalVisible, setModModalVisible] = useState(false);

  // if the edit spotlight modal is opened/closed
  useEffect(() => {

    // if it is opened but the selected id is not valid, close it
    if (modModalVisible) {
      if (!selectedSpotlightId) {
        setModModalVisible(false);
      }
    }
  }, [modModalVisible]);

  // when closing the add modal to edit
  const closeModModal = async (type) => {
    setModModalVisible(false);

    // reload settings if the modal wasn't canceled
    if (type !== "") { refreshSpotlights(); }
    
    // if the meal prep was deleted
    if (type === "delete") {
      setCurrIngredientAmounts([ "", "", "", "", "", "", "", "", "", "", "", "" ]);
      setCurrIngredientStores([ "", "", "", "", "", "", "", "", "", "", "", "" ]);
      setCurrSpotlightMult(0);
      setSelectedIngredientIndex(1);

      // filters the selected spotlights and ids to remove the deleted one
      const newIds = spotlightsIds.filter((_, index) => index !== spotlightsIds.indexOf(selectedSpotlightId));
      const newSelected = spotlightsSelected.filter((_, index) => index !== spotlightsIds.indexOf(selectedSpotlightId));
      
      // stores the new data
      const spotlightsData = newIds.map((id) => ({
        id,
        selected: newSelected[newIds.indexOf(id)],
      }));
      updateDoc(doc(db, 'globals', 'shopping'), { spotlights: spotlightsData });

      // restores data
      setSelectedSpotlightData(null);
      setSelectedSpotlightId(null);
    }
  };


  ///////////////////////////////// SPOTLIGHT MULTIPLICITY /////////////////////////////////

  const [currSpotlightMult, setCurrSpotlightMult] = useState(0);

  // to handle an updated multiplicity in the textinput
  const updateMult = (text) => {
    
    // if a spotlight is selected
    if (selectedSpotlightData) {

      // updates the text only if its a whole number
      if (/^\d*$/.test(text) && !isNaN(text)) { 
        setCurrSpotlightMult(Number(text));

        // stores the new multiplicity
        selectedSpotlightData.spotlightMult = Number(text);
    
        // stores the spotlight data in the firebase
        updateDoc(doc(db, 'spotlights', selectedSpotlightId), selectedSpotlightData);

        // updates the selected spotlight's data
        setSelectedSpotlightData(selectedSpotlightData);
      }

    // if a spotlight is not selected
    } else {
      setCurrSpotlightMult(0);
    }
  }
    
  
  ///////////////////////////////// CALCULATE DATA DETAILS MODAL /////////////////////////////////

  const [calcModalVisible, setCalcModalVisible] = useState(false);
  const [calcIndex, setCalcIndex] = useState(-1);
  const [nonselectedAmountUsed, setNonselectedAmountUsed] = useState(null);
  
  // when an ingredient's details are clicked to view the modal
  const showCalcModal = (index) => {
    if (selectedSpotlightData?.ingredientData[index] !== null) {

      // to calculate amount left without current spotlight
      let amountUsed = "0";

      // loops over the other spotlights
      spotlightList.forEach((spotlight) => {
        if (spotlight.id !== selectedSpotlightId && spotlightsSelected[spotlightsIds.indexOf(spotlight.id)]) {
          
          // loops over the matching ingredients and adds their amounts * spotlight mults
          for (let i = 0; i < 12; i++) {
            if (spotlight.ingredientData[i] !== null && spotlight.ingredientIds[i] === selectedSpotlightData.ingredientIds[index]) {
              amountUsed = (new Fractional(amountUsed).add(new Fractional(spotlight.ingredientAmounts[i]).multiply(new Fractional(spotlight.spotlightMult)))).toString();
            }
          }
        }
      })

      setNonselectedAmountUsed(amountUsed);
      

      // opens modal
      setCalcIndex(index);
      setCalcModalVisible(true);
    }
  }

  // when the arrow inside the modal is clicked to save the amount
  const submitCalcModal = async (amount) => {
    setAmount(amount, calcIndex);
    setCalcIndex(-1);
    setCalcModalVisible(false);
    setNonselectedAmountUsed(null);
  }


  ///////////////////////////////// EDITIED DATA /////////////////////////////////

  // to determine which parts of the recipe taken from have changed
  const determineEdited = (data, recipeList) => {
    if (data.recipeId !== null) {

      // gets the current data of the original recipe
      const ogRecipe = recipeList.find((recipe) => recipe.id === data.recipeId);

      // loops over the spotlight's 12 ingredients
      for (let i = 0; i < 12; i++) {

        // finds the original recipe's index of the current ingredient
        const ogIndex = ogRecipe.ingredientIds.indexOf(data.ingredientIds[i]);
        
        // if the ingredient was found, update accordingly; if not, was edited
        data.ingredientNameEdited[i] = ogIndex === -1 ? true : data.ingredientData[i]?.ingredientName !== ogRecipe.ingredientData[ogIndex]?.ingredientName;
        data.ingredientAmountEdited[i] = ogIndex === -1 ? true : data.ingredientAmounts[i] !== ogRecipe.ingredientAmounts[ogIndex];
        data.ingredientStoreEdited[i] = ogIndex === -1 ? true : data.ingredientStores[i] !== ogRecipe.ingredientStores[ogIndex];
      }
    }
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
    <View className="flex-1 items-center justify-center bg-zinc200 border">


      {/* RECIPE FILTERING SECTION */}
      <View className="flex flex-row w-11/12 justify-center items-center mb-[20px]">
        
        {/* KEYWORD INPUT */}
        <View className="flex flex-col justify-center items-center w-full space-y-[5px]">
            
          {/* Ingredient */}
          <View className="flex flex-row w-full justify-between">
            <View className="bg-zinc200 w-7/12 h-[30px]">

              {/* text input */}
              <TextInput
                value={ingredientKeywordQuery}
                onChangeText={(value) => filterRecipeList(recipeKeywordQuery, value)}
                placeholder="ingredient keyword(s)"
                placeholderTextColor={colors.zinc400}
                className="flex-1 text-[14px] leading-[16px] pl-2.5 pr-10 border-[1px] border-zinc300 rounded-[5px] bg-white"
              />

              {/* clear button */}
              <View className="absolute right-0 h-[30px] justify-center">
                <Icon
                  name="close-outline"
                  size={20}
                  color="black"
                  onPress={() => {
                    setIngredientKeywordQuery("");
                    filterRecipeList(recipeKeywordQuery, "")
                  }}
                />
              </View>
            </View>

            {/* Tag Picker */}
            <View className="z-0 bg-theme200 border border-theme400 w-1/3">
              <Picker
                selectedValue={selectedRecipeTag}
                onValueChange={(itemValue) => setSelectedRecipeTag(itemValue)}
                style={{ height: 30, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -10, }}
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
          </View>
          
          {/* Recipe */}
          <View className="bg-white w-full h-[30px] border-[1px] border-zinc300 rounded-[5px]">

            {/* Recipe Search */}
            <View className={`flex flex-row w-full h-full ${selectedRecipeData !== null ? "px-1" : "pl-1"}`}>

              {/* More Buttons - in white bg */}
              <View className="flex flex-row items-center w-[5%] justify-center">
                {/* refetches the name of the recipe that was taken from */}
                <Icon
                  name="refresh-circle"
                  size={20}
                  color={colors.zinc500}
                  onPress={() => {
                    // retrieves the name of the recipe taken from
                    if (selectedSpotlightData !== null && selectedSpotlightData.recipeId !== null) {
                      setRecipeKeywordQuery(recipeList.find((recipe) => recipe.id === data.recipeId).recipeName)
                    } else if (selectedSpotlightData !== null && selectedSpotlightData.recipeId === null) {
                      setRecipeKeywordQuery("");
                    }
                  }}
                />
              </View>

              {/* Filter TextInput */}
              <View className={`flex flex-row ${selectedRecipeData !== null ? "w-[85%] px-1" : "w-[95%] pl-1"}`}>
                <TextInput
                  value={recipeKeywordQuery}
                  onChangeText={(value) => filterRecipeList(value, ingredientKeywordQuery)}
                  placeholder="recipe keyword(s)"
                  placeholderTextColor={'white'}
                  className={`flex-1 text-white text-[14px] leading-[16px] pl-2.5 pr-10 bg-zinc400 ${recipeDropdownOpen ? "rounded-t-[5px]" : "rounded-[5px]"}`}
                  onFocus={() => {
                    setIngredientDropdownOpen(false);
                    setRecipeDropdownOpen(filteredRecipeList.length > 0);
                  }}
                />

                {/* Recipe Dropdown */}
                {recipeDropdownOpen && (
                  <View className="flex w-full absolute top-[100%] bg-theme100  max-h-[200px] rounded-b-[5px] border-x-[1px] border-b-[1px] border-zinc400 z-50">
                    <ScrollView>
                      {filteredRecipeList.map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          className="p-2.5 border-b-[1px] border-theme200"
                          onPress={() => pickRecipe(item)}
                        >
                          <Text>{item.recipeName}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Buttons */}
                <View className="absolute flex-row items-center right-2 h-[30px] justify-center">

                  {/* opens the recipe dropdown */}
                  <Icon
                    name="chevron-down-outline"
                    size={20}
                    color="white"
                    onPress={() => filterRecipeList(recipeKeywordQuery, ingredientKeywordQuery)}
                  />

                  {/* clears the recipe input from the search bar */}
                  <Icon
                    name="close"
                    size={20}
                    color="white"
                    onPress={() => clearRecipeSearch()}
                  />
                </View>
              </View>

              {/* More Buttons - in white bg */}
              {selectedRecipeData !== null &&
              <View className="flex flex-row items-center w-[10%] justify-center">

                {/* stores the selected recipe's data in the selected spotlight without unselecting the recipe */}
                <Icon
                  name="checkmark-circle"
                  size={20}
                  color={colors.zinc500}
                  onPress={() => {
                    if (recipeKeywordQuery !== "" && !recipeDropdownOpen) {
                      // if there isn't a spotlight already, create a new one
                      if (selectedSpotlightId === null) { storeRecipeNew(); } 
                      // if there is, show the modal
                      else { setStoreRecipeModalVisible(true); }
                    }
                  }}
                />

                {/* go to the recipe in the search bar under the food -> recipe tab */}
                <Icon
                  name="arrow-redo"
                  size={20}
                  color={colors.zinc500}
                  onPress={() => {
                    if (recipeKeywordQuery !== "" && !recipeDropdownOpen) {
                      changeGlobalRecipe();
                      navigation.navigate('FOOD', { screen: 'Recipes' });
                      clearRecipeSearch();
                    }
                  }}
                />
              </View>
              }

              {/* Storing Recipe Modal */}
              <StoreRecipeModal
                modalVisible={storeRecipeModalVisible}
                setModalVisible={setStoreRecipeModalVisible}
                recipeData={selectedRecipeData}
                overrideRecipe={storeRecipeOverride}
                newRecipe={storeRecipeNew}
              />
            </View>
          </View>
        </View>
      </View>


      {/* SPOTLIGHT CARD SECTION */}
      <View className={`w-11/12 ${selectedSpotlightId ? "mr-[20px]" : ""} border-[1px] border-black bg-black ${isKeyboardOpen && keyboardType === "ingredient search" ? "z-0" : ""}`}>

        {/* TITLE ROW */}
        <View className="flex-row border-b-[1px]">
    
          {/* Buttons */}
          <View className={`flex flex-col ${selectedSpotlightData?.spotlightNameEdited && selectedSpotlightData?.recipeId !== null ? "bg-zinc700" : "bg-theme800"} items-center justify-center h-[50px] w-[30px] z-30`}>
              
            {/* Add - creates a new blank spotlight recipe */}
            <Icon
              size={15}
              color="white"
              name="add-outline"
              onPress={() => newSpotlight()}
            />

            {/* Edit (three dots) - rename or delete current spotlight recipe */}
            {selectedSpotlightData !== null &&
            <Icon
              size={15}
              color="white"
              name="ellipsis-horizontal-outline"
              onPress={() => setModModalVisible(true)}
            />
            }

            {/* Modal that appears to edit/delete a spotlight */}
            {(modModalVisible && selectedSpotlightId) && (
              <ModMealModal
                modalVisible={modModalVisible} 
                closeModal={closeModModal} 
                editingId={selectedSpotlightId}
                setEditingId={setSelectedSpotlightId}
                editingData={selectedSpotlightData}
                setEditingData={setSelectedSpotlightData}
                defaultName={""}
                type={"spotlight"}
              />
            )}
          </View>
          
          {/* Text */}
          <View className="flex flex-row ml-[-30px] mr-[20px] pl-[30px] items-center justify-center w-full">
            {/* Spotlight Dropdown */}
            <View className="flex flex-row items-center justify-center w-5/6 h-[50px] z-30">
              <View className={`flex ${selectedSpotlightData?.spotlightNameEdited && selectedSpotlightData?.recipeId !== null ? "bg-zinc700" : "bg-theme800"} items-center justify-center w-full`}>
                <DropDownPicker 
                  open={spotlightDropdownOpen}
                  setOpen={setSpotlightDropdownOpen}
                  value={selectedSpotlightId}
                  setValue={setSelectedSpotlightId}
                  items={spotlightList.map((spotlight, index) => ({
                    label: spotlightDropdownOpen 
                      ? `(${selectedSpotlightId === spotlight.id && selectedSpotlightData ? currSpotlightMult : spotlight.spotlightMult}) ` +
                        (selectedSpotlightId === spotlight.id && selectedSpotlightData ? selectedSpotlightData.spotlightName : spotlight.spotlightName)
                      : (selectedSpotlightId === spotlight.id && selectedSpotlightData ? selectedSpotlightData.spotlightName : spotlight.spotlightName),
                    value: spotlight.id,
                    key: spotlight.id,
                    labelStyle: { 
                      color: spotlightsSelected !== null && spotlightsSelected[spotlightsIds.indexOf(spotlight.id)] ? 'black' : colors.zinc500,
                      textDecorationLine: spotlightsSelected !== null && spotlightsSelected[spotlightsIds.indexOf(spotlight.id)] ? 'none' : 'line-through', 
                    }
                  }))}
                  placeholder=""
                  style={{ height: 50, backgroundColor: selectedSpotlightData?.spotlightNameEdited && selectedSpotlightData?.recipeId !== null ? colors.zinc700 : colors.theme800, borderWidth: 0, justifyContent: 'center', }}
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

            {/* Multiplicity Input */}
            <View className="flex flex-row bg-theme700 border-l items-center justify-center w-1/6 h-[50px]">
              {selectedSpotlightData !== null &&
              <TextInput
                value={String(currSpotlightMult)}
                onChangeText={(text) => updateMult(text)}
                placeholder={selectedSpotlightData ? String(selectedSpotlightData.spotlightMult) : "0"}
                placeholderTextColor={'white'}
                className="flex-1 text-[14px] leading-[16px] font-bold text-white text-center"
              />
              }
            </View>
          </View>
        </View>

        {/* Selected Button */}
        {spotlightsIds !== null && selectedSpotlightId !== null &&
        <View className="absolute w-5/6 bg-zinc100">
          {/* Signifier */}
          <View className="absolute right-0 w-1/12 h-[50px] pr-[7px] items-end justify-center z-40">
            <Icon
              name={spotlightsSelected[spotlightsIds.indexOf(selectedSpotlightId)] ? "checkmark-sharp" : "close"}
              size={16}
              color="black"
              onPress={() => changeSelected()}
            />
          </View>
          {/* Background */}
          <View className="absolute right-0 w-1/12 h-[50px] pr-[5px] items-end justify-center z-30">
            <Icon
              name="square"
              size={20}
              color="white"
            />
          </View>
        </View>
        }

        {/* HEADER ROW */}
        <View className="w-full flex flex-row h-[30px] bg-theme900 border-b-[1px] z-20">
          {selectedSpotlightData !== null &&
          <>
            {/* ingredient header */}
            <View className="flex items-center justify-center w-5/12 border-r">
              <Text className="text-white text-xs font-bold">
                INGREDIENT
              </Text>
            </View>

            {/* amount header */}
            <View className="flex items-center justify-center w-1/3 border-r">
              <Text className="text-white text-xs font-bold">
                AMOUNT
              </Text>
            </View>

            {/* details header */}
            <View className="flex items-center justify-center w-1/4">
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
            <View key={`frozen-${index}`} className="flex flex-row h-[30px] bg-white">
              
              {/* ingredient names */}
              <View className={`flex items-center justify-center w-5/12 ${selectedSpotlightData?.ingredientNameEdited[index] && selectedSpotlightData?.recipeId !== null ? "bg-zinc500" : "bg-theme600"} border-b border-r border-zinc700 z-10`}>
                <View className="flex flex-wrap flex-row">
                  <Text 
                    className={`text-white text-[10px] text-center px-2 ${selectedSpotlightData?.ingredientData?.[index]?.[selectedSpotlightData.ingredientStores[index] + "Link"] && "underline"}`}
                    onPress={selectedSpotlightData?.ingredientData?.[index]?.[selectedSpotlightData.ingredientStores[index] + "Link"] ? () => Linking.openURL(selectedSpotlightData?.ingredientData?.[index]?.[selectedSpotlightData.ingredientStores[index] + "Link"]) : undefined }
                  >
                    {selectedSpotlightData && selectedSpotlightData.ingredientData[index] ? selectedSpotlightData.ingredientData[index].ingredientName : ""}
                  </Text>
                </View>
              </View>

              {/* amount */}
              <View className="flex flex-row items-center justify-center bg-zinc100 w-1/3 border-b border-b-zinc400 border-r border-r-zinc300 z-0">
                
                {/* indicator of the current ingredient */}
                {selectedSpotlightData !== null && (selectedIngredientIndex - 1) === (index) &&
                  <View className="absolute left-[-15px] z-0">
                    <Icon
                      name="reorder-four"
                      size={30}
                      color={selectedSpotlightData?.ingredientNameEdited[index] && selectedSpotlightData?.recipeId !== null ? colors.zinc350 : colors.theme300}
                    />
                  </View>
                }

                {/* amount and units */}
                {selectedSpotlightData?.ingredientData?.[index] ?
                  <View className="flex flex-row">
                    {/* Input Amount */}
                    <TextInput
                      key={index}
                      className={`text-[10px] leading-[12px] text-center px-[3px] ${selectedSpotlightData?.ingredientAmountEdited[index] && selectedSpotlightData?.recipeId !== null ? "bg-zinc300" : selectedSpotlightData?.recipeId !== null ? "bg-theme100" : ""}`}
                      placeholder={selectedSpotlightData.ingredientAmounts[index] !== "" ? selectedSpotlightData.ingredientAmounts[index] : "_"}
                      placeholderTextColor="black"
                      value={currIngredientAmounts[index]}
                      onChangeText={(value) => setAmount(validateFractionInput(value), index)}
                    />
                    {/* Unit */}
                    <Text className="text-[10px]">
                      {` ${selectedSpotlightData.ingredientData[index][`${selectedSpotlightData.ingredientStores[index]}Unit`]}`}
                    </Text>
                  </View>
                : null }
              </View>

              {/* details */}
              <TouchableOpacity 
                onPress={() => showCalcModal(index)}
                className="flex flex-col items-center justify-center bg-white w-1/4 border-b border-b-zinc400 border-l border-l-zinc400"
              >
                <View className="flex flex-row">
                  {/* calories */}
                  {selectedSpotlightData?.ingredientCals?.[index] ?
                    <Text className="text-[10px]">
                      {selectedSpotlightData.ingredientCals[index].toFixed(0)} {"cal"}
                    </Text>
                  : selectedSpotlightData?.ingredientData?.[index] ?
                    <Text className="text-[10px]">
                      {"0 cal"}
                    </Text> 
                  : null }

                  {/* price */}
                  {selectedSpotlightData?.ingredientPrices?.[index] ?
                    <Text className="text-[10px]">
                      {", $"}{selectedSpotlightData.ingredientPrices[index].toFixed(2)}
                    </Text>
                  : selectedSpotlightData?.ingredientData?.[index] ?
                    <Text className="text-[10px]">
                      {", $0.00"}
                    </Text> 
                  : null }
                </View>

                {/* servings possible */}
                {selectedSpotlightData?.ingredientServings?.[index] ?
                  <Text className="text-[10px]">
                    {""}{selectedSpotlightData.ingredientServings[index].toFixed(2)} {"servings"}
                  </Text>
                : selectedSpotlightData?.ingredientData?.[index] ?
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
            ingredientData={selectedSpotlightData?.ingredientData[calcIndex]}
            ingredientStore={selectedSpotlightData?.ingredientStores[calcIndex]}
            initialCals={selectedSpotlightData?.ingredientCals[calcIndex].toFixed(0)}
            initialPrice={selectedSpotlightData?.ingredientPrices[calcIndex].toFixed(2)}
            initialServings={selectedSpotlightData?.ingredientServings[calcIndex].toFixed(2)}
            initialAmount={selectedSpotlightData?.ingredientAmounts[calcIndex]}
            amountUsed={nonselectedAmountUsed}
            amountContainer={new Fractional(selectedSpotlightData?.ingredientData[calcIndex][`${selectedSpotlightData?.ingredientStores[calcIndex]}TotalYield`]).toString()}
            servingSize={null}
          />
        }

        {/* FROZEN STORE COLUMNS */}
        <ScrollView 
          className="absolute mt-[80px] right-[-28px] z-0"
          contentOffset={{ y: scrollY }}
          scrollEnabled={false}
        >
          {Array.from({ length: 12 }, (_, index) => (
            <View key={`frozen-${index}`} className="flex flex-row h-[30px]">
              {selectedSpotlightData?.ingredientData[index] !== null &&
              <>
                {/* logo section */}
                <TouchableOpacity 
                  onPress={() => changeStore(index)} 
                  className="flex items-center justify-center w-[30px] p-[3px]"
                >
                  {selectedSpotlightData ?
   
                  currIngredientStores[index] === "" 
                  ? <Text>-</Text> 
                  :
                  <View className={`w-full h-full justify-center items-center rounded-r-md ${selectedSpotlightData?.ingredientStoreEdited[index] && selectedSpotlightData?.recipeId !== null ? "bg-zinc350" : selectedSpotlightData?.recipeId !== null ?  "bg-theme200" : ""}`}>
                    <Image
                      source={
                        currIngredientStores[index] === "a" ? aldi :
                        currIngredientStores[index] === "mb" ? marketbasket :
                        currIngredientStores[index] === "sm" ? starmarket :
                        currIngredientStores[index] === "ss" ? stopandshop :
                        currIngredientStores[index] === "t" ? target :
                        currIngredientStores[index] === "w" ? walmart :
                        null
                      }
                      alt="store"
                      className={`${
                        currIngredientStores[index] === "a" ? "w-[18px] h-[12px]" : 
                        currIngredientStores[index] === "mb" ? "w-[19px] h-[18px]" : 
                        currIngredientStores[index] === "sm" ? "w-[18px] h-[18px]" :
                        currIngredientStores[index] === "ss" ? "w-[16px] h-[18px]" :
                        currIngredientStores[index] === "t" ? "w-[18px] h-[18px]" : 
                        currIngredientStores[index] === "w" ? "w-[18px] h-[18px]" : ""
                      }`}
                    />
                  </View>
                  : null
                  }
                </TouchableOpacity>
              </>
              }
            </View>
          ))}
                  
          {/* empty space at the bottom if the keyboard is open */}
          {(keyboardType === "" && isKeyboardOpen) &&
            <View className="flex flex-row h-[120px]"/>
          }
        </ScrollView>

        {/* TOTAL ROW */}
        <View className="flex flex-row h-[30px] border-t-[0.25px] border-b-[1px] z-20 bg-theme800 w-full">

          {/* details */}
          {selectedSpotlightData !== null &&
          <View className="flex flex-row items-center justify-center w-full border-r bg-theme800">
            
            <View className="flex w-1/5 items-center justify-center">
              <Text className="text-white text-xs italic font-bold">
                TOTALS
              </Text>
            </View>
            
            {/* amounts */}
            <View className="flex flex-row w-4/5 items-center justify-evenly">

              {/* calories */}
              <View>
                {selectedSpotlightData?.spotlightCal ?
                  <Text className="text-white text-xs italic">
                    {selectedSpotlightData.spotlightCal} {"cal"}
                  </Text>
                : 
                  <Text className="text-white text-xs italic">
                    {"0 cal"}
                  </Text> 
                }
              </View>

              {/* price */}
              <View>
                {selectedSpotlightData?.spotlightPrice ?
                  <Text className="text-white text-xs italic">
                    {"$"}{selectedSpotlightData.spotlightPrice}
                  </Text>
                : 
                  <Text className="text-white text-xs italic">
                    {"$0.00"}
                  </Text> 
                }
              </View>

              {/* servings possible */}
              <View>
                {selectedSpotlightData?.spotlightServing ?
                  <Text className="text-white text-xs italic">
                    {selectedSpotlightData.spotlightServing} {"servings"}
                  </Text>
                : 
                  <Text className="text-white text-xs italic">
                    {"0.00 servings"}
                  </Text> 
                }      
              </View>  
            </View>        
          </View>
          }
        </View>
      </View>      

      {/* INGREDIENT FILTERING SECTION */}
      {selectedSpotlightData !== null &&
      <View className="flex flex-row mt-[20px] space-x-2 px-2">

        {/* Left Boxes */}
        <View className="flex flex-col items-center justify-center pr-[5px] ml-[-5px]">
          <View className="flex flex-row border border-zinc900">
          
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
            <View className="flex z-0 w-[120px] bg-zinc700 ">
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
                  ))
                }
              </Picker>
            </View>
          </View>

          {/* Type Picker */}
          <View className="flex w-[150px] z-0 bg-theme200 border border-theme400">
            <Picker
              selectedValue={selectedIngredientType}
              onValueChange={(itemValue) => setSelectedIngredientType(itemValue)}
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
              if (selectedSpotlightId !== null) {
                filterIngredientData(searchIngredientQuery);
                setIngredientDropdownOpen(false);
                setKeyboardType("ingredient search");
                setIsKeyboardOpen(true);
                setRecipeDropdownOpen(false);
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
          {ingredientDropdownOpen && selectedSpotlightId && !isKeyboardOpen && (
            <View className="absolute w-full bottom-[100%] border-x border-t bg-zinc350 rounded-t-[5px] max-h-[200px] z-50">
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
          {(selectedIngredientId !== null && selectedIngredientId !== "") && 
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
          <View className={`flex flex-col space-y-[5px] items-center  rounded bg-zinc300 pb-1 ${(selectedIngredientId !== "" && selectedIngredientId !== null) && "pt-1"}`}>
            
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
            {selectedSpotlightData.ingredientData[selectedIngredientIndex - 1] !== null &&
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
      {isKeyboardOpen && selectedSpotlightId && keyboardType === "ingredient search" &&
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
                <View className="absolute w-full bottom-[100%] border-x border-t bg-zinc350 rounded-t-[5px] max-h-[200px] z-50">
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