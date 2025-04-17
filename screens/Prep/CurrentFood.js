///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useRef, useState, useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';

import { View, Text, ScrollView, TextInput, TouchableOpacity, Keyboard, } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

import DeleteCurrentModal from '../../components/Prep-Currents/DeleteCurrentModal';
import ModPriceModal from '../../components/Prep-Currents/ModPriceModal';
import ViewCurrentModal from '../../components/Prep-Currents/ViewCurrentModal';
import ViewIngredientModal from '../../components/MultiUse/ViewIngredientModal';
import ModCurrentModal from '../../components/Prep-Currents/ModCurrentModal';

import currentAdd from '../../firebase/Currents/currentAdd';
import currentEdit from '../../firebase/Currents/currentEdit';

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
import { getFirestore, doc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

export default function CurrentFood ({ isSelectedTab }) {

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

  // when the tab is changed to CurrentFood
  useEffect(() => {
    if (isSelectedTab) {
      updateIngredients();
      updatePreps();
      loadCurrents();
    }
  }, [isSelectedTab])

  // for screen navigation
  const previousIndexRef = useRef(null);
  const currentIndex = useNavigationState((state) => state.index);

  // if the screen has changed
  useEffect(() => {
    
    // if the page has changed to the current one, refetch the ingredients and current data from the globals
    if (isSelectedTab && previousIndexRef !== null && previousIndexRef.current !== currentIndex && currentIndex === 1) {      
      setTimeout(() => {
        updateIngredients();
        updatePreps();
        loadCurrents();
      }, 1000);
    }

    // updates the ref to the new index
    previousIndexRef.current = currentIndex;
  }, [currentIndex]);


  ///////////////////////////////// GETTING PREP DATA /////////////////////////////////

  // for accessing the preps data
  const [numPreps, setNumPreps] = useState(0);
  const [prepsSnapshot, setPrepsSnapshot] = useState(null);

  // gets the snapshot of preps and calculates the overall number of meal preps
  const updatePreps = async () => {
    const snapshot = await getDocs(collection(db, 'preps'));
    setPrepsSnapshot(snapshot);

    let totalPreps = 0;
    
    // loops over all meal preps
    snapshot.forEach((prepDoc) => {
      const prepData = prepDoc.data();
          
      // adds the current multiplicity if valid
      if (prepData.currentIds && Array.isArray(prepData.currentIds)) {
        totalPreps = totalPreps + prepData.prepMult;
      }
    });

    // stores the calculated value in the state
    setNumPreps(totalPreps);
  };


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

  // gets the list of ingredients
  const updateIngredients = async () => {

    // gets the data
    const snapshot = await getDocs(collection(db, 'ingredients'));
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
    .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));

    // stores it
    setIngredientData(data);
  };

  // when the ingredient data changes, gets the list of types and filters it
  useEffect(() => {

      // sorts the list of types from that data alphabetically
      const ingredientTypeList = [
        { label: "ALL TYPES", value: "ALL TYPES" },
        ...[...new Set(
          ingredientData
            .flatMap(item => item.ingredientType)
            .filter(type => type !== undefined && type !== null)
        )]
          .sort((a, b) => a.localeCompare(b))
          .map(type => ({
            label: type === "" ? "no type" : type, 
            value: type,
          })),
      ];

      setIngredientTypeList(ingredientTypeList);   // sets the list of types
      filterIngredientData(searchIngredientQuery); // filters the ingredient data
      setIngredientDropdownOpen(false);       // closes the dropdown do it isnt open on startup

  }, [ingredientData]);

  // filters the ingredients
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

    // sets the data and shows the dropdown list of ingredients
    setSearchIngredientQuery(ingredientQuery);
    setIngredientDropdownOpen(true);
    setFilteredIngredientData(filtered);
  
    // clears selected ingredient if it doesn't match filtering
    if (filtered.filter((ingredient) => ingredient.ingredientName.toLowerCase() === ingredientQuery.toLowerCase()).length === 0) {
      setSelectedIngredientData(null);
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


  ///////////////////////////////// INGREDIENT LOGIC /////////////////////////////////

  // for the ingredient search textinput
  const [searchIngredientQuery, setSearchIngredientQuery] = useState('');
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [selectedIngredientData, setSelectedIngredientData] = useState(null);


  // for when an ingredient is selected from the dropdown that appears above the textinput
  const pickIngredient = (item) => {
    
    // stores the selection
    setSearchIngredientQuery(item.ingredientName);
    setSelectedIngredientId(item.id);
    setSelectedIngredientData(item);
    
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
    setSelectedIngredientData(null);
    setSelectedIngredientId("");

    // closes the type dropdown
    setIngredientDropdownOpen(false);
  }

  // for when the check button is selected next to the ingredient textinput
  const submitIngredient = async () => {
    
    // if an ingredient has been selected from the search and a recipe is selected
    if (searchIngredientQuery !== "") {
      
      // if submitting an existing ingredient
      if (selectedIngredientId !== "") {

        const stores = ["a", "mb", "sm", "ss", "t", "w"];
        const currStore = "a";

        let nextStore = currStore;
        
        // if a store is not being filtered, calculates the initial store based on the brands that are and are not empty
        if (selectedIngredientStore === "") {

          // loops over the 6 stores to find the next filled in one
          for (let i = 0; i < 6; i++) {
            if (selectedIngredientData[`${stores[(stores.indexOf(currStore) + i) % 6]}${'Brand'}`] !== "") {
              nextStore = stores[(stores.indexOf(currStore) + i) % 6];
              i = 6;
            }
          }
      // otherwise, just use the selected store
      } else {
        nextStore = selectedIngredientStore;
      }

        // adds the current ingredient
        await currentAdd(selectedIngredientId, selectedIngredientData, nextStore);


      // if submitting a new (temporary) ingredient
      } else {
        
        // stores blank data with the name as the query
        const data = ({
          ingredientName: searchIngredientQuery,
          CalServing: "",
          ServingSize: "",
          Unit: "",
        });        
        
        // adds the current ingredient
        await currentAdd(selectedIngredientId, data, "");
      }

      // refreshes current 
      await loadCurrents();
      
      // stores the id of the selected ingredient if valid or the name if not (temp ingredient)
      setNewIds((prevNewIds) => [
        ...prevNewIds, 
        selectedIngredientId !== "" ? selectedIngredientId : searchIngredientQuery
      ]);
        
      // clears the search
      clearIngredientSearch();
      setSelectedIngredientId("");
    }
  }


  ///////////////////////////////// DELETING A CURRENT INGREDIENT /////////////////////////////////

  const [deletingId, setDeletingId] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteChecked, setDeleteChecked] = useState(false);
  const [deleteName, setDeleteName] = useState("");

  // for when the "-" button is selected to delete the current ingredient
  const deleteIngredient = async (index) => {
    setDeletingId(currentIds[index]);
    setDeleteChecked(currentList[index].check);
    setDeleteName(currentList[index].ingredientData.ingredientName);
    setDeleteModalVisible(true);
  }

  // when confirming the deletion of an ingredient
  const confirmDelete = async () => {

    // if a valid ingredient is being deleted
    if (deletingId) {
      setDeleteModalVisible(false);
      setDeleteName("");
      setDeleteChecked(false);
      setDeletingId(null);
    } 

    // refreshes
    await loadCurrents();
  };

  // when canceling the deletion of an ingredient
  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setDeleteName("");
    setDeleteChecked(false);
    setDeletingId(null);
  };


  ///////////////////////////////// CURRENT LISTS /////////////////////////////////

  // for the list of current ingredients
  const [currentList, setCurrentList] = useState([]);
  const [currentIds, setCurrentIds] = useState([]);

  // the store all of the current ingredients
  const loadCurrents = async () => {
    
    // gets all of the current ingredients
    const querySnapshot = await getDocs(collection(db, 'currents'));

    // to store the collected current ingredients
    let allData = [];
    let allIds = [];

    // loops through the recipes and adds all data
    querySnapshot.forEach((doc) => {
      allIds.push(doc.id);
      allData.push(doc.data());
    });

    // combines allData and allIds into a single array of objects
    const combinedData = allData.map((data, index) => ({
      id: allIds[index],
      data: data,
    }));
  
    // sorts the combined array based on ingredientName in allData
    combinedData.sort((a, b) => {
      const nameA = a.data.ingredientData.ingredientName.toLowerCase(); // Convert to lowercase for case-insensitive comparison
      const nameB = b.data.ingredientData.ingredientName.toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0; // return 0 if they are equal
    });
  
    // separates the sorted combinedData back into allData and allIds
    allData = combinedData.map(item => item.data);
    allIds = combinedData.map(item => item.id);

    // stores the collection
    setCurrentIds(allIds);
    setCurrentList(allData);
    setCurrAmountTotals(allData.map((doc) => doc.amountTotal));
    setCurrPrices(allData.map((doc) => doc.unitPrice));
    setCurrStores(allData.map((doc) => doc.ingredientStore));
  }


  ///////////////////////////////// CURRENT AMOUNT TOTALS /////////////////////////////////

  // whether the current list of notes is selected
  const [currAmountTotals, setCurrAmountTotals] = useState([]);

  // to update the list of totals
  const updateTotals = async (newValue, index) => {
    
    // stores the string verstion of the new total
    newValue = newValue.toString();
    
    // stores the value in the state
    setCurrAmountTotals((prevState) => {
      const updatedTotals = [...prevState];
      updatedTotals[index] = newValue;
      return updatedTotals;
    });
    
    // if the new value isn't empty and current amount totals is valid
    if (newValue !== "") {
      if (currAmountTotals !== null) {

        // edit the preexisting current ingredient
        await currentEdit({
          editingId: currentIds[index],
          ingredientId: currentList[index].ingredientId, 
          ingredientData: currentList[index].ingredientData, 
          check: newValue === "0",                              // ingredient checked if used
          containerPrice: currentList[index].containerPrice, 
          amountTotal: newValue, 
          amountLeft: currentList[index].amountLeft, 
          unitPrice: currentList[index].unitPrice, 
          ingredientStore: currentList[index].ingredientStore,
        });
      }

      // recalculate the amount left of the current ingredient
      await calcAmountsLeft(index);
    

    // if the new value is empty
    } else {
      await currentEdit({
        editingId: currentIds[index],
        ingredientId: currentList[index].ingredientId, 
        ingredientData: currentList[index].ingredientData, 
        check: newValue === "0",                              // ingredient checked if used
        containerPrice: currentList[index].containerPrice, 
        amountTotal: newValue, 
        amountLeft: "?", 
        unitPrice: currentList[index].unitPrice, 
        ingredientStore: currentList[index].ingredientStore,
      });      

      // refreshes data
      await loadCurrents();
    }
  };


  ///////////////////////////////// CURRENT AMOUNTS LEFT /////////////////////////////////

  // to calculate the amount left of the given current ingredient
  const calcAmountsLeft = async (index) => {
    
    // gets the current ingredient data
    const currentDocSnap = await getDoc(doc(db, 'currents', currentIds[index]));
    const currentData = currentDocSnap.data();
    
    // stores the current amount total to subtract from if not empty
    let calcAmount = currentData.amountTotal;
    if (calcAmount !== "") {
      
      // loops over all meal preps
      prepsSnapshot.forEach(async (prepDoc) => {
        const prepData = prepDoc.data();

        if (prepData.currentIds && Array.isArray(prepData.currentIds)) {

          // loops over all 12 ingredients and finds the ones that match the current
          for (let i = 0; i < 12; i++) {
            if (prepData.currentIds[i] && prepData.currentIds[i] === currentIds[index] && prepData.currentAmounts[i] !== "") {
              calcAmount = ((new Fractional(calcAmount)).subtract((new Fractional(prepData.currentAmounts[i])).multiply(new Fractional(prepData.prepMult)))).toString();
            }
          }
        }
      });
      
      // updates the data in the current ingredient doc
      await updateDoc(doc(db, "currents", currentIds[index]), { amountLeft: calcAmount.toString() });

      // refreshes data
      await loadCurrents();
    }
  }


  ///////////////////////////////// CURRENT PRICES /////////////////////////////////

  // the current list of prices
  const [currPrices, setCurrPrices] = useState([]);

  // for the price modal
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [priceIndex, setPriceIndex] = useState(0);

  // when the price is selected to edit at the given index
  const changePrice = (index) => {
    setPriceIndex(index);
    setPriceModalVisible(true);
  }

  // to update the list of notes
  const submitPrices = async (newUnitPrice, newContainerPrice) => {

    // sets the current price in the state
    setCurrPrices((prevState) => {
      const updatedPrices = [...prevState];
      updatedPrices[priceIndex] = newUnitPrice;
      return updatedPrices;
    });
    
    // if the list of current prices is valid
    if (currPrices !== null) {

      // edits the current ingredient
      await currentEdit({
        editingId: currentIds[priceIndex],
        ingredientId: currentList[priceIndex].ingredientId, 
        ingredientData: currentList[priceIndex].ingredientData, 
        check: currentList[priceIndex].amountTotal === "0", 
        containerPrice: newContainerPrice, 
        amountTotal: currentList[priceIndex].amountTotal, 
        amountLeft: currentList[priceIndex].amountLeft, 
        unitPrice: newUnitPrice, 
        ingredientStore: currentList[priceIndex].ingredientStore,
      });
    }

    setNewIds((prevNewIds) => [
      ...prevNewIds, 
      currentList[priceIndex].ingredientId !== "" 
        ? currentList[priceIndex].ingredientId 
        : currentList[priceIndex].ingredientData.ingredientName
    ]);
    setPriceIndex(0);

    // reloads the current ingredients
    await loadCurrents();
  };


  ///////////////////////////////// CURRENT STORES /////////////////////////////////

  // whether the current list of notes is selected
  const [currStores, setCurrStores] = useState([]);

  // to update the list of stores
  const updateStores = async (index) => {

    // placeholder for new store
    let newValue = currStores[index];

    // the list of stores
    const stores = ["a", "mb", "sm", "ss", "t", "w"];

    // calculates the next store based on the brands that are and are not empty
    for (let i = 1; i <= 6; i++) {
      if (currentList[index].ingredientData[`${stores[(stores.indexOf(currStores[index]) + i) % 6]}${'Brand'}`] !== "") {
        newValue = stores[(stores.indexOf(currStores[index]) + i) % 6];
        i = 7;
      }
    }

    // sets the new store in the current ingredient's index of the state
    setCurrStores((prevState) => {
      const updatedStores = [...prevState];
      updatedStores[index] = newValue;
      return updatedStores;
    });


    // if the list of current stores is valid
    if (currStores !== null) {

      // edits the current ingredient
      await currentEdit({
        editingId: currentIds[index],
        ingredientId: currentList[index].ingredientId, 
        ingredientData: currentList[index].ingredientData, 
        check: currentList[index].amountTotal === "0", 
        containerPrice: currentList[index].containerPrice, 
        amountTotal: currentList[index].amountTotal, 
        amountLeft: currentList[index].amountLeft, 
        unitPrice: currentList[index].unitPrice, 
        ingredientStore: newValue,
      });

      // reloads the current ingredients
      await loadCurrents();
    }
  };


  ///////////////////////////////// MODIFYING A TEMPORARY CURRENT /////////////////////////////////
  
  const [modModalVisible, setModModalVisible] = useState(false);
  const [currentModId, setCurrentModId] = useState(null);
  const [currentModData, setCurrentModData] = useState(null);

  // when opening the mod modal to edit an already temp current
  const openModIdModal = (currId) => {
    setCurrentModId(currId);
    setCurrentModData(null);
    setModModalVisible(true);
  };

  // when opening the mod modal to edit a non temp current
  const openModDataModal = (index) => {
    const initialData = {
      id: currentIds[index],
      name: currentList[index].ingredientData.ingredientName,
      servingSize: currentList[index].ingredientData[`${currStores[index]}ServingSize`],
      unit: currentList[index].ingredientData[`${currStores[index]}Unit`],
      calServing: currentList[index].ingredientData[`${currStores[index]}CalServing`],
      check: currentList[index].check,
      amountTotal: currentList[index].amountTotal,
      amountLeft: currentList[index].amountLeft,
      unitPrice: currPrices[index],
      containerPrice: currentList[index].containerPrice, 
    }
    
    setCurrentModId(null);
    setCurrentModData(initialData);
    setModModalVisible(true);
  }

  // when closing the mod modal to edit an already temp current
  const closeModModal = async (newId) => {

    // adds the new id (ingredientName) to the list of new ids
    newIds.push(newId);
    setNewIds(newIds);
    
    setCurrentModId(null);
    setCurrentModData(null);
    setModModalVisible(false);
    await loadCurrents(); // reloads settings
  };


  ///////////////////////////////// VIEWING CURRENT /////////////////////////////////

  const [currentModalVisible, setCurrentModalVisible] = useState(false);

  // populated with snapshot
  const [currPrepList, setCurrPrepList] = useState(null);
  const [currAmountList, setCurrAmountList] = useState(null);
  const [currMultList, setCurrMultList] = useState(null);
  
  // when opening the mod modal to view a non temp current
  const openViewDataModal = (index) => {
    const initialData = {
      name: currentList[index].ingredientData.ingredientName,
      servingSize: currentList[index].ingredientData[`${currStores[index]}ServingSize`],
      unit: currentList[index].ingredientData[`${currStores[index]}Unit`],
      calServing: currentList[index].ingredientData[`${currStores[index]}CalServing`],
    }
    
    setCurrentModData(initialData);

    // empty arrays to populate
    const prepList = [];
    const amountList = [];
    const multList = [];
    
    // loops through the recipes and adds all data
    prepsSnapshot.forEach((doc) => {
      for (let i = 0; i < 12; i++) {
        if (doc.data().currentData[i] !== null) {
          const listId = currentList[index].ingredientId === "" ? currentList[index].ingredientData.ingredientName : currentList[index].ingredientId;
          const dataId = doc.data().currentData[i].ingredientId === "" ? doc.data().currentData[i].ingredientData.ingredientName : doc.data().currentData[i].ingredientId;
        
          if (listId=== dataId) {
            prepList.push(doc.data().prepName);
            amountList.push(doc.data().currentAmounts[i] + " " + doc.data().currentData[i].ingredientData[`${doc.data().currentData[i].ingredientStore}Unit`]);
            multList.push(doc.data().prepMult);
          }
        }
      }
    });
    
    setCurrPrepList(prepList);
    setCurrAmountList(amountList);
    setCurrMultList(multList);

    setCurrentModalVisible(true);
  }

  // when closing the mod modal to edit an already temp current
  const closeViewModal = () => {
    setCurrentModId(null);
    setCurrentModData(null);
    setCurrentModalVisible(false);
  };


  ///////////////////////////////// IMPORTING INGREDIENTS FROM SHOPPING LIST /////////////////////////////////

  // the list of recently modified ids
  const [newIds, setNewIds] = useState([]);

  // helper function to retrieve and augment the shopping list data
  const getShoppingListWithStore = async (docPath, storeIdentifier) => {
    
    // gets the current data
    const docSnap = await getDoc(doc(db, "shopping", docPath));                   
    const data = docSnap.exists() ? docSnap.data() : null;

    // adds the store attribute if data and id exist
    if (data && data.id) {
      data.store = Array(data.id.length).fill(storeIdentifier);
    }
    
    return data;
  };
  
  // helper function to merge the lists of store shopping lists
  const mergeShoppingLists = async () => {

    // gets the store shopping lists
    const aData = await getShoppingListWithStore("aList", "a");
    const mbData = await getShoppingListWithStore("mbList", "mb");
    const smData = await getShoppingListWithStore("smList", "sm");
    const ssData = await getShoppingListWithStore("ssList", "ss");
    const tData = await getShoppingListWithStore("tList", "t");
    const wData = await getShoppingListWithStore("wList", "w");
    
    // the array of all shopping lists, stacked on top of each other
    const allData = [aData, mbData, smData, ssData, tData, wData];
    
    // concatenates all the list's keys together
    const mergedList = {
      amountNeeded: allData.map((storeData) => (storeData && storeData.id.length ? storeData.amountNeeded : [])).flat(),
      brand: allData.map((storeData) => (storeData && storeData.id.length ? storeData.brand : [])).flat(),
      check: allData.map((storeData) => (storeData && storeData.id.length ? storeData.check : [])).flat(),
      costTotal: allData.map((storeData) => (storeData && storeData.id.length ? storeData.costTotal : [])).flat(),
      costUnit: allData.map((storeData) => (storeData && storeData.id.length ? storeData.costUnit : [])).flat(),
      id: allData.map((storeData) => (storeData && storeData.id.length ? storeData.id : [])).flat(),
      included: allData.map((storeData) => (storeData && storeData.id.length ? storeData.included : [])).flat(),
      link: allData.map((storeData) => (storeData && storeData.id.length ? storeData.link : [])).flat(),
      name: allData.map((storeData) => (storeData && storeData.id.length ? storeData.name : [])).flat(),
      notes: allData.map((storeData) => (storeData && storeData.id.length ? storeData.notes : [])).flat(),
      store: allData.map((storeData) => (storeData && storeData.id.length ? storeData.store : [])).flat(),
      totalYield: allData.map((storeData) => (storeData && storeData.id.length ? storeData.totalYield : [])).flat(),
      unit: allData.map((storeData) => (storeData && storeData.id.length ? storeData.unit : [])).flat(),
      yieldNeeded: allData.map((storeData) => (storeData && storeData.id.length ? storeData.yieldNeeded : [])).flat()
    };

    return mergedList;
  };


  // to import the list of ingredients from the shopping list
  const importIngredients = async () => {
    
    // the combined shopping list from the helper function
    const combinedData = await mergeShoppingLists();
    
    // gets the list of ingredient IDs from currentList
    const ingredientIds = currentList.map((ingredient) => ingredient.ingredientId);
    const ingredientStores = currentList.map((ingredient) => ingredient.ingredientStore);
    
    // loops over the combined shopping list to find them in the current list of ingredients
    for (let i = 0; i < combinedData.id.length; i++) {
      const index = ingredientIds.indexOf(combinedData.id[i]);
      
      // only imports the ingredients with a needed yield (from spotlights with a mult of > 0) and that are included
      if (combinedData.yieldNeeded[i] !== 0 && new Fractional(combinedData.yieldNeeded[i]).numerator !== undefined && combinedData.included[i]) {

        // if the current ingredient of the combined list is in the current list
        if (index !== -1 && combinedData.store[i] === ingredientStores[index]) {
                 
          // calculate the total amount and amount left using both the current and shopping list amounts
          const amountTotal = ((new Fractional(currentList[index].amountTotal === "" ? "0" : currentList[index].amountTotal)).add(((new Fractional(combinedData.amountNeeded[i])).multiply(new Fractional(combinedData.totalYield[i]))).toString())).toString();
          const amountLeft = ((new Fractional(currentList[index].amountLeft)).add(((new Fractional(combinedData.amountNeeded[i])).multiply(new Fractional(combinedData.totalYield[i]))).toString())).toString();
          
          // edits the current ingredient accordingly
          await currentEdit({
            editingId: currentIds[index],
            ingredientId: currentList[index].ingredientId, 
            ingredientData: currentList[index].ingredientData, 
            check: amountTotal.toString() === "0", 
            containerPrice: currentList[index].containerPrice, 
            amountTotal: amountTotal.toString(), 
            amountLeft: amountLeft.toString(), 
            unitPrice: currentList[index].unitPrice, 
            ingredientStore: currentList[index].ingredientStore,
          });


        // if the current ingredient of the combined list is new (not in the current list)
        } else {   

          // calculate the total amount and amount left based only on the shopping list
          const amountTotal = ((new Fractional(combinedData.amountNeeded[i])).multiply(new Fractional(combinedData.totalYield[i]))).toString();
          const amountLeft = ((new Fractional(combinedData.amountNeeded[i])).multiply(new Fractional(combinedData.totalYield[i]))).toString();
          
          // gets the ingredient data
          const docSnap = await getDoc(doc(db, 'ingredients', combinedData.id[i])); 
          const data = docSnap.exists() ? docSnap.data() : null;
          
          // adds the current ingredient, since it is new
          await currentAdd(combinedData.id[i], data, combinedData.store[i], {
            check: amountTotal.toString() === "0", 
            amountTotal: amountTotal.toString(), 
            amountLeft: amountLeft.toString(), 
            unitPrice: "0.00", 
            containerPrice: "0.00",
          });
        }
      }
    }

    // stores the ids that were changed
    setNewIds(combinedData.id);

    // refreshes data
    await loadCurrents();
  }


  ///////////////////////////////// FILTERING CURRENTS /////////////////////////////////

  const [currentFilter, setCurrentFilter] = useState("square")
  const [filteredIndices, setFilteredIndices] = useState([]);

  // when the box is selected to change filtering, store the next option
  const changeFilter = () => {
    if (currentFilter === "square") {
      setCurrentFilter("checkbox")
    } else if (currentFilter === "checkbox") {
      setCurrentFilter("checkbox-outline")
    } else if (currentFilter === "checkbox-outline") {
      setCurrentFilter("square-outline")
    } else if (currentFilter === "square-outline") {
      setCurrentFilter("warning")
    } else if (currentFilter === "warning") {
      setCurrentFilter("square")
    }
  }

  // update the ingredients that pop up in the filter
  const updateFilter = () => {
    
    // to store the indices that match the filtering
    let matchingIndices = [];

    // loops over the current list
    currentList.forEach((current) => {

      // finds the matching indices based off of the icon
      if (currentFilter === "square" 
          || (currentFilter === "checkbox" && current.check) 
          || (currentFilter === "checkbox-outline" && !current.check && current.amountLeft === "0")
          || (currentFilter === "square-outline" && !current.check && current.amountLeft > "0")
          || (currentFilter === "warning" && !current.check && current.amountLeft < "0")) {
          
        matchingIndices.push(true);
          
      // otherwise, the index doesn't match
      } else {
        matchingIndices.push(false);
      }
    });
    
    // stores the list in the state
    setFilteredIndices(matchingIndices);
  }

  // when the filtering option or list is changed, refilter
  useEffect(() => {
    updateFilter();
  }, [currentFilter, currentList]);


  ///////////////////////////////// VIEWING INGREDIENT /////////////////////////////////

  const [ingredientModalVisible, setIngredientModalVisible] = useState(false);


  ///////////////////////////////// HTML /////////////////////////////////

  return (
    
    // CONTAINER
    <View className="flex-1 items-center justify-center bg-zinc200 border">

      {/* Number of meal preps */}
      <View className="flex justify-center items-center w-5/6 h-[30px] mb-3 bg-zinc400 border rounded-md">
        <Text className="text-[14px] font-bold text-black">
          {numPreps} {"MEAL PREP(S)"}
        </Text>
      </View>

      {/* RECIPE CARD SECTION */}
      <View className="w-11/12 border-[1px] border-black bg-zinc700">

        {/* HEADER ROW */}
        <View className="flex flex-row absolute h-[30px] bg-theme900 border-[1px] border-black z-20">
            
          {/* meal prep filtering button */}
          <View className="flex items-center justify-center w-1/12">
            <Icon
              name={currentFilter}
              size={16}
              color="white"
              onPress={() => changeFilter()}
            />
          </View>

          {/* ingredient header */}
          <View className="flex flex-row  space-x-4 items-center justify-center w-2/5 border-r">
            {/* Text */}
            <Text className="text-white text-xs font-bold">
              INGREDIENT
            </Text>
            {/* Import Button */}
            <Icon
              name="enter"
              size={18}
              color="white"
              onPress={() => importIngredients()}
            />
          </View>

          {/* amount header */}
          <View className="flex items-center justify-center w-[35%] border-r">
            <Text className="text-white text-xs font-bold">
              AMOUNT
            </Text>
          </View>

          {/* unit price header */}
          <View className="flex items-center justify-center w-1/6 border-r">
            <Text className="text-white text-xs font-bold">
              UNIT $
            </Text>
          </View>
        </View>
      
        {/* SCROLLABLE INGREDIENT GRID */}
        <ScrollView
          className="mt-[30px] w-full h-2/3"
          vertical
          scrollEventThrottle={16}
          contentContainerStyle={{ flexDirection: 'row' }}
        >
          <View className="flex flex-col">
            
            {/* Maps over the list of current ingredients */}
            {currentList.length > 0 && currentList.map((curr, index) => (

              // only shows the ones that fit the filtering
              <View key={`curr-${index}`}>
                {filteredIndices[index] ?
                  <View className="flex flex-row h-[50px]">
                    
                    {/* ICONS */}
                    <View className="flex flex-col pt-2 items-center justify-center bg-theme500 w-1/12 border-b border-b-theme900">
                      
                      {/* checkboxes */}
                      <Icon
                        name={curr.check ? "checkbox" : curr.amountLeft === "0" ? "checkbox-outline" : curr.amountLeft < "0" ? "warning" : "square-outline"}
                        color="white"
                        size={15}
                      />

                      {/* delete */}
                      <Icon
                        name="remove"
                        size={15}
                        color="white"
                        onPress={() => deleteIngredient(index)}
                      />
                    </View>

                    {/* Modal that appears to delete a current ingredient */}
                    {deleteModalVisible && (
                      <DeleteCurrentModal
                        id={deletingId}
                        isChecked={deleteChecked}
                        currentName={deleteName}
                        visible={deleteModalVisible}
                        onConfirm={confirmDelete}
                        onCancel={cancelDelete}
                      />
                    )}
                    
                    {/* ingredient names */}
                    <TouchableOpacity 
                      activeOpacity={0.75}
                      onPress={() => openViewDataModal(index)}
                      className={`flex items-start justify-center w-2/5 border-b border-r border-theme900 pl-1 pr-[5px] ${curr.ingredientId === "" && newIds.indexOf(curr.ingredientData.ingredientName) !== -1 ? "bg-zinc500" : newIds.indexOf(curr.ingredientId) === -1 ? "bg-theme600" : "bg-zinc500"}`}
                    >
                      <Text className="text-white text-[12px]">
                        {curr && curr.ingredientData ? curr.ingredientData.ingredientName : ""}
                      </Text>
                    </TouchableOpacity>

                    {/* Modal that appears to view an ingredient */}
                    {currentModalVisible && (
                      <ViewCurrentModal 
                        modalVisible={currentModalVisible} 
                        closeModal={closeViewModal}
                        ingredientData={currentModData}
                        prepList={currPrepList}
                        amountList={currAmountList}
                        multList={currMultList}
                      />
                    )}

                    {/* amount */}
                    <View className={`flex flex-row items-center justify-center bg-white w-[35%] border-b border-b-zinc400 border-r border-r-zinc300 z-20`}>
                      {curr?.ingredientData ?
                        <View className="flex flex-row items-center justify-center">

                          {/* Text */}
                          <View className="flex flex-col items-center justify-center w-full space-y-1 -ml-3">
                            <View className="flex flex-row items-center justify-center space-x-2 mr-[20px]">

                              {/* Amount Total (INPUT) */}
                              <TextInput
                                key={index}
                                className="text-[12px] leading-[15px] text-center"
                                placeholder={curr.amountTotal !== "" ? curr.amountTotal : "_"}
                                placeholderTextColor="black"
                                value={currAmountTotals[index]}
                                onChangeText={(value) => updateTotals(validateFractionInput(value), index)}
                                onBlur={() => updateFilter()}
                              />

                              {/* Amount Left (CALCULATED) */}
                              <Text className={`pl-2 border-l-[1px] border-l-zinc400 text-[12px] 
                                  ${curr.amountLeft !== "" ? (new Fractional(curr.amountLeft).numerator === 0 ? "text-yellow-500" 
                                    : (new Fractional(curr.amountLeft).numerator / (new Fractional(curr.amountLeft).denominator)) < 0 ? "text-pink-500" 
                                    : "text-emerald-500") : "text-white"}`}>
                                {curr.amountLeft}
                              </Text>
                            </View>

                            {/* Unit */}
                            <View className="flex mr-[20px]">
                              <Text className={`text-[12px] ${curr.ingredientData[`${currStores[index]}Unit`] === undefined || curr.ingredientData[`${currStores[index]}Unit`] === "" ? "bg-zinc200" : "bg-white"}`}>
                                {` ${curr.ingredientData[`${currStores[index]}Unit`] === undefined || curr.ingredientData[`${currStores[index]}Unit`] === "" ? "unit(s)" : curr.ingredientData[`${currStores[index]}Unit`]}`}
                              </Text>
                            </View>
                          </View>

                          {/* Store Logo */}
                          <View className="flex justify-start absolute right-0 w-[30px] h-[50px] -mr-2">
                            {currStores[index] === "" ? 
                              <View className="mt-[6.5px] w-full justify-center items-center">
                                <Icon
                                  name="create"
                                  size={18}
                                  color={colors.theme500}
                                  onPress={() => openModIdModal(currentIds[index])}
                                />
                              </View>
                              :
                              <View className="w-full justify-center items-center">
                                <TouchableOpacity 
                                  onPress={() => updateStores(index)} 
                                >
                                  <View className={`${currStores[index] === "a" ? "mt-[10px]" : "mt-[8px]"}`}>
                                    <Image
                                      source={
                                        currStores[index] === "a" ? aldi :
                                        currStores[index] === "mb" ? marketbasket :
                                        currStores[index] === "sm" ? starmarket :
                                        currStores[index] === "ss" ? stopandshop :
                                        currStores[index] === "t" ? target :
                                        currStores[index] === "w" ? walmart :
                                        null
                                      }
                                      alt="store"
                                      className={`${
                                        currStores[index] === "a" ? "w-[15px] h-[10px]" : 
                                        currStores[index] === "mb" ? "w-[15px] h-[14px]" : 
                                        currStores[index] === "sm" ? "w-[15px] h-[15px]" :
                                        currStores[index] === "ss" ? "w-[13px] h-[15px]" :
                                        currStores[index] === "t" ? "w-[15px] h-[15px]" : 
                                        currStores[index] === "w" ? "w-[15px] h-[15px]" : ""
                                      }`}
                                    />
                                  </View>
                                </TouchableOpacity>
                                <Icon 
                                  name="ellipsis-horizontal"
                                  color={colors.zinc500}
                                  size={18}
                                  onPress={() => openModDataModal(index)}
                                />
                              </View>
                            }
                          </View>
                        </View>
                      : null }
                    </View>

                    {/* Modal that appears to edit an ingredient */}
                    {modModalVisible && currentIds[index] && (currentIds[index] === currentModId || currentIds[index] === currentModData?.id) && (
                      <ModCurrentModal 
                        modalVisible={modModalVisible} 
                        closeModal={closeModModal}
                        editingId={currentModId}
                        editingData={currentModData}
                      />
                    )}

                    {/* price */}
                    <TouchableOpacity
                      className="flex flex-row items-center justify-center bg-white w-1/6 border-b border-b-zinc400 border-r border-r-zinc300"
                      onPress={() => changePrice(index)}
                      activeOpacity={0.9}
                    >
                      {/* Amount */}
                      {Array.isArray(currPrices) && currPrices[index] !== "" &&
                        <Text className={`text-[12px] leading-[15px] text-center ${(currPrices[index] === "0.00" || currPrices[index] === "0.0000") ? "bg-zinc200" : "bg-white"}`}>
                          {/* $ or ¢ display */}
                          {currPrices[index] >= 0.01 || currPrices[index] === "0.00" || currPrices[index] === ""
                          ?
                            <Text>{"$"}{currPrices[index]} </Text>
                          :
                            <Text>{(currPrices[index] * 100).toFixed(2)}{"¢"}</Text>
                          }
                        </Text>
                      }
                    </TouchableOpacity>
                  </View>
                : null }
              </View>
            ))}

            {/* empty space at the bottom if the keyboard is open */}
            {(keyboardType === "" && isKeyboardOpen) &&
              <View className="flex flex-row h-[150px]"/>
            }
          </View>
        </ScrollView>   
      </View>

      {/* MODIFY PRICE MODAL */}
      <ModPriceModal
        modalVisible={priceModalVisible}
        setModalVisible={setPriceModalVisible}
        closeModal={submitPrices}
        currentPrice={currPrices[priceIndex]}
        currentData={currentList[priceIndex]}
        currentStore={currStores[priceIndex]}
      />
      
      {/* INGREDIENT FILTERING SECTION */}
      <View className="flex flex-row mt-[20px] space-x-4">

        {/* Left Boxes */}
        <View className="flex flex-col items-center justify-center">
        
          {/* Ingredient Addition Info */}
          <View className="flex flex-row z-0 w-[160px] h-[30px] space-x-2 justify-center items-center bg-zinc700 border border-zinc900">
            
            {/* Current Ingredient Number */}
            <Text className="font-bold text-zinc100 text-[12px]">
              INGREDIENT {currentList.length + 1}
            </Text>

            {/* Submit */}
            <Icon
              name="checkmark-circle"
              size={17}
              color={colors.zinc100}
              onPress={() => submitIngredient()}
            />
          </View>
        
          {/* Bottom Row */}
          <View className="flex w-[160px] flex-row z-0 border border-theme400">
            
            {/* store selection */}
            <TouchableOpacity 
              className="z-10 w-[30px] bg-zinc100 border-2 border-theme200 justify-center items-center"
              onPress={() => changeSelectedStore()}
            >
              {selectedIngredientStore === "" 
              ? // when no store is selected
              <Icon
                name="menu"
                size={20}
                color={colors.theme600}
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
            
            {/* type picker */}
            <View className="flex z-0 w-[130px] bg-theme200">
              <Picker
                selectedValue={selectedIngredientType}
                onValueChange={(itemValue) => setSelectedIngredientType(itemValue)}
                style={{ height: 30, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -20, }}
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
        </View>

        {/* Ingredient Search */}
        <View className="flex flex-row w-[45%] h-[70px]">
                
          {/* MOCK text input */}
          <TouchableOpacity 
            className="flex w-full h-full"
            onPress={() => { 
              filterIngredientData(searchIngredientQuery);
              setIngredientDropdownOpen(false);
              setKeyboardType("ingredient search");
              setIsKeyboardOpen(true);
            }}
          >
            <Text
              multiline={true}
              className={`${searchIngredientQuery !== '' && searchIngredientQuery !== "" ? "text-black" : "text-zinc400"} ${ingredientDropdownOpen ? "rounded-b-[5px]" : "rounded-[5px]"} flex-1 bg-white border-[1px] border-zinc300 px-[10px] py-[5px] text-[14px] leading-[16px]`}
            >
              {searchIngredientQuery !== '' && searchIngredientQuery !== "" ? searchIngredientQuery : "search for ingredient"}
            </Text>
          </TouchableOpacity>


          {/* Ingredient Dropdown */}
          {ingredientDropdownOpen && !isKeyboardOpen && (
            <View className="absolute w-full bottom-[100%] border-x border-t bg-zinc350 rounded-t-[5px] max-h-[200px] z-50">
              <ScrollView>
                {filteredIngredientData.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {pickIngredient(item)}}
                    className={`p-2.5 ${index === 0 && "rounded-t-[5px]"} ${item.ingredientName === selectedIngredientData?.ingredientName && "bg-zinc400"} ${index < filteredIngredientData.length - 1 && "border-b-[1px] border-zinc400"}`}
                  >
                    {/* name */}
                    <Text className="text-[13px] mr-4">
                      {item.ingredientName}
                    </Text>

                    {/* selected indicator */}
                    {item.ingredientName === selectedIngredientData?.ingredientName &&
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
          {selectedIngredientData !== null &&
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
          <View className="absolute right-0 bottom-0 flex flex-row">
          
            <View className="flex flex-row space-x-[-5px] ">
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

              {/* Drop Down */}
              <Icon
                name="chevron-down-outline"
                size={20}
                color="black"
                onPress={() => setIngredientDropdownOpen(false)}
              />
            </View>

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


      {/* KEYBOARD POPUP SECTION */}
      {isKeyboardOpen && keyboardType === "ingredient search" &&
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
                        className={`p-2.5 ${index === 0 && "rounded-t-[5px]"} ${item.ingredientName === selectedIngredientData?.ingredientName && "bg-zinc400"} ${index < filteredIngredientData.length - 1 && "border-b-[1px] border-zinc400"}`}
                      >
                        {/* name */}
                        <Text className="text-[13px] mr-4">
                          {item.ingredientName}
                        </Text>

                        {/* selected indicator */}
                        {item.ingredientName === selectedIngredientData?.ingredientName &&
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