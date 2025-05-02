///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useRef, useState, useEffect } from 'react';
import { useNavigation, useNavigationState } from '@react-navigation/native';

import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

import { View, Text, TextInput, TouchableOpacity, Keyboard, ScrollView, } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Picker } from '@react-native-picker/picker';

import { prepDelete } from '../../firebase/Prep/prepDelete';
import { allIngredientFetch } from '../../firebase/Ingredients/allIngredientFetch';

import CalcIngredientModal from '../../components/MultiUse/CalcIngredientModal';
import ModMealModal from '../../components/MultiUse/ModMealModal';
import DeletePrepModal from '../../components/Prep-Meals/DeletePrepModal';
import AmountsDetailsModal from '../../components/Prep-Meals/AmountsDetailsModal';
import AddPrepModal from '../../components/Prep-Meals/AddPrepModal';
import PrepToRecipeModal from '../../components/Prep-Meals/PrepToRecipeModal';

// Fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';
import validateFractionInput from '../../components/Validation/validateFractionInput';

import extractUnit from '../../components/Validation/extractUnit';

// initialize Firebase App
import { getFirestore, doc, updateDoc, collection, getDocs, getDoc, writeBatch } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

export default function MealPrep ({ isSelectedTab }) {

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  
  // keyboard listener
  useEffect(() => {

    // listens for keyboard show event
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setIsKeyboardOpen(true);
    });

    // listens for keyboard hide event
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardOpen(false);
    });

    // cleans up listeners on unmount
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  

  ///////////////////////////////// NAVIGATION LOGIC /////////////////////////////////

  // if the tab has changed, refresh the data from the globals
  useEffect(() => {
    if (isSelectedTab) {
      updateCurrents();
      refreshPreps();
      fetchGlobalPrep();
    }
  }, [isSelectedTab])

  const previousIndexRef = useRef(null);
  const currentIndex = useNavigationState((state) => state.index);

  // if the screen has changed
  useEffect(() => {
    
    // if the page has changed to the current one, refetch the current data from the globals
    if (isSelectedTab && previousIndexRef !== null && previousIndexRef.current !== currentIndex && currentIndex === 1) {
      setTimeout(() => {
        updateCurrents();
        fetchIngredientsAndRecipes();
        refreshPreps();
        fetchGlobalPrep();
      }, 1000);
    }

    // updates the ref to the new index
    previousIndexRef.current = currentIndex;
  }, [currentIndex]);


  ///////////////////////////////// GETTING MEAL PREP DATA /////////////////////////////////

  // for the overall meal prep list
  const [prepList, setPrepList] = useState([]);

  // for meal prep dropdown
  const [selectedPrepId, setSelectedPrepId] = useState(null); 
  const [selectedPrepData, setSelectedPrepData] = useState(null); 
  const [prepDropdownOpen, setPrepDropdownOpen] = useState(false);
  

  // closes other dropdowns when ingredient search dropdown is open
  useEffect(() => {

    // only does so on opening, not closing
    if (prepDropdownOpen) {
      setCurrentDropdownOpen(false);
    }
  }, [prepDropdownOpen]);
  
  
  // gets the meal prep document data from the globals collection
  const fetchGlobalPrep = async () => {
    
    try {

      // gets the global meal prep document
      const globalDoc = (await getDoc(doc(db, 'globals', 'prep')));
      if (globalDoc.exists()) {

        let prepId = globalDoc.data().id;
        if (prepId) {

          // gets the recipe data
          const prepDoc = (await getDoc(doc(db, 'preps', prepId)));
          if (prepDoc.exists()) {
            let data = prepDoc.data();
            
            // loops over the 12 ingredients backwards to find the first empty one
            for (let i = 11; i >= 0; i--) {
              if (!data.currentData[i]) {
                setSelectedCurrentIndex(i + 1);
              }
            }

            // sets the id and data in the state
            setSelectedPrepId(prepId);
            setSelectedPrepData(data);

            // sets the note
            setSelectedNote(data ? data.prepNote : "");

            // updates the amounts of each current ingredient left
            updateEnoughLeft(data);
            
            // sets the current amounts and multiplicities
            setCurrCurrentAmounts(data.currentAmounts);
            setCurrPrepMult(data.prepMult);
          }

        // otherwise, store default values
        } else {

          // sets the id and data in the state
          setSelectedPrepId(null);
          setSelectedPrepData(null);

          setCurrCurrentAmounts(["", "", "", "", "", "", "", "", "", "", "", ""]);
          setCurrPrepMult(0);
          setSelectedCurrentIndex(1);
        }

        // reload settings
        reloadPrep(prepId);
      }
      
    } catch (error) {
      console.error('Error fetching meal prep document:', error);
    }
  };

  // to change the data of the prep document under the global collection
  const reloadPrep = async (selectedPrepId) => {
    
    // as long as a recipe was collected
    if (selectedPrepId) {
      
      // stores the prep data in the firebase
      updateDoc(doc(db, 'globals', 'prep'), { id: selectedPrepId });

      // gets the current data
      const docSnap = await getDoc(doc(db, 'preps', selectedPrepId));
      const data = docSnap.exists() ? docSnap.data() : null;
      
      // sets the current prep card placeholders
      setCurrCurrentAmounts(data.currentAmounts);
      setCurrPrepMult(data.prepMult);
      setSelectedNote(data.prepNote);
        
      // if there are amounts of ingredients, update them
      if (data.currentAmounts) {
        
        // calculate the details and totals
        let calcData = calcAmounts(data);
        
        // loops over the 12 ingredients backwards to find the first empty one
        for (let i = 11; i >= 0; i--) {
          if (!calcData.currentData[i]) {
            setSelectedCurrentIndex(i + 1);
          }
        }

        // updates the amounts of each current ingredient that are left
        updateEnoughLeft(calcData);

        // updates the collection data
        await updateDoc(doc(db, 'preps', selectedPrepId), calcData);
    
        // updates the selected data
        setSelectedPrepData({ ...calcData });
      }
    }
  }
  
  // fetches the data of the selected prep when the selected prep changes
  useEffect(() => {
    if (isSelectedTab) {
      reloadPrep(selectedPrepId);
    }
  }, [selectedPrepId]);


  // helper function to refresh the list of preps
  const refreshPreps = async () => {

    // gets the collection of meal preps
    const querySnapshot = await getDocs(collection(db, 'preps'));

    // reformats each one
    const prepsArray = querySnapshot.docs.map((doc) => {
      const formattedPrep = {
        id: doc.id,
        ... doc.data(),
      };
      return formattedPrep;
    })
    .sort((a, b) => a.prepName.localeCompare(b.prepName)); // sorts by prepName alphabetically

    setPrepList(prepsArray);
  };


  ///////////////////////////////// MEAL PREP MULTIPLICITY /////////////////////////////////

  const [currPrepMult, setCurrPrepMult] = useState(0);

  // to handle an updated multiplicity in the textinput
  const updateMult = async (text) => {
    
    // if a meal prep is selected
    if (selectedPrepData) {

      // updates the text only if its a whole number
      if (/^\d*$/.test(text) && !isNaN(text)) { 
        setCurrPrepMult(Number(text));
        selectedPrepData.prepMult = Number(text); // stores the new multiplicity
      }

    // if a meal prep is not selected
    } else {
      setCurrPrepMult(0);
      selectedPrepData.prepMult = 0; // stores the new multiplicity
    }
    
    // stores the meal prep data
    updateDoc(doc(db, 'preps', selectedPrepId), selectedPrepData);
    setSelectedPrepData(selectedPrepData);
    
    // calculates the amounts that are left of all current ingredients
    await calcAllAmountsLeft();
  }

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingName, setDeletingName] = useState("");

  // when the double check button is selected next to the multiplicity
  const decreaseMult = async () => {

    // current meal prep
    const decMult = selectedPrepData.prepMult - 1;
    
    // if the current multiplicity is positive
    if (decMult >= 0) {
      selectedPrepData.prepMult = decMult;

      // stores the multiplicity in the state
      setCurrPrepMult(decMult);

      // stores the meal prep data in the firebase
      updateDoc(doc(db, 'preps', selectedPrepId), selectedPrepData);

      // calculates both the amounts left and total for all current ingredients
      await calcCurrAmountsTotal(false);

      // when a meal prep is finished, open a popup asking if you want the prep to be deleted
      if (decMult === 0) {
        setDeletingId(selectedPrepId);
        setDeletingName(selectedPrepData.prepName);
        setDeleteModalVisible(true);
      }
    }
  }

  // when choosing to save a meal prep
  const confirmSave = async () => {
    setDeleteAfterSave(false);
    setTimeout(setDeleteModalVisible(false), 1000);
    setTimeout(setRecipeModalVisible(true), 1000);
  };

  // when confirming the deletion of a meal prep
  const confirmDelete = async () => {

    // if a valid ingredient is being deleted
    if (deletingId) {
      prepDelete(deletingId);

      setDeleteModalVisible(false);
      setDeletingName("");
      setDeletingId(null);

      // clears data
      setSelectedPrepData(null);
      setSelectedPrepId(null);

      // reload settings if the modal wasn't canceled
      refreshPreps();

      // resets variables to default
      setCurrCurrentAmounts([ "", "", "", "", "", "", "", "", "", "", "", "" ]);
      setCurrPrepMult(0);
      setSelectedCurrentIndex(1);
      setSelectedNote("");

      // stores that there is enough of each current ingredient
      setCurrEnoughLeft([true, true, true, true, true, true, true, true, true, true, true, true]);
      setCurrMoreLeft([true, true, true, true, true, true, true, true, true, true, true, true]);
    }
  };

  const [deleteAfterSave, setDeleteAfterSave] = useState(false);

  // when confirming the deleting and saving of a meal prep
  const confirmSaveDelete = async () => {
    setDeleteAfterSave(true);
    setTimeout(setDeleteModalVisible(false), 1000);
    setTimeout(setRecipeModalVisible(true), 1000);
  }

  // when canceling the deletion of a meal prep
  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setDeletingName("");
    setDeletingId(null);
  };

  // when clicking the "+" button to add back a meal prep
  const addBackPrep = async () => {

    // new incremented amount
    const incMult = selectedPrepData.prepMult + 1;

    // current meal prep
    selectedPrepData.prepMult = incMult;

    // stores the multiplicity in the state
    setCurrPrepMult(incMult);

    // stores the meal prep data in the firebase
    updateDoc(doc(db, 'preps', selectedPrepId), selectedPrepData);

    // calculates both the amounts left and total for all current ingredients
    await calcCurrAmountsTotal(true);
  }
  

  ///////////////////////////////// INGREDIENT AMOUNT LOGIC /////////////////////////////////

  // for the placeholders of the amount textinputs
  const [currCurrentAmounts, setCurrCurrentAmounts] = useState(["", "", "", "", "", "", "", "", "", "", "", ""]);

  // to store the entered amount in the current ingredient's data if it is valid
  const setAmount = async (value, index) => {
    
    // if the meal prep data and required fields and valid
    if (selectedPrepData && selectedPrepData.currentData) {
      
      // general variables
      const current = selectedPrepData.currentData[index];
      const storeKey = selectedPrepData.currentData[index].ingredientStore;
      const brandKey = `${storeKey}Brand`;
      
      // checks if the brand is valid, meaning the current ingredient has data
      if (current && ((storeKey !== "" && current.ingredientData.brandKey !== "") || storeKey === "")) {
    
        // updates the current ingredient amounts
        setCurrCurrentAmounts((prev) => {
          const updated = [...prev];
          updated[index] = value;
          return updated;
        });

        // stores the current ingredient amount and calculates the details and totals
        selectedPrepData.currentAmounts[index] = value;
        let calcData = calcAmounts(selectedPrepData);

        // updates the amount left and more
        updateEnoughLeft(calcData);
        
        // stores the meal prep data in the firebase
        updateDoc(doc(db, 'preps', selectedPrepId), calcData);
    
        // updates the selected prep's data
        setSelectedPrepData(calcData);
      }
    }

    // calculates both the amount left for each current ingredient
    await calcAllAmountsLeft();
  };  

  
  // to calculate each of the ingredient's details, and the totals at the bottom
  const calcAmounts = (data) => {
    
    // running totals
    let totalCal = 0;
    let totalPrice = 0;
    
    // loops over the list of all ingredients
    data.currentAmounts.forEach((value, index) => {
      
      // if the current ingredient data exists
      if (data.currentData[index]) {

        // general variables
        const current = data.currentData[index];
        const storeKey = data.currentData[index].ingredientStore;
        
        // fractional calculations
        const amount = new Fractional(value);
        const servings = storeKey !== "" ? new Fractional(current.ingredientData[`${storeKey}TotalYield`]) : new Fractional(current.ingredientData.ServingSize);
        const cals = storeKey !== "" ? new Fractional(current.ingredientData[`${storeKey}CalContainer`]) : new Fractional(current.ingredientData.CalServing);
        const priceUnit = new Fractional(current.unitPrice);
        
        // invalid (1)
        if (value === "") {
          data.currentAmounts[index] = "";
          data.currentCals[index] = 0;
          data.currentPrices[index] = 0.00;
        
        // invalid (2)
        } else if (value === "0") {
          data.currentAmounts[index] = "0";
          data.currentCals[index] = 0;
          data.currentPrices[index] = 0.00;
          
        // validates the fractional value
        } else if (amount !== 0 && !isNaN(amount.numerator) && !isNaN(amount.denominator) && amount.denominator !== 0) {

          data.currentAmounts[index] = value;
          
          // calculate calories if the arguments are valid
          if (!isNaN((new Fraction(servings.toString())) * 1) && !isNaN((new Fraction(cals.toString())) * 1)) {
          
            // individual
            data.currentCals[index] = new Fraction(amount.divide(servings).multiply(cals).toString()) * 1;
          
            // overall
            totalCal = (new Fractional(totalCal)).add(amount.divide(servings).multiply(cals)).toString();

          // set individual calories to 0 if arguments are not valid
          } else {
            data.currentCals[index] = new Fraction(0) * 1;
          }

          // calculates prices if the arguments are valid
          if (!isNaN((new Fraction(priceUnit.toString())) * 1)) {
          
            // individual
            data.currentPrices[index] = new Fraction(amount.multiply(priceUnit).toString()) * 1;

            // overall
            totalPrice = (new Fractional(totalPrice)).add(amount.multiply(priceUnit)).toString();

          // set individual prices to 0 if arguments are not valid
          } else {
            data.currentPrices[index] = new Fraction(0) * 1;
          }
          
        // if the amount is not valid
        } else {
          data.currentAmounts[index] = "";
          data.currentCals[index] = "";
          data.currentPrices[index] = "";
        }
      }
    });
    
    // stores the rounded versions of the calories and price
    data.prepCal = ((new Fraction(totalCal.toString())) * 1).toFixed(0);
    data.prepPrice = ((new Fraction(totalPrice.toString())) * 1).toFixed(2);

    // returns the data for use of other functions
    return data;
  }

  // to calculate each of the ingredient's total amounts
  const calcCurrAmountsTotal = async (incrementing) => {
    
    // creates a batch for the updates
    const batch = writeBatch(db);
    
    // loops over the valid selected meal prep's current ingredients
    for (let index = 0; index < selectedPrepData.currentData.length; index++) {
      if (selectedPrepData.currentData[index] && currChecks[index]) {
        
        // the data from the selected meal prep
        const data = selectedPrepData.currentData[index];
        const total = data.amountTotal;                               // the current total
        const amount = selectedPrepData.currentAmounts[index];        // the current amount listed in the meal prep

        // recalculates the total and remaining amounts
        if (data && total !== "" && amount !== "") {
          
          const calcAmountTotal = incrementing ? ((new Fractional(total)).add(new Fractional(amount))).toString() : ((new Fractional(total)).subtract(new Fractional(amount))).toString();

          // updates the data in the current ingredient doc within the batch
          batch.update(doc(db, 'currents', selectedPrepData.currentIds[index]), {
            check: calcAmountTotal.toString() === "0",
            amountTotal: calcAmountTotal.toString(),
          });
        }
      }
    }

    // commits the batch once all updates are added
    await batch.commit();

    // updates the list of currents and whether there is enough of a current ingredient
    updateCurrents();
    updateEnoughLeft(selectedPrepData);
  }

  // to calculate the amount left of every current ingredient
  const calcAllAmountsLeft = async () => {
    
    // creates a batch for updates
    const batch = writeBatch(db);

    // gets all meal prep data
    const prepsSnapshot = await getDocs(collection(db, 'preps'));

    // loops over all current ingredients
    currentsSnapshot.forEach(async (currentDoc) => {

      // gets the current ingredient data
      const currentData = currentDoc.data();
      const currentId = currentDoc.id;

      let calcAmount = currentData.amountTotal;
      if (calcAmount !== "") {

        // loops over all meal preps
        prepsSnapshot.forEach(async (prepDoc) => {
          const prepData = prepDoc.data();

          if (prepData.currentIds && Array.isArray(prepData.currentIds)) {

            // loops over all 12 ingredients and finds the ones that match the current
            for (let i = 0; i < 12; i++) {
              if (prepData.currentIds[i] && prepData.currentIds[i] === currentId && prepData.currentAmounts[i] !== "") {
                calcAmount = ((new Fractional(calcAmount)).subtract((new Fractional(prepData.currentAmounts[i])).multiply(new Fractional(prepData.prepMult)))).toString();
              }
            }
          }
        });

        // adds the update to the batch for amountLeft if the amount has been changed
        if (currentData.amountLeft !== calcAmount.toString()) {
          batch.update(doc(db, 'currents', currentId), { amountLeft: calcAmount.toString() });
        }
      }
    });

    // commits the batch after all updates have been added
    await batch.commit();

    // updates whether there is enough of each current ingredient left of the selected meal prep
    updateEnoughLeft(selectedPrepData);
    updateCurrents();
  };
    

  ///////////////////////////////// AMOUNTS LEFT CALCULATIONS /////////////////////////////////
  
  // stores whether there is more than 0 of the current ingredient left
  const [currEnoughLeft, setCurrEnoughLeft] = useState([true, true, true, true, true, true, true, true, true, true, true, true]);
  const [currMoreLeft, setCurrMoreLeft] = useState([true, true, true, true, true, true, true, true, true, true, true, true]);
  
  // to update the state storing whether there is enough of each left
  const updateEnoughLeft = async (prepData) => {
    
    // the default values
    let enough = [true, true, true, true, true, true, true, true, true, true, true, true];
    let more = [true, true, true, true, true, true, true, true, true, true, true, true];
    
    // loops over the 12 current ingredients (if valid)
    for (let index = 0; index < 12; index++) {
      
      // if the current index has data and the multiplicity is not 0
      if (prepData.currentData[index] && prepData.prepMult !== 0) {
        
        // gets the current ingredient data
        const currentDocSnap = await getDoc(doc(db, 'currents', prepData.currentIds[index]));
        const currentData = currentDocSnap.data();
        
        // determines whether there is enough left
        if (currentData.amountLeft < "0") {
          enough[index] = false;
        }
        
        // determines whether there is more left
        if (currentData.amountLeft === "0") {
          more[index] = false;
        }
      }
    }
    
    // stores the state data
    setCurrEnoughLeft(enough);
    setCurrMoreLeft(more);
  }


  ///////////////////////////////// NOTES LOGIC /////////////////////////////////

  // whether the current list of checkboxes is selected
  const [selectedNote, setSelectedNote] = useState("");

  // when the note box is exited, update the corresponding global document
  const dbNote = () => {
    if (selectedPrepId) {
      Keyboard.dismiss();
      updateDoc(doc(db, 'preps', selectedPrepId), { prepNote: selectedNote });
    }
  }

  // when the x button is pressed
  const clearNote = () => {
    if (selectedPrepId) {
      setSelectedNote("");
      updateDoc(doc(db, 'preps', selectedPrepId), { prepNote: "" });
    }
  }


  ///////////////////////////////// NEW MEAL PREP /////////////////////////////////

  const [newModalVisible, setNewModalVisible] = useState(false);
  const [numPreps, setNumPreps] = useState(0);

  // to open the new meal prep modal
  const openNewPrep = () => {
    setNumPreps(prepList.length);
    setNewModalVisible(true);
  }

  // to submit a new meal prep
  const submitNewPrep = async (docId, prepData) => {

    // stores the data
    setSelectedPrepData(prepData);
    setSelectedPrepId(docId);
    setCurrCurrentAmounts(prepData.currentAmounts);
    setCurrPrepMult(prepData.prepMult);
    setSelectedNote("");

    // reload settings
    refreshPreps();
    await calcAllAmountsLeft();
  }


  ///////////////////////////////// MOD MEAL PREP /////////////////////////////////

  const [modModalVisible, setModModalVisible] = useState(false);

  // if the edit prep modal is opened/closed
  useEffect(() => {

    // if it is opened but the selected id is not valid, close it
    if (modModalVisible) {
      if (!selectedPrepId) {
        setModModalVisible(false);
      }
    }
  }, [modModalVisible]);

  // when closing the mod modal to edit
  const closeModModal = async (type) => {
    setModModalVisible(false);

    // reload settings if the modal wasn't canceled
    if (type !== "") {
      refreshPreps();
      setSelectedNote(selectedPrepData ? selectedPrepData.prepNote : "");
    }
          
    // if the meal prep was deleted
    if (type === "delete") {

      // resets variables to default
      setCurrCurrentAmounts([ "", "", "", "", "", "", "", "", "", "", "", "" ]);
      setCurrPrepMult(0);
      setSelectedCurrentIndex(1);
      setSelectedNote("");

      // calculates amounts
      calcAllAmountsLeft();

      // stores that there is enough of each current ingredient
      setCurrEnoughLeft([true, true, true, true, true, true, true, true, true, true, true, true]);
      setCurrMoreLeft([true, true, true, true, true, true, true, true, true, true, true, true]);
    }
  };
    

  ///////////////////////////////// CURRENT CHECKBOX LOGIC /////////////////////////////////

  const [currChecks, setCurrChecks] = useState([true, true, true, true, true, true, true, true, true, true, true, true]);

  // updates the list of checkboxes when a new prep is selected
  useEffect(() => {
    setCurrChecks([true, true, true, true, true, true, true, true, true, true, true, true]);
  }, [selectedPrepId]);

  // updates the check at the given index
  const updateCheck = (index) => {
    
    // the new value is the opposite of the old
    const newValue = !currChecks[index];

    setCurrChecks((prev) => {
      const updated = [...prev];
      updated[index] = newValue;
      return updated;
    });
  }

  const [currPrepCal, setCurrPrepCal] = useState("");
  const [currPrepPrice, setCurrPrepPrice] = useState("");

  // updates the prepCal and prepPrice
  useEffect(() => {
    if (selectedPrepData !== null) {
      let totalCal = 0;
      let totalPrice = 0;

      // loops over the checks to only add checked data
      for (let i = 0; i < 12; i++) {
        if (currChecks[i]) {
          totalCal += selectedPrepData.currentCals[i] * 1;
          totalPrice += selectedPrepData.currentPrices[i] * 1;
        }
      }

      // stores totals
      setCurrPrepCal((new Fraction(totalCal) * 1).toFixed(0));
      setCurrPrepPrice((new Fraction(totalPrice) * 1).toFixed(2));
    }
  }, [currChecks, currCurrentAmounts, selectedPrepData]);


  ///////////////////////////////// GETTING CURRENT INGREDIENT DATA /////////////////////////////////

  // for the full current ingredient data
  const [currentData, setCurrentData] = useState([]);
  const [currentsSnapshot, setCurrentsSnapshot] = useState(null);

  // for current ingredient dropdown
  const [currentDropdownOpen, setCurrentDropdownOpen] = useState(false);
  
  // closes other dropdowns when the current ingredient search dropdown is open
  useEffect(() => {

    // only does so on opening, not closing
    if (currentDropdownOpen) {
      setPrepDropdownOpen(false);
    }
  }, [currentDropdownOpen]);


  // updates the current list of current ingredients
  const updateCurrents = async () => {

    // gets the collection of current ingredients
    const querySnapshot = await getDocs(collection(db, 'currents'));
    const currents = querySnapshot.docs.map((doc) => {
      const formattedCurrent = {
        id: doc.id,
        ... doc.data()
      }
      return formattedCurrent;
    })
    .sort((a, b) => a.ingredientData.ingredientName.localeCompare(b.ingredientData.ingredientName)); // sort by ingredientName alphabetically

    setCurrentData(currents);
    filterOptions(currents);
    setCurrentsSnapshot(querySnapshot);
  }
  
  // when current data is changed, update the firebase collections
  const updatePrepCurrents = async () => {
    
    // loops over the list of current ingredients (if valid)
    for (var i = 0; i < 12; i++) {
      if (selectedPrepData.currentIds[i] && selectedPrepData.currentIds[i] !== "") {
        
        // gets the data
        const docRef = doc(db, 'currents', selectedPrepData.currentIds[i]);
        const docSnap = await getDoc(docRef);

        // if the current ingredient still exists, set the data
        if (docSnap.exists()) {
          selectedPrepData.currentData[i] = docSnap.data();
        
        // if it no longer does, reset the data and other attributes
        } else {
          selectedPrepData.currentAmounts[i] = "";
          selectedPrepData.currentCals[i] = "";
          selectedPrepData.currentData[i] = null;
          selectedPrepData.currentIds[i] = "";
          selectedPrepData.currentPrices[i] = "";
        }
      }
    }
    
    // calculates the details and totals
    let calcData = calcAmounts(selectedPrepData);

    // updates the amount left and more
    updateEnoughLeft(calcData);
    
    // updates the collections in firebase
    await updateDoc(doc(db, 'preps', selectedPrepId), calcData);

    // updates the selected meal prep's data
    setSelectedPrepData({ ...calcData });
    setCurrCurrentAmounts(selectedPrepData.currentAmounts);
  }

  // when the current ingredient data is updated, update the meal prep data
  useEffect(() => {
    updatePrepCurrents();
  }, [currentData]);
  

  ///////////////////////////////// CURRENT INGREDIENT SEARCH LOGIC /////////////////////////////////

  // for the current ingredient index picker
  const [selectedCurrentIndex, setSelectedCurrentIndex] = useState(1);

  // for the current option picker
  const [selectedOption, setSelectedOption] = useState("ALL");
  const [filteredCurrentData, setFilteredCurrentData] = useState([]);

  // to filter the currents when the option is changed
  const filterOptions = async (currents) => {

    let filtered = currents;
    
    // filters by option
    if (selectedOption === "REMAINING") {
      filtered = filtered.filter(current => current.amountLeft > "0");
    } else if (selectedOption === "USED") {
      filtered = filtered.filter(current => current.amountLeft <= "0");
    }

    // filters out the archived data
    filtered = filtered.filter(current => !current.archive)

    setFilteredCurrentData(filtered);
  }

  // calls the previous function when the option picker is changed
  useEffect(() => {
    filterOptions(currentData);
  }, [selectedOption]);

  // for the current ingredient search dropdown
  const [selectedCurrentId, setSelectedCurrentId] = useState("");

  // for when the "x" button is selected in the ingredient textinput
  const clearCurrentSearch = () => {
    setSelectedCurrentId(""); // resets the search filtering
    setCurrentDropdownOpen(false);  // closes the type dropdown
  }

  // for when the check button is selected next to the ingredient textinput
  const submitCurrent = async () => {

    // if an ingredient has been selected from the search and a meal prep is selected
    if (selectedCurrentId !== "" && selectedPrepId) {
      
      // gets the data of the current ingredient with the given id
      const docSnap = await getDoc(doc(db, 'currents', selectedCurrentId)); 
      const data = docSnap.exists() ? docSnap.data() : null;
      
      // sets the ingredient's data to be default
      selectedPrepData.currentIds[selectedCurrentIndex - 1] = selectedCurrentId;
      selectedPrepData.currentData[selectedCurrentIndex - 1] = data;

      // calculates the details and totals
      let calcData = calcAmounts(selectedPrepData);
          
      // loops over the 12 ingredients backwards to find the first empty one
      for (let i = 11; i >= 0; i--) {
        if (!calcData.currentData[i]) {
          setSelectedCurrentIndex(i + 1);
        }
      }

      // updates the amount left and more
      updateEnoughLeft(calcData);

      // stores the meal prep data in the firebase
      await updateDoc(doc(db, 'preps', selectedPrepId), calcData);

      // updates the selected meal prep's data
      setSelectedPrepData({ ...calcData });
      
      // clears the search
      clearCurrentSearch();
    
      // calculates the amounts that are left of all current ingredients
      await calcAllAmountsLeft();
    }
  }

  // for when the collapse (isCollapsing) or expand (!isCollapsing) buttons are selected next to the ingredient textinput
  const collapseCurrents = (isCollapsing) => {

    // if a meal prep is selected
    if (selectedPrepId) {

      // the current ingredient data 
      let dataArr = selectedPrepData.currentData;
      let idsArr = selectedPrepData.currentIds;
      let amountsArr = selectedPrepData.currentAmounts;
      let calsArr = selectedPrepData.currentCals;
      let pricesArr = selectedPrepData.currentPrices;

      // to store the new ingredient data - default values at first
      let newDataArr = [ null, null, null, null, null, null, null, null, null, null, null, null ];
      let newIdsArr = [ "", "", "", "", "", "", "", "", "", "", "", "" ];
      let newAmountsArr = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 
      let newCalsArr = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 
      let newPricesArr = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 


      // if the collapse button was pressed
      if (isCollapsing) {
        let index = 0;

        // loops over the ingredients and removes empty spaces between ingredients
        for (var i = 0; i < 12; i++) {
          if(dataArr[i] !== null) {
            newDataArr[index] = dataArr[i];
            newIdsArr[index] = idsArr[i];
            newAmountsArr[index] = amountsArr[i];
            newCalsArr[index] = calsArr[i];
            newPricesArr[index] = pricesArr[i];

            // increments the index
            index = index + 1;
          }
        }

      // if the expand button was pressed
      } else {
        
        for (var i = 0; i < 11; i++) {

          // the index of the new array is dependent on the selectedCurrentIndex
          // if i is currently less than the selected index, the ingredient stays put
          // otherwise, it is shifted to the next index (will chop off end values, be careful)
          let index = (i < (selectedCurrentIndex-1)) ? i : i+1;
          
          if (dataArr[i] !== null) {
            newDataArr[index] = dataArr[i];
            newIdsArr[index] = idsArr[i];
            newAmountsArr[index] = amountsArr[i];
            newCalsArr[index] = calsArr[i];
            newPricesArr[index] = pricesArr[i];
          } 
        }
      }

      // stores the newly shifted data
      selectedPrepData.currentData = newDataArr;
      selectedPrepData.currentIds = newIdsArr;
      selectedPrepData.currentAmounts = newAmountsArr;
      selectedPrepData.currentCals = newCalsArr;
      selectedPrepData.currentPrices = newPricesArr;

      // calculates the details and totals
      let calcData = calcAmounts(selectedPrepData);
          
      // loops over the 12 ingredients backwards to find the first empty one
      for (let i = 11; i >= 0; i--) {
        if (!calcData.currentData[i]) {
          setSelectedCurrentIndex(i + 1);
        }
      }
      // updates the amount left and more
      updateEnoughLeft(calcData);
      
      // stores the meal prep data in the firebase
      updateDoc(doc(db, 'preps', selectedPrepId), calcData);

      // updates the selected meal prep's data
      setSelectedPrepData(calcData);

      // clears the current storage of the amounts so the placeholders aren't janky
      setCurrCurrentAmounts(["", "", "", "", "", "", "", "", "", "", "", ""]);
    }
  }

  // for when the trash button is selected next to the ingredient textinput
  const deleteCurrent = async () => {
    
    // resets the ingredient data at the selected index to be null
    selectedPrepData.currentData[selectedCurrentIndex - 1] = null;
    selectedPrepData.currentIds[selectedCurrentIndex - 1] = "";
    selectedPrepData.currentAmounts[selectedCurrentIndex - 1] = "";
    selectedPrepData.currentCals[selectedCurrentIndex - 1] = "";
    selectedPrepData.currentPrices[selectedCurrentIndex - 1] = "";

    // sets the current storage of the data so the placeholders aren't janky
    setCurrCurrentAmounts(["", "", "", "", "", "", "", "", "", "", "", ""]);        
    
    // updates the current ingredient amounts
    setCurrEnoughLeft((prev) => {
      const updated = [...prev];
      updated[selectedCurrentIndex - 1] = true;
      return updated;
    });
    setCurrMoreLeft((prev) => {
      const updated = [...prev];
      updated[selectedCurrentIndex - 1] = true;
      return updated;
    });

    // calculates the details and totals
    let calcData = calcAmounts(selectedPrepData);
          
    // loops over the 12 ingredients backwards to find the first empty one
    for (let i = 11; i >= 0; i--) {
      if (!calcData.currentData[i]) {
        setSelectedCurrentIndex(i + 1);
      }
    }
    
    // stores the meal prep data in the firebase
    updateDoc(doc(db, 'preps', selectedPrepId), calcData);

    // updates the selected meal prep's data
    setSelectedPrepData(calcData);
      
    // clears the search
    clearCurrentSearch();
  
    // calculates the amounts that are left of all current ingredients
    await calcAllAmountsLeft();
  }


  ///////////////////////////////// AMOUNTS MODAL /////////////////////////////////
  
  const [amountsModalVisible, setAmountsModalVisible] = useState(false);
  const [amountsModalData, setAmountsModalData] = useState(null)

  // when a touchable opacity for a meal is clicked, store the data
  const displayAmounts = (data) => {

    // only opens the modal and stores data if there is data
    if (data) {
      setAmountsModalData(data);
      setAmountsModalVisible(true);
    }
  }


  ///////////////////////////////// SAVE AS RECIPE /////////////////////////////////

  const [recipeModalVisible, setRecipeModalVisible] = useState(false);
  const [ingredientsData, setIngredientsData] = useState(null);
  const [ingredientsSnapshot, setIngredientsSnapshot] = useState(null);
  const [recipesSnapshot, setRecipesSnapshot] = useState(null);

  // called when tab is switched to load in the ingredients and recipes
  const fetchIngredientsAndRecipes = async () => {
    
    // gets the collections of ingredients and recipes
    const ingredientsData = await allIngredientFetch();
    const ingredients = await getDocs(collection(db, 'ingredients'));
    const recipes = await getDocs(collection(db, 'recipes'));
    
    // stores the data
    setIngredientsData(ingredientsData);
    setIngredientsSnapshot(ingredients);
    setRecipesSnapshot(recipes);
  }
  
  const navigation = useNavigation();

  // to submit the recipe modal
  const closeRecipeModal = (confirmed) => {

    // to close the modal
    setRecipeModalVisible(false);

    // if the checkmark was selected
    if (confirmed) {
      setTimeout(navigation.navigate('FOOD', { screen: 'Recipes' }), 2000);
      fetchIngredientsAndRecipes();
    }

    // if deleting after saving the recipe
    if (deleteAfterSave) {
      confirmDelete();
      setDeleteAfterSave(false);
    }
  }
    
  
  ///////////////////////////////// CALCULATE DATA DETAILS MODAL /////////////////////////////////

  const [calcModalVisible, setCalcModalVisible] = useState(false);
  const [calcIndex, setCalcIndex] = useState(-1);
  const [nonselectedAmountUsed, setNonselectedAmountUsed] = useState(null);
  
  // when an ingredient's details are clicked to view the modal
  const showCalcModal = (index) => {
    if (selectedPrepData?.currentData[index] !== null) {

      // to calculate amount left without current spotlight
      let amountUsed = "0";

      // loops over the other spotlights
      prepList.forEach((prep) => {
        if (prep.id !== selectedPrepId) {
          
          // loops over the matching ingredients and adds their amounts * spotlight mults
          for (let i = 0; i < 12; i++) {
            if (prep.currentData[i] !== null && prep.currentIds[i] === selectedPrepData.currentIds[index]) {
              amountUsed = (new Fractional(amountUsed).add(new Fractional(prep.currentAmounts[i]).multiply(new Fractional(prep.prepMult)))).toString();
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


      {/* NOTES SECTION */}
      {selectedPrepData !== null &&
      <View className="flex flex-row w-5/6 justify-center items-center mb-[20px]">
        <View className="bg-zinc200 w-full h-[50px]">

          {/* text input */}
          <TextInput
            value={selectedNote}
            onChangeText={setSelectedNote}
            onBlur={() => dbNote()}
            multiline={true}
            placeholder="notes"
            placeholderTextColor={colors.zinc400}
            className="flex-1 text-[14px] leading-[16px] pl-2.5 pr-10 bg-white rounded-[5px] border-[1px] border-zinc300"
          />

          {/* clear button */}
          <View className="flex flex-row absolute right-0 top-0 h-[50px] pt-[5px] pr-[2px]">
            <Icon
              name="checkmark"
              size={20}
              color="black"
              onPress={() => dbNote()}
            />
            <Icon
              name="close-outline"
              size={20}
              color="black"
              onPress={() => clearNote()}
            />
          </View>
        </View>

        <View className="flex pl-2">
          <Icon
            name="bookmarks"
            size={24}
            color={colors.zinc800}
            onPress={() => {
              if (selectedPrepId !== null) {
                setDeleteAfterSave(false);
                setRecipeModalVisible(true);
              }
            }}
          />
        </View>
      </View>
      }

      {/* modal to save a prep as a recipe */}
      {recipeModalVisible &&
        <PrepToRecipeModal
          prepData={selectedPrepData}
          ingredientsData={ingredientsData}
          ingredientsSnapshot={ingredientsSnapshot}
          recipesSnapshot={recipesSnapshot}
          modalVisible={recipeModalVisible}
          closeModal={closeRecipeModal}
        />
      }

      {/* PREP CARD SECTION */}
      <View className={`flex flex-row space-x-0.5 ${(selectedPrepData && selectedPrepData.currentData.indexOf(null) !== -1) ? "mx-1" : "justify-center items-center"}`}>
       
        {/* Main Section */}
        <View className="w-11/12 border-[1px] border-black bg-black">

          {/* TITLE ROW */}
          <View className="flex-row border-b-[1px]">
      
            {/* Buttons */}
            <View className="flex flex-col bg-theme800 items-center justify-center h-[50px] w-[30px] z-30">
                
              {/* Add - opens the modal */}
              <Icon
                size={15}
                color="white"
                name="add-outline"
                onPress={() => openNewPrep()}
              />

              {/* Edit (three dots) - rename or delete current prep recipe */}
              {selectedPrepData !== null &&
              <Icon
                size={15}
                color="white"
                name="ellipsis-horizontal-outline"
                onPress={() => setModModalVisible(true)}
              />
              }

              {/* Modal that appears to edit/delete a prep */}
              {(modModalVisible && selectedPrepId) && (
                <ModMealModal
                  modalVisible={modModalVisible} 
                  closeModal={closeModModal} 
                  editingId={selectedPrepId}
                  setEditingId={setSelectedPrepId}
                  editingData={selectedPrepData}
                  setEditingData={setSelectedPrepData}
                  defaultName={""}
                  type={"prep"}
                />
              )}
            </View>

            {/* ADD PREP MODAL */}
            {newModalVisible &&
              <AddPrepModal
                modalVisible={newModalVisible}
                setModalVisible={setNewModalVisible}
                closeModal={submitNewPrep}
                numPreps={numPreps}
                currentData={[null, ...currentData]}
              />
            }

            {/* Text */}
            <View className="flex flex-row ml-[-30px] mr-[20px] pl-[30px] items-center justify-center w-full">

              {/* Meal Prep Dropdown */}
              <View className="flex flex-row items-center justify-center w-4/5 h-[50px] z-50">
                <View className="flex bg-theme800 items-center justify-center w-full">
                  <DropDownPicker 
                    open={prepDropdownOpen}
                    setOpen={setPrepDropdownOpen}
                    value={selectedPrepId}
                    setValue={setSelectedPrepId}
                    items={prepList.map((prep) => ({
                      label: prepDropdownOpen ? "(" + (selectedPrepId === prep.id ? currPrepMult : prep.prepMult) + ") " + prep.prepName : prep.prepName,
                      value: prep.id,
                      key: prep.id,
                      labelStyle: { color: 'black' }
                    }))}
                    placeholder=""
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

              {/* Multiplicity */}
              <View className="flex flex-row bg-theme700 border-l items-center justify-center w-1/5 h-[50px] pr-[5px] z-30">
                
                {selectedPrepData !== null &&
                <>
                  {/* Input */}
                  <TextInput
                    value={String(currPrepMult)}
                    onChangeText={(text) => {
                      updateMult(text);
                      setCurrentDropdownOpen(false);
                    }}
                    placeholder={selectedPrepData ? String(selectedPrepData.prepMult) : "0"}
                    placeholderTextColor={'white'}
                    className="flex-1 text-center text-white font-bold text-[14px] leading-[16px]"
                  />

                  {/* Use up (decrement multiplicity)*/}
                  {currPrepMult !== 0 &&
                  <Icon
                    size={20}
                    color="white"
                    name="checkmark-done"
                    onPress={() => decreaseMult()}
                  />
                  }
                </>
                }
              </View>

              {/* to add back a prep */}
              {(selectedPrepData && selectedPrepData.currentData.filter(curr => curr !== null).length > 0) &&
              <TouchableOpacity 
                className="bg-zinc350 justify-center px-0.5 h-full items-center absolute right-[-25px] rounded-r-lg z-0"
                onPress={() => addBackPrep()}
              >
                <Icon
                  name="add-sharp"
                  size={20}
                  color={colors.zinc600}
                />
              </TouchableOpacity>
              }

              {/* Modal that appears to delete a current prep */}
              {deleteModalVisible && (
                <DeletePrepModal
                  prepName={deletingName}
                  visible={deleteModalVisible}
                  onBoth={confirmSaveDelete}
                  onSave={confirmSave}
                  onDelete={confirmDelete}
                  onCancel={cancelDelete}
                />
              )}
            </View>
          </View>
        
          {/* HEADER ROW */}
          <View className="w-full flex flex-row h-[30px] bg-theme900 border-b-[1px] z-20">
            {selectedPrepData !== null &&
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
            scrollEnabled={isKeyboardOpen}
            onScroll={syncScroll}
          >

            {Array.from({ length: 12 }, (_, index) => (
              <View key={`frozen-${index}`} className="flex flex-row h-[30px] bg-white">
                
                {/* ingredient names */}
                <View className={`flex items-center justify-center w-5/12 ${(currEnoughLeft[index] || selectedPrepData === null) ? "bg-theme600" : "bg-zinc500"} border-b border-r border-zinc700 z-10`}>
                  {/* on press, open a modal that gives the amounts */}
                  <TouchableOpacity
                    key={index}
                    onPress={() => displayAmounts(selectedPrepData.currentData[index])}
                  >
                    <View className="flex flex-wrap flex-row">
                      <Text className="text-white font-semibold text-[10px] text-center px-2">
                        {selectedPrepData && selectedPrepData.currentData[index] ? selectedPrepData.currentData[index].ingredientData.ingredientName : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Modal to Display Amounts */}
                  {amountsModalVisible && 
                    <AmountsDetailsModal
                      data={amountsModalData}
                      modalVisible={amountsModalVisible}
                      setModalVisible={setAmountsModalVisible}
                    />
                  }
                </View>

                {/* amount */}
                <View className={`flex flex-row items-center justify-center ${(!currEnoughLeft[index] &&  selectedPrepData !== null) ? "bg-zinc300" : (!currMoreLeft[index] &&  selectedPrepData !== null) ? "bg-theme100" : "bg-zinc100"} w-1/3 border-b border-b-zinc400 border-r border-r-zinc400`}>
                  
                  {/* indicator of the current ingredient */}
                  {(selectedPrepData !== null && (selectedCurrentIndex - 1) === (index)) &&
                    <View className="absolute left-[-15px] z-0">
                      <Icon
                        name="reorder-four"
                        size={30}
                        color={!currEnoughLeft[index] &&  selectedPrepData !== null ? colors.zinc400 : !currMoreLeft[index] &&  selectedPrepData !== null ? colors.zinc400 : colors.zinc350}
                      />
                    </View>
                  }

                  {/* amount and units */}
                  {selectedPrepData?.currentData?.[index] ?
                    <View className="flex flex-row">
                      {/* Input Amount */}
                      <TextInput
                        key={index}
                        className="text-[10px] leading-[12px] text-center px-[3px]"
                        placeholder={selectedPrepData?.currentData[index] !== null && selectedPrepData?.currentAmounts[index] !== "" ? selectedPrepData?.currentAmounts[index] : "_"}
                        placeholderTextColor="black"
                        value={currCurrentAmounts[index]}
                        onChangeText={(value) => {
                          setAmount(validateFractionInput(value), index);
                          setCurrentDropdownOpen(false);
                        }}
                      />
                      {/* Unit */}
                      <Text className="text-[10px]">
                        {` ${extractUnit(selectedPrepData.currentData[index].ingredientData[`${selectedPrepData.currentData[index].ingredientStore}Unit`], currCurrentAmounts[index])}`}
                      </Text>
                    </View>
                  : null }
                </View>

                {/* details */}
                <TouchableOpacity 
                  onPress={() => showCalcModal(index)}
                  className={`flex flex-row items-center justify-evenly ${currEnoughLeft[index] || selectedPrepData === null ? "bg-white" : "bg-zinc200"} w-1/4 border-b border-b-zinc400`}
                >
                  
                  {/* calories */}
                  {selectedPrepData?.currentCals?.[index] ?
                    <Text className="text-[10px]">
                      {selectedPrepData.currentCals[index].toFixed(0)} {"cal"}
                    </Text>
                  : selectedPrepData?.currentData?.[index] ?
                    <Text className="text-[10px]">
                      {"0 cal"}
                    </Text> 
                  : null }

                  {/* price */}
                  {selectedPrepData?.currentPrices?.[index] ?
                    <Text className="text-[10px]">
                      {"$"}{selectedPrepData.currentPrices[index].toFixed(2)}
                    </Text>
                  : selectedPrepData?.currentData?.[index] ?
                    <Text className="text-[10px]">
                      {"$0.00"}
                    </Text> 
                  : null }
                </TouchableOpacity>
              </View>
            ))}
                                
            {/* empty space at the bottom if the keyboard is open */}
            {isKeyboardOpen &&
              <View className="flex flex-row h-[120px]"/>
            }
          </ScrollView>

          {/* CALCULATION MODAL */}
          {calcModalVisible &&
            <CalcIngredientModal
              modalVisible={calcModalVisible}
              setModalVisible={setCalcModalVisible}
              submitModal={submitCalcModal}
              ingredientData={selectedPrepData?.currentData[calcIndex]}
              ingredientStore={selectedPrepData?.currentData[calcIndex].ingredientStore}
              initialCals={selectedPrepData?.currentCals[calcIndex].toFixed(0)}
              initialPrice={selectedPrepData?.currentPrices[calcIndex].toFixed(2)}
              initialServings={null}
              initialAmount={selectedPrepData?.currentAmounts[calcIndex]}
              amountUsed={nonselectedAmountUsed}
              amountContainer={
                new Fraction (selectedPrepData?.currentData[calcIndex].ingredientData[`${selectedPrepData?.currentData[calcIndex].ingredientStore}TotalYield`]) * 1 === 0 
                ? // if completely custom
                  new Fraction (selectedPrepData?.currentData[calcIndex].amountTotal) * 1 
                : // if pre-existing
                  new Fraction (selectedPrepData?.currentData[calcIndex].ingredientData[`${selectedPrepData?.currentData[calcIndex].ingredientStore}TotalYield`]) * 1
              }
              servingSize={
                new Fraction (selectedPrepData?.currentData[calcIndex].ingredientData[`${selectedPrepData?.currentData[calcIndex].ingredientStore}ServingSize`]) * 1 === 0 
                ? // if completely custom
                  1
                : // if pre-existing
                  new Fraction (selectedPrepData?.currentData[calcIndex].ingredientData[`${selectedPrepData?.currentData[calcIndex].ingredientStore}ServingSize`]) * 1
              }
            />
          }


          {/* TOTAL ROW */}
          <View className="flex flex-row h-[30px] border-t-[0.25px] border-b-[1px] z-20 bg-theme800 w-full">
            
            {selectedPrepData !== null &&
            <View className="flex flex-row items-center justify-center w-full border-r bg-theme800">
              
              {/* details */}
              <View className="flex w-5/12 items-center justify-center">
                <Text className="text-white text-xs italic font-bold">
                  TOTALS
                </Text>
              </View>
              
              {/* amounts */}
              <View className="flex flex-row w-7/12 items-center justify-center space-x-10">

                {/* calories */}
                <View>
                  {selectedPrepData?.prepCal ?
                    <Text className="text-white text-xs italic">
                      {currPrepCal} {"cal"}
                    </Text>
                  : 
                    <Text className="text-white text-xs italic">
                      {"0 cal"}
                    </Text> 
                  }
                </View>

                {/* price */}
                <View>
                  {selectedPrepData?.prepPrice ?
                    <Text className="text-white text-xs italic">
                      {"$"}{currPrepPrice}
                    </Text>
                  : 
                    <Text className="text-white text-xs italic">
                      {"$0.00"}
                    </Text> 
                  }
                </View>
              </View>        
            </View>
            }
          </View>
        </View>    
            
        {/* Checkbox Column */}
        <View className="flex mt-[82px] z-40">
          <ScrollView 
            className="max-h-[360px]"
            contentOffset={{ y: scrollY }}
            scrollEnabled={false}
          >
            {Array.from({ length: 12 }, (_, index) => (
              <View key={`store-${index}`}>
                {selectedPrepData?.currentData[index] ?
                  <View className="flex flex-row h-[30px] justify-center items-center">
                    <Icon
                      name={currChecks[index] ? "checkbox" : "square-outline"}
                      color={colors.zinc600}
                      size={16}
                      onPress={() => updateCheck(index)}
                    />
                  </View>
                : 
                  <View className="flex flex-row h-[30px]"/>
                }
              </View>
            ))}

            {/* empty space at the bottom if the keyboard is open */}
            {isKeyboardOpen &&
              <View className="flex flex-row h-[120px]"/>
            }
          </ScrollView>
        </View>  
      </View>


      {/* CURRENT INGREDIENT SELECTION SECTION */}
      {selectedPrepData !== null &&
      <View className="flex flex-row mt-[20px]">

        {/* Left Boxes */}
        <View className="flex flex-col pr-[10px] items-center justify-center">

          {/* Index Picker */}
          <View className="flex z-0 w-[130px] bg-zinc700 border border-zinc900">
            <Picker
              selectedValue={selectedCurrentIndex}
              onValueChange={setSelectedCurrentIndex}
              style={{ height: 30, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -20, }}
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
          
          {/* Option Picker */}
          <View className="flex z-0 w-[130px] bg-theme200 border border-theme400">
            <Picker
              selectedValue={selectedOption}
              onValueChange={setSelectedOption}
              style={{ height: 30, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -20, }}
              itemStyle={{ color: colors.zinc900, fontWeight: 'bold', textAlign: 'center', fontSize: 12, }}
            >
              {(["ALL", "REMAINING", "USED"]).map((item) => (
                  <Picker.Item
                    key={item}
                    label={item}
                    value={item}
                  />
                ))
              }
            </Picker>
          </View>
        </View>
        
        {/* Current Ingredient Search */}
        <View className="flex flex-row w-[45%] h-[70px] justify-center items-center">
          {/* dropdown */}
          <DropDownPicker 
            open={currentDropdownOpen}
            setOpen={setCurrentDropdownOpen}
            value={selectedCurrentId}
            setValue={setSelectedCurrentId}

            items={filteredCurrentData.map((current, _, arr) => {
              // counts occurrences of each ingredientId inline
              const ingredientIdCounts = arr.reduce((counts, item) => {
                counts[item.ingredientId] = (counts[item.ingredientId] || 0) + 1;
                return counts;
              }, {});
              // checks if the current ingredientId appears more than once
              const displayStoreBrand = ingredientIdCounts[current.ingredientId] > 1 && current.ingredientId !== ""
                ? ` (${current.ingredientData[`${current.ingredientStore}Brand`] !== "" ? current.ingredientData[`${current.ingredientStore}Brand`] : "no brand" || ""})` 
                : "";
              // returns results
              return {
                label: current.ingredientData.ingredientName + displayStoreBrand,
                value: current.id,
                key: current.id,
                labelStyle: { color: 'black' },
                containerStyle: {
                  borderBottomWidth: 0.5,
                  borderBottomColor: colors.zinc450,
                  backgroundColor: current.amountTotal === "" || current.amountLeft > "0" ? colors.theme200 : colors.zinc350,
                },
              };
            })}
            placeholder=""
            style={{ height: 55, backgroundColor: colors.zinc400, borderWidth: 1, borderColor: colors.zinc500, justifyContent: 'center', }}
            dropDownContainerStyle={{ borderLeftWidth: 1, borderRightWidth: 1, borderTopWidth: 1, borderColor: colors.zinc500, borderRadius: 0, backgroundColor: colors.zinc350 }}
            textStyle={{ color: filteredCurrentData.length === 0 ? colors.theme200 : "black", fontWeight: 450, textAlign: 'center', fontSize: 12, }}
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
        

        {/* BUTTONS */}
        <View className="flex ml-[10px] justify-center">
          <View className={`flex flex-col space-y-[3px] items-center rounded bg-zinc300 pb-1 ${(selectedCurrentId !== "" && selectedCurrentId !== null) && "pt-1"}`}>
                            
            {/* Submit */}
            {(selectedCurrentId !== "" && selectedCurrentId !== null) &&
            <View className="flex flex-row px-1">
              <Icon
                name="checkmark-circle"
                size={18}
                color={colors.theme900}
                onPress={() => submitCurrent()}
              />

              <Icon
                name="close-circle"
                size={18}
                color={colors.theme900}
                onPress={() => setSelectedCurrentId(null)}
              />
            </View>
            }

            <View className="flex flex-row space-x-[-5px]">
              {/* Compress */}
              <Icon
                name="chevron-collapse"
                size={18}
                color={colors.theme900}
                onPress={() => collapseCurrents(true)}
              />
                
              {/* Add Space Between */}
              <Icon
                name="chevron-expand"
                size={18}
                color={colors.theme900}
                onPress={() => collapseCurrents(false)}
              />
            </View>

            {/* Delete */}
            {selectedPrepData.currentData[selectedCurrentIndex - 1] !== null &&
            <Icon
              name="trash"
              size={18}
              color={colors.theme900}
              onPress={() => deleteCurrent()}
            />
            }
          </View>
        </View>
      </View>
      }
    </View>
  );
};