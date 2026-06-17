///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useRef, useState, useEffect } from 'react';
import { useNavigation, useNavigationState } from '@react-navigation/native';

// UI components
import { View, Text, TextInput, TouchableOpacity, Keyboard, ScrollView, } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Picker } from '@react-native-picker/picker';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

// validation
import validateFractionInput from '../../components/Validation/validateFractionInput';
import validateWholeNumberInput from '../../components/Validation/validateWholeNumberInput';
import validateDecimalInput from '../../components/Validation/validateDecimalInput';
import extractUnit from '../../components/Validation/extractUnit';
import { numberToRoman } from '../../components/Validation/numberToRoman';

// modals
import CopyMealModal from '../../components/Prep-Meals/CopyMealModal';
import CalcIngredientModal from '../../components/MultiUse/CalcIngredientModal';
import ModMealModal from '../../components/MultiUse/ModMealModal';
import DeletePrepModal from '../../components/Prep-Meals/DeletePrepModal';
import AmountsDetailsModal from '../../components/Prep-Meals/AmountsDetailsModal';
import AddPrepModal from '../../components/Prep-Meals/AddPrepModal';
import PrepToRecipeModal from '../../components/Prep-Meals/PrepToRecipeModal';

// firebase
import { prepDelete } from '../../firebase/Preps/prepDelete';

// initialize firebase app
import { getFirestore, doc, updateDoc, collection, getDocs, getDoc, writeBatch } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

export default function MealPrep ({ isSelectedTab }) {


  ///////////////////////////////// KEYBOARD /////////////////////////////////

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
      onNav();
    }
  }, [isSelectedTab])

  const previousIndexRef = useRef(null);
  const currentIndex = useNavigationState((state) => state.index);

  // if the screen has changed
  useEffect(() => {
    
    // if the page has changed to the current one, refetch the current data from the globals
    if (isSelectedTab && previousIndexRef !== null && previousIndexRef.current !== currentIndex && currentIndex === 1) {
      setTimeout(() => {
        onNav();
      }, 1000);
    }

    // updates the ref to the new index
    previousIndexRef.current = currentIndex;
  }, [currentIndex]);


  // when navigating
  const onNav = async () => {
    
    // processes meal preps
    const prepSnapshot = await getDocs(collection(db, 'PREPS'));
    const prepsArray = prepSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => a.prepName.localeCompare(b.prepName));
    setPrepList(prepsArray);
            

    // gets the overall global prep info
    const prepGlobal = await getDoc(doc(db, 'GLOBALS', 'prep'));
    setPrepsIds(prepGlobal.data().preps.map((doc) => doc.id));
    setPrepsCompleted(prepGlobal.data().preps.map((doc) => doc.completed));
    setPrepsCustom(prepGlobal.data().preps.map((doc) => doc.custom));

    // gets the specific global prep info
    const prepId = prepGlobal?.data()?.id;
    if (prepId) {

      // gets the prep data
      const prepDoc = prepSnapshot.docs.find(doc => doc.id === prepId);
      const prepData = prepDoc?.data() || null;
      
      setSelectedPrepId(prepId);
      setSelectedPrepData(prepData);

      if (prepData) {
        const variantData = prepData.variants[selectedPrepVariant];

        // finds the first empty ingredient
        setSelectedCurrentIndex(variantData.currentData.findIndex(x => !x) + 1 || 1);
        // sets the note
        setSelectedNote(variantData.prepNote);
        // updates the amounts of each current ingredient left
        updateEnoughLeft(variantData);
        // sets the current amounts and multiplicities
        setCurrCurrentAmounts(variantData.currentAmounts);
        setCurrPrepMult(variantData.prepMult);
        
        // if there are amounts of ingredients, update them
        if (variantData.currentAmounts && prepGlobal.data().preps.map((doc) => doc.custom).map((p) => p[variantData.variantId]).find(p => p) === "currents") {
          let calcData = calcAmounts(variantData);
          updateEnoughLeft(calcData);

          const updatedVariants = [...prepData.variants];
          updatedVariants[selectedPrepVariant] = {
            ...updatedVariants[selectedPrepVariant],
            ...calcData,
          };
          
          await updateDoc(doc(db, 'PREPS', prepId), { variants: updatedVariants });
          setSelectedPrepData({ ...prepData, variants: updatedVariants });
        }
      }
    }


    // gets the collection of current ingredients
    const currentSnapshot = await getDocs(collection(db, 'CURRENTS'));
    const currents = currentSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));

    setCurrentData(currents);
    filterOptions(currents);
    setCurrentsSnapshot(currentSnapshot);

    
    // gets the collections of ingredients and recipes
    const ingredients = await getDocs(collection(db, 'INGREDIENTS'));
    setIngredientsSnapshot(ingredients);
    const recipes = await getDocs(collection(db, 'RECIPES'));
    setRecipesSnapshot(recipes);
  }


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


  // to change the data of the prep document under the global collection
  const reloadPrep = async (prepId, changeVariant) => {
    let varIdx = selectedPrepVariant;
    if (changeVariant) { varIdx = 0; }
    
    setSelectedPrepVariant(varIdx);
    setSelectedPrepId(prepId);
    
    // as long as a recipe was collected
    if (prepId) {
      
      // stores the prep data in the firebase
      await updateDoc(doc(db, 'GLOBALS', 'prep'), { id: prepId });

      // gets the current data
      const docSnap = await getDoc(doc(db, 'PREPS', prepId));
      const data = docSnap.exists() ? docSnap.data() : null;
      const variant = data.variants[varIdx];

      // sets the current prep card placeholders
      setCurrCurrentAmounts(variant.currentAmounts);
      setCurrPrepMult(variant.prepMult);
      setSelectedNote(variant.prepNote);
      
      // if there are amounts of ingredients, update them
      if (variant.currentAmounts && prepsCustom.map((p) => p[variant.variantId]).find(p => p) === "currents") {
        
        // calculate the details and totals
        let calcData = calcAmounts(variant);
        
        // loops over the 12 ingredients backwards to find the first empty one
        for (let i = 11; i >= 0; i--) {
          if (!calcData.currentData[i]) {
            setSelectedCurrentIndex(i + 1);
          }
        }

        // updates the amounts of each current ingredient that are left
        updateEnoughLeft(calcData);

        // updates prep data
        const updatedVariants = [...data.variants];
        updatedVariants[varIdx] = {
          ...updatedVariants[varIdx],
          ...calcData,
        };
        
        await updateDoc(doc(db, 'PREPS', prepId), { variants: updatedVariants });
        setSelectedPrepData({ ...data, variants: updatedVariants });
        return { ...data, variants: updatedVariants };

      } else if (variant.currentAmounts) {
        setSelectedPrepData(data);
        return data;

      } else { return data; }

    // if a meal prep is not selected, set default data
    } else {
      setCurrPrepMult(0);
      setSelectedPrepData(null);
      setSelectedNote("");
      setCurrEnoughLeft([true, true, true, true, true, true, true, true, true, true, true, true]);
      setCurrMoreLeft([true, true, true, true, true, true, true, true, true, true, true, true]);
      setSelectedCurrentIndex(1);

      // stores the recipe data in the firebase
      updateDoc(doc(db, 'GLOBALS', 'prep'), { id: null });
      return null;
    }
  }


  // helper function to refresh the list of preps
  const refreshPreps = async () => {

    // gets the collection of meal preps
    const querySnapshot = await getDocs(collection(db, 'PREPS'));

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
            
    // gets current global prep info
    const prep = await getDoc(doc(db, 'GLOBALS', 'prep'));

    // stores it
    setPrepsIds(prep.data().preps.map((doc) => doc.id));
    setPrepsCompleted(prep.data().preps.map((doc) => doc.completed));
    setPrepsCustom(prep.data().preps.map((doc) => doc.custom));
  };


  ///////////////////////////////// MEAL PREP VARIANTS /////////////////////////////////

  const [selectedPrepVariant, setSelectedPrepVariant] = useState(0);

  // updates data on variant change
  const changeVariant = (index) => {
    setSelectedPrepVariant(index);


    // loops over the 12 ingredients backwards to find the first empty one
    for (let i = 11; i >= 0; i--) {
      if (!selectedPrepData?.variants?.[index].currentData[i]) {
        setSelectedCurrentIndex(i + 1);
      }
    }

    if (selectedPrepData?.variants?.[index]) {
      setCurrPrepMult(selectedPrepData.variants[index].prepMult); 
      setCurrCurrentAmounts(selectedPrepData.variants[index].currentAmounts); 
      setSelectedNote(selectedPrepData.variants[index].prepNote);
      updateEnoughLeft(selectedPrepData.variants[index]); 
    }
  }


  ///////////////////////////////// MEAL PREP MULTIPLICITY /////////////////////////////////

  const [currPrepMult, setCurrPrepMult] = useState(0);

  // to handle an updated multiplicity in the textinput
  const updateMult = async (text) => {
    
    // if a meal prep is selected
    if (selectedPrepData) {
      let newMult = 0;

      // updates the text only if its a whole number
      if (/^\d*$/.test(text) && !isNaN(text)) { newMult = Number(text) }

      // stores new multiplicity
      setCurrPrepMult(newMult);

      // fixes the prep object's variants
      const updatedPrep = {
        ...selectedPrepData,
        variants: selectedPrepData.variants.map((v, i) => i === selectedPrepVariant ? { ...v, prepMult: newMult } : v ),
      };

      // stores the meal prep data
      setSelectedPrepData(updatedPrep);
      await updateDoc(doc(db, 'PREPS', selectedPrepId), updatedPrep);
      
      // calculates the amounts that are left of all current ingredients
      await calcAllAmountsLeft();

      // reload settings
      refreshPreps();
    }
  }

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingData, setDeletingData] = useState(null);

  // when the double check button is selected next to the multiplicity
  const decreaseMult = async () => {

    // current meal prep & variant
    const decMult = selectedPrepData.variants[selectedPrepVariant].prepMult - 1;
    
    // if the current multiplicity is positive
    if (decMult >= 0) {
      const updatedPrep = {
        ...selectedPrepData,
        variants: selectedPrepData.variants.map((v, i) => i === selectedPrepVariant ? { ...v, prepMult: decMult } : v ),
      };

      // stores the multiplicity in the state
      setCurrPrepMult(decMult);

      // stores the meal prep data in the firebase
      setSelectedPrepData(updatedPrep);
      await updateDoc(doc(db, 'PREPS', selectedPrepId), updatedPrep);

      // when a meal prep is finished, open a popup asking if you want the prep to be deleted
      if (decMult === 0) {
        setDeletingId(selectedPrepId);
        setDeletingData(updatedPrep);
        setDeleteModalVisible(true);
      }

      // calculates both the amounts left and total for all current ingredients
      await calcCurrAmountsTotal(false);

      // reload settings
      refreshPreps();
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

      // when deleting a variant
      if (selectedPrepData.variants.length > 1) {
        const updatedVariants = selectedPrepData.variants.filter((_, i) => i !== selectedPrepVariant);
        const prepData = { ...selectedPrepData, variants: updatedVariants };

        // stores new 0th index variant data
        setCurrPrepMult(prepData.variants[0].prepMult); 
        setCurrCurrentAmounts(prepData.variants[0].currentAmounts); 
        setSelectedNote(prepData.variants[0].prepNote);
        updateEnoughLeft(prepData.variants[0]); 

        // updates local & db
        setSelectedPrepData(prepData);
        await updateDoc(doc(db, 'PREPS', selectedPrepId), prepData);

        // reload settings if the modal wasn't canceled
        refreshPreps();

        // updates the prep global
        const variantId = selectedPrepData.variants[selectedPrepVariant].variantId;
        const prepIndex = prepsIds.indexOf(selectedPrepId);

        const { [variantId]: _removedCompleted, ...newCompleted } = prepsCompleted[prepIndex];
        const { [variantId]: _removedCustom, ...newCustom } = prepsCustom[prepIndex];

        const prepsData = prepsIds.map((id, i) => ({
          id,
          completed: id === selectedPrepId ? newCompleted : prepsCompleted[i],
          custom: id === selectedPrepId ? newCustom : prepsCustom[i],
        }));

        await updateDoc(doc(db, 'GLOBALS', 'prep'), { preps: prepsData });

        
      // when deleting the whole prep - no variants left
      } else {
        await prepDelete(deletingId);

        // clears data
        setSelectedPrepData(null);
        reloadPrep(null, true);

        // reload settings if the modal wasn't canceled
        refreshPreps();

        // resets variables to default
        setCurrCurrentAmounts([ "", "", "", "", "", "", "", "", "", "", "", "" ]);
        setCurrPrepMult(0);
        setSelectedNote("");

        // stores that there is enough of each current ingredient
        setCurrEnoughLeft([true, true, true, true, true, true, true, true, true, true, true, true]);
        setCurrMoreLeft([true, true, true, true, true, true, true, true, true, true, true, true]);

        // updates the prep global
        const prepIndex = prepsIds.indexOf(selectedPrepId);
        const newIds = prepsIds.filter((_, index) => index !== prepIndex);
        const newCompleted = prepsCompleted.filter((_, index) => index !== prepIndex);
        const newCustom = prepsCustom.filter((_, index) => index !== prepIndex);
        
        const prepsData = newIds.map((id) => ({ id, completed: newCompleted[newIds.indexOf(id)], custom: newCustom[newIds.indexOf(id)] }));
        
        await updateDoc(doc(db, 'GLOBALS', 'prep'), { preps: prepsData });
      }

      // reset
      setSelectedCurrentIndex(1);
      setSelectedPrepVariant(0);
      setDeleteModalVisible(false);
      setDeletingData(null);
      setDeletingId(null);
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
    setDeletingData(null);
    setDeletingId(null);
  };

  // when clicking the "+" button to add back a meal prep
  const addBackPrep = async () => {

    // new incremented amount
    const incMult = selectedPrepData.variants[selectedPrepVariant].prepMult + 1;

    // updates prep and variant
    const updatedPrep = {
      ...selectedPrepData,
      variants: selectedPrepData.variants.map((v, i) => i === selectedPrepVariant ? { ...v, prepMult: incMult } : v ),
    };

    // update local states
    setCurrPrepMult(incMult);
    setSelectedPrepData(updatedPrep);

    // updates db
    await updateDoc(doc(db, 'PREPS', selectedPrepId), updatedPrep);

    // calculates both the amounts left and total for all current ingredients
    await calcCurrAmountsTotal(true);

    // reload settings
    refreshPreps();
  }
  

  ///////////////////////////////// INGREDIENT AMOUNT LOGIC /////////////////////////////////

  // for the placeholders of the amount textinputs
  const [currCurrentAmounts, setCurrCurrentAmounts] = useState(["", "", "", "", "", "", "", "", "", "", "", ""]);

  // to store the entered amount in the current ingredient's data if it is valid
  const setAmount = async (value, index) => {

    // the current variant
    const variant = selectedPrepData.variants[selectedPrepVariant];
    if (!variant.currentData) return;

    // general variables
    const current = variant.currentData[index];
    const storeKey = current.ingredientStore;

    // checks if the brand is valid, meaning the current ingredient has data
    if (current && ((storeKey !== "-" && current.ingredientData[storeKey].brand !== "") || storeKey === "-")) {

      // updates the local amounts
      setCurrCurrentAmounts(prev => {
        const updated = [...prev];
        updated[index] = value;
        return updated;
      });
    }

    // creates a new variant object with updated amounts
    const updatedVariant = { ...variant };
    updatedVariant.currentAmounts[index] = value;

    // recalc totals/calories/prices for this variant
    const calcData = calcAmounts(updatedVariant);

    // updates the full prep object with new variant
    const updatedPrep = {
      ...selectedPrepData,
      variants: selectedPrepData.variants.map((v, i) => i === selectedPrepVariant ? calcData : v ),
    };

    // store in Firestore and state
    setSelectedPrepData(updatedPrep);
    await updateDoc(doc(db, 'PREPS', selectedPrepId), updatedPrep);

    // recalc amounts left globally
    await calcAllAmountsLeft();

    // reload settings
    refreshPreps();
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
        const servings = storeKey !== "-" ? new Fractional(current.ingredientData[storeKey].totalYield) : new Fractional(current.ingredientData["-"].servingSize);
        const cals = storeKey !== "-" ? new Fractional(current.ingredientData[storeKey].calContainer) : new Fractional(current.ingredientData["-"].calServing);
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
            totalCal = data.currentIncluded[index] 
              ? (new Fractional(totalCal)).add(amount.divide(servings).multiply(cals)).toString()
              : totalCal;

          // set individual calories to 0 if arguments are not valid
          } else {
            data.currentCals[index] = new Fraction(0) * 1;
          }

          // calculates prices if the arguments are valid
          if (!isNaN((new Fraction(priceUnit.toString())) * 1)) {
          
            // individual
            data.currentPrices[index] = new Fraction(amount.multiply(priceUnit).toString()) * 1;

            // overall
            totalPrice = data.currentIncluded[index] 
            ? (new Fractional(totalPrice)).add(amount.multiply(priceUnit)).toString()
            : totalPrice;

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
    for (let index = 0; index < selectedPrepData.variants[selectedPrepVariant].currentData.length; index++) {
      if (selectedPrepData.variants[selectedPrepVariant].currentData[index] && selectedPrepData.variants[selectedPrepVariant].currentIncluded[index]) {
        
        // the data from the selected meal prep
        const data = selectedPrepData.variants[selectedPrepVariant].currentData[index];
        const total = data.amountTotal;                                                             // the current total
        const amount = selectedPrepData.variants[selectedPrepVariant].currentAmounts[index];        // the current amount listed in the meal prep

        // recalculates the total and remaining amounts
        if (data && total !== "" && amount !== "") {
          
          const calcAmountTotal = incrementing ? ((new Fractional(total)).add(new Fractional(amount))).toString() : ((new Fractional(total)).subtract(new Fractional(amount))).toString();

          // updates the data in the current ingredient doc within the batch
          batch.update(doc(db, 'CURRENTS', selectedPrepData.variants[selectedPrepVariant].currentIds[index]), {
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
    updateEnoughLeft(selectedPrepData.variants[selectedPrepVariant]);
  }

  // to calculate the amount left of every current ingredient
  const calcAllAmountsLeft = async () => {

    // creates a batch for updates
    const batch = writeBatch(db);

    // gets all meal prep data
    const prepsSnapshot = await getDocs(collection(db, 'PREPS'));
    const prepsArray = prepsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => a.prepName.localeCompare(b.prepName));
    setPrepList(prepsArray);

    // loop over all current ingredients
    for (const currentDoc of currentsSnapshot.docs) {
      const currentData = currentDoc.data();
      const currentId = currentDoc.id;
      
      let calcAmount = currentData.amountTotal;
      if (calcAmount !== "") {

        // loop over all preps
        for (const prepDoc of prepsSnapshot.docs) {
          const prepData = prepDoc.data();
          if (!prepData.variants) continue;

          // loop over all variants
          for (const varData of prepData.variants) {
            if (!Array.isArray(varData.currentIds)) continue;

            // loops over all 12 ingredients and finds the ones that match the current
            for (let i = 0; i < 12; i++) {
              if (varData.currentIds[i] === currentId && varData.currentIncluded?.[i] && varData.currentAmounts?.[i] !== "") {
                calcAmount = ((new Fractional(calcAmount)).subtract((new Fractional(varData.currentAmounts[i])).multiply(new Fractional(varData.prepMult)))).toString();
              }
            }
          }
        }

        // adds the update to the batch for amountLeft if the amount has been changed
        if (currentData.amountLeft !== calcAmount.toString()) {
          batch.update(doc(db, 'CURRENTS', currentId), { amountLeft: calcAmount.toString() });
        }
      }
    }

    // commit batch after all updates are added
    await batch.commit();

    // updates whether there is enough of each current ingredient left of the selected meal prep
    updateEnoughLeft(selectedPrepData.variants[selectedPrepVariant]);
    updateCurrents();
  };
    

  ///////////////////////////////// AMOUNTS LEFT CALCULATIONS /////////////////////////////////
  
  // stores whether there is more than 0 of the current ingredient left
  const [currEnoughLeft, setCurrEnoughLeft] = useState([true, true, true, true, true, true, true, true, true, true, true, true]);
  const [currMoreLeft, setCurrMoreLeft] = useState([true, true, true, true, true, true, true, true, true, true, true, true]);
  
  // to update the state storing whether there is enough of each left
  const updateEnoughLeft = async (calcData) => {
    
    // the default values
    let enough = [true, true, true, true, true, true, true, true, true, true, true, true];
    let more = [true, true, true, true, true, true, true, true, true, true, true, true];
    
    // loops over the 12 current ingredients (if valid)
    for (let index = 0; index < 12; index++) {
      
      // if the current index has data and the multiplicity is not 0
      if (calcData.currentData[index] && calcData.prepMult !== 0) {
        
        // gets the current ingredient data
        const currentDocSnap = await getDoc(doc(db, 'CURRENTS', calcData.currentIds[index]));
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

  // current meal prep note
  const [selectedNote, setSelectedNote] = useState("");

  // when the note box is exited, update the corresponding global document
  const dbNote = async () => {
    if (selectedPrepId) {
      Keyboard.dismiss();

      // updates variant's note
      let prepData = {...selectedPrepData};
      prepData.variants[selectedPrepVariant].prepNote = selectedNote;

      // stores updates
      setSelectedPrepData(prepData);
      await updateDoc(doc(db, 'PREPS', selectedPrepId), prepData);

      // reload settings
      refreshPreps();
    }
  }

  // when the x button is pressed
  const clearNote = async () => {
    if (selectedPrepId) {
      setSelectedNote("");

      // updates variant's note
      let prepData = {...selectedPrepData};
      prepData.variants[selectedPrepVariant].prepNote = "";

      // stores updates
      setSelectedPrepData(prepData);
      await updateDoc(doc(db, 'PREPS', selectedPrepId), prepData);

      // reload settings
      refreshPreps();
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
    setSelectedPrepVariant(0);

    // stores the data
    setSelectedPrepData(prepData);
    reloadPrep(docId, true);
    setCurrCurrentAmounts(prepData.variants[0].currentAmounts);
    setCurrPrepMult(prepData.variants[0].prepMult);
    setSelectedNote("");
    
    // updates the list of completed preps, custom preps, and ids
    const newCompleted = [...prepsCompleted, { [prepData.variants[0].variantId]: false }];
    setPrepsCompleted(newCompleted);

    const newCustom = [...prepsCustom, { [prepData.variants[0].variantId]: "currents" }];
    setPrepsCustom(newCustom);

    const newIds = [...prepsIds, docId];
    setPrepsIds(newIds);

    // stores the new data
    const prepsData = newIds.map((id) => ({ id, completed: newCompleted[newIds.indexOf(id)], custom: newCustom[newIds.indexOf(id) ]}));
    updateDoc(doc(db, 'GLOBALS', 'prep'), { preps: prepsData });

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
    let prepData = null;
    
    // reload settings if the modal wasn't canceled
    if (type !== "") {
      refreshPreps();
      setSelectedNote(selectedPrepData ? selectedPrepData.prepNote : "");

      // calculates amounts
      calcAllAmountsLeft();
    }

    // if the meal prep was edited
    if (type === "edit") {
      prepData = await reloadPrep(selectedPrepId, true);
      const vIds = prepData.variants.map(v => v.variantId);
      const prepIdx = prepsIds.indexOf(selectedPrepId);

      // to restructure the current prep's completed
      let newCompleted = [...prepsCompleted];
      newCompleted[prepIdx] = vIds.reduce((acc, id) => {
        acc[id] = prepsCompleted[prepIdx][id] ?? false;
        return acc;
      }, {});

      // to restructure the current prep's custom
      let newCustom = [...prepsCustom];
      newCustom[prepIdx] = vIds.reduce((acc, id) => {
        acc[id] = prepsCustom[prepIdx][id] ?? "currents";
        return acc;
      }, {});
      
      // stores the new data
      setPrepsCompleted(newCompleted);
      setPrepsCustom(newCustom);
      const prepsData = prepsIds.map((id) => ({ id, completed: newCompleted[prepsIds.indexOf(id)], custom: newCustom[prepsIds.indexOf(id)] }));
      updateDoc(doc(db, 'GLOBALS', 'prep'), { preps: prepsData });
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
      
      // filters the completed & custom preps and ids to remove the deleted one
      const prepIdx = prepsIds.indexOf(selectedPrepId)
      const newIds = prepsIds.filter((_, index) => index !== prepIdx);
      const newCompleted = prepsCompleted.filter((_, index) => index !== prepIdx);
      const newCustom = prepsCustom.filter((_, index) => index !== prepIdx);
      
      // stores the new data
      setPrepsIds(newIds);
      setPrepsCompleted(newCompleted);
      setPrepsCustom(newCustom);
      const prepsData = newIds.map((id) => ({ id, completed: newCompleted[newIds.indexOf(id)], custom: newCustom[newIds.indexOf(id)] }));
      await updateDoc(doc(db, 'GLOBALS', 'prep'), { preps: prepsData });

      // restores data
      setSelectedPrepData(null);
      reloadPrep(null, true);
    }
  };
    

  ///////////////////////////////// CURRENT CHECKBOX LOGIC /////////////////////////////////

  // updates the check at the given index
  const updateCheck = async (index) => {
    if (selectedPrepData !== null) {
      const variant = selectedPrepData.variants[selectedPrepVariant];
    
      // the new value is the opposite of the old
      const newIncluded = variant.currentIncluded.map((check, i) => i === index ? !check : check);
      
      // to populate the totals of this variant
      let totalCal = 0;
      let totalPrice = 0;

      // loops over the checks to only add checked data
      for (let i = 0; i < 12; i++) {
        if (newIncluded[i]) {
          totalCal += variant.currentCals[i] * 1;
          totalPrice += variant.currentPrices[i] * 1;
        }
      }

      // conversions
      totalCal = (new Fraction(totalCal) * 1).toFixed(0);
      totalPrice = (new Fraction(totalPrice) * 1).toFixed(2);

      // rebuilds variant
      const updatedVariant = {
        ...variant,
        currentIncluded: newIncluded,
        prepCal: totalCal,
        prepPrice: totalPrice,
      };

      // rebuilds prep
      const updatedPrep = {
        ...selectedPrepData,
        variants: selectedPrepData.variants.map((v, i) => i === selectedPrepVariant ? updatedVariant : v ),
      };

      // updates state and db
      setSelectedPrepData(updatedPrep);
      await updateDoc(doc(db, "PREPS", selectedPrepId), updatedPrep);

      // recalculates the amount of each current left
      calcAllAmountsLeft();

      // reload settings
      refreshPreps();
    }
  }


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
    const querySnapshot = await getDocs(collection(db, 'CURRENTS'));
    const currents = querySnapshot.docs.map((doc) => {
      const formattedCurrent = {
        id: doc.id, 
        ... doc.data()
      }
      return formattedCurrent;
    })
    .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName)); // sort by ingredientName alphabetically

    setCurrentData(currents);
    filterOptions(currents);
    setCurrentsSnapshot(querySnapshot);
  }
  
  // when current data is changed, update the firebase collections
  const updatePrepCurrents = async () => {
    let prepData = { ...selectedPrepData };
    let variant = { ...prepData.variants[selectedPrepVariant] };

    // loop over all 12 current ingredients
    for (let i = 0; i < 12; i++) {
      if (variant.currentIds[i] && variant.currentIds[i] !== "") {

        // gets the data
        const docSnap = await getDoc(doc(db, 'CURRENTS', variant.currentIds[i]));
        if (docSnap.exists()) {
          variant.currentData[i] = docSnap.data();

        // if it no longer does, reset the data and other attributes
        } else {
          variant.currentAmounts[i] = "";
          variant.currentCals[i] = "";
          variant.currentData[i] = null;
          variant.currentIds[i] = "";
          variant.currentPrices[i] = "";
          variant.currentIncluded[i] = "";
        }
      }
    }

    // recalc totals for this variant
    const calcData = calcAmounts(variant);

    // update the variant inside prepData
    prepData.variants[selectedPrepVariant] = calcData;

    // update amounts left and more
    updateEnoughLeft(calcData);

    // update Firestore
    await updateDoc(doc(db, 'PREPS', selectedPrepId), prepData);

    // update local state
    setSelectedPrepData(prepData);
    setCurrCurrentAmounts(calcData.currentAmounts);

    // reload settings
    refreshPreps();
  }

  // when the current ingredient data is updated, update the meal prep data
  useEffect(() => {
    if (prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "currents") {
      updatePrepCurrents();
    }
    
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
    if (selectedCurrentId !== "" && selectedPrepId && selectedPrepData) {
      
      // gets the data of the current ingredient with the given id
      const docSnap = await getDoc(doc(db, 'CURRENTS', selectedCurrentId)); 
      const data = docSnap.exists() ? docSnap.data() : null;

      // copy the prep and variant
      const prepData = { ...selectedPrepData };
      const variant = { ...prepData.variants[selectedPrepVariant] };

      // updates the selected ingredient
      variant.currentIds[selectedCurrentIndex - 1] = selectedCurrentId;
      variant.currentData[selectedCurrentIndex - 1] = data;

      // calculates the details and totals
      let calcData = calcAmounts(variant);
      calcData.currentIncluded[selectedCurrentIndex - 1] = true;
      prepData.variants[selectedPrepVariant] = calcData;
          
      // loops over the 12 ingredients backwards to find the first empty one
      for (let i = 11; i >= 0; i--) {
        if (!calcData.currentData[i]) {
          setSelectedCurrentIndex(i + 1);
        }
      }

      // updates the amount left and more
      updateEnoughLeft(calcData);

      // stores the meal prep data in the firebase
      await updateDoc(doc(db, 'PREPS', selectedPrepId), prepData);

      // updates the selected meal prep's data
      setSelectedPrepData(prepData);
      setCurrCurrentAmounts(calcData.currentAmounts);
      
      // clears the search
      clearCurrentSearch();
    
      // calculates the amounts that are left of all current ingredients
      await calcAllAmountsLeft();

      // reload settings
      refreshPreps();
    }
  }

  // for when the collapse (isCollapsing) or expand (!isCollapsing) buttons are selected next to the ingredient textinput
  const collapseCurrents = async (isCollapsing) => {

    // copy prep and variant
    let prepData = { ...selectedPrepData };
    const variant = { ...prepData.variants[selectedPrepVariant] };

    // if a meal prep is selected
    if (selectedPrepId) {

      // the current ingredient data 
      let dataArr = variant.currentData;
      let idsArr = variant.currentIds;
      let amountsArr = variant.currentAmounts;
      let calsArr = variant.currentCals;
      let pricesArr = variant.currentPrices;
      let includedArr = variant.currentIncluded;

      // to store the new ingredient data - default values at first
      let newDataArr = [ null, null, null, null, null, null, null, null, null, null, null, null ];
      let newIdsArr = [ "", "", "", "", "", "", "", "", "", "", "", "" ];
      let newAmountsArr = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 
      let newCalsArr = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 
      let newPricesArr = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 
      let newIncludedArr = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 


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
            newIncludedArr[index] = includedArr[i];

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
            newIncludedArr[index] = includedArr[i];
          } 
        }
      }

      // stores the newly shifted data
      variant.currentData = newDataArr;
      variant.currentIds = newIdsArr;
      variant.currentAmounts = newAmountsArr;
      variant.currentCals = newCalsArr;
      variant.currentPrices = newPricesArr;
      variant.currentIncluded = newIncludedArr;

      // calculates the details and totals
      let calcData = calcAmounts(variant);
      prepData.variants[selectedPrepVariant] = calcData;
          
      // loops over the 12 ingredients backwards to find the first empty one
      for (let i = 11; i >= 0; i--) {
        if (!calcData.currentData[i]) {
          setSelectedCurrentIndex(i + 1);
        }
      }

      // updates the amount left and more
      updateEnoughLeft(calcData);
      
      // stores the meal prep data in the firebase
      await updateDoc(doc(db, 'PREPS', selectedPrepId), prepData);

      // updates the selected meal prep's data
      setSelectedPrepData(prepData);

      // clears the current storage of the amounts so the placeholders aren't janky
      setCurrCurrentAmounts(["", "", "", "", "", "", "", "", "", "", "", ""]);
  
      // calculates the amounts that are left of all current ingredients
      await calcAllAmountsLeft();

      // reload settings
      refreshPreps();
    }
  }

  // for when the trash button is selected next to the ingredient textinput
  const deleteCurrent = async () => {
    
    // copy prep and variant
    let prepData = { ...selectedPrepData };
    const variant = { ...prepData.variants[selectedPrepVariant] };
    
    // resets the ingredient data at the selected index to be null
    variant.currentData[selectedCurrentIndex - 1] = null;
    variant.currentIds[selectedCurrentIndex - 1] = "";
    variant.currentAmounts[selectedCurrentIndex - 1] = "";
    variant.currentCals[selectedCurrentIndex - 1] = "";
    variant.currentPrices[selectedCurrentIndex - 1] = "";
    variant.currentIncluded[selectedCurrentIndex - 1] = "";

    // sets the current storage of the data so the placeholders aren't janky
    setCurrCurrentAmounts(["", "", "", "", "", "", "", "", "", "", "", ""]);     

    // calculates the details and totals
    let calcData = calcAmounts(variant);
    prepData.variants[selectedPrepVariant] = calcData;
          
    // loops over the 12 ingredients backwards to find the first empty one
    for (let i = 11; i >= 0; i--) {
      if (!calcData.currentData[i]) {
        setSelectedCurrentIndex(i + 1);
      }
    }

    // updates the amount left and more
    updateEnoughLeft(calcData);
    
    // stores the meal prep data in the firebase
    await updateDoc(doc(db, 'PREPS', selectedPrepId), prepData);

    // updates the selected meal prep's data
    setSelectedPrepData(prepData);
      
    // clears the search
    clearCurrentSearch();
  
    // calculates the amounts that are left of all current ingredients
    await calcAllAmountsLeft();

    // reload settings
    refreshPreps();
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
  const [ingredientsSnapshot, setIngredientsSnapshot] = useState(null);
  const [recipesSnapshot, setRecipesSnapshot] = useState(null);
  
  const navigation = useNavigation();

  // to submit the recipe modal
  const closeRecipeModal = async (confirmed) => {

    // to close the modal
    setRecipeModalVisible(false);

    // if the checkmark was selected
    if (confirmed) {
      setTimeout(navigation.navigate('FOOD', { screen: 'Recipes' }), 2000);
    
      // gets the collections of ingredients and recipes
      const ingredients = await getDocs(collection(db, 'INGREDIENTS'));
      const recipes = await getDocs(collection(db, 'RECIPES'));

      // stores the data
      setIngredientsSnapshot(ingredients);
      setRecipesSnapshot(recipes);
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
  // others
  const [totalAmtUsed, setTotalAmtUsed] = useState(null);
  const [otherPrepsUsed, setOtherPrepsUsed] = useState(null);
  const [otherAmtsUsed, setOtherAmtsUsed] = useState(null);
  // alt
  const [altPrepVariants, setAltPrepVariants] = useState(null);
  
  // when an ingredient's details are clicked to view the modal
  const showCalcModal = (index) => {
    if (selectedPrepData?.variants?.[selectedPrepVariant]?.currentData[index] !== null) {
      let amountUsed = "0";
      let prepsUsed = [];
      let amtsUsed = [];

      // loops over the other preps
      prepList.forEach((prep) => {
        if (prep.id !== selectedPrepId) {
          
          // loops over the variants
          prep.variants.forEach((variant, idx) => {
            // loops over the matching ingredients and adds their amounts * prep mults
            for (let i = 0; i < 12; i++) {
              if (variant.currentData[i] && variant.currentIds[i] === selectedPrepData?.variants?.[selectedPrepVariant]?.currentIds[index]) {
                prepsUsed.push((prep.variants.length === 1) ? (prep.prepName) : (prep.prepName + " (" + numberToRoman(idx + 1) + ")"));
                amtsUsed.push(new Fractional(variant.currentAmounts[i]).multiply(new Fractional(variant.prepMult)));
                amountUsed = (new Fractional(amountUsed).add(new Fractional(variant.currentAmounts[i]).multiply(new Fractional(variant.prepMult)))).toString();
              }
            }
          })
        }
      })

      // for modal arguments
      setOtherPrepsUsed(prepsUsed);
      setOtherAmtsUsed(amtsUsed);
      setTotalAmtUsed(amountUsed);

      // for other variants
      let altPreps = [];

      const currId = selectedPrepData.variants[selectedPrepVariant].currentIds[index];

      selectedPrepData.variants.forEach((variant, idx) => {
        if (idx !== selectedPrepVariant) {
          const currIdx = selectedPrepData.variants[idx].currentIds.indexOf(currId);

          if (currIdx !== -1) {
            altPreps.push({
              variant: idx + 1,
              amount: variant.currentAmounts[currIdx],
              mult: variant.prepMult,
            })
          }
        }
      })

      // for modal arguments
      setAltPrepVariants(altPreps);


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
    setTotalAmtUsed(null);
    setOtherPrepsUsed(null);
    setOtherAmtsUsed(null);
  }
    
  
  ///////////////////////////////// PREP COMPLETION & CUSTOM /////////////////////////////////

  const [prepsIds, setPrepsIds] = useState(null);
  const [prepsCompleted, setPrepsCompleted] = useState(null);
  const [prepsCustom, setPrepsCustom] = useState(null);

  // to toggle the current prep's selected checkbox
  const changeCompleted = async () => {
    const prepIdx = prepsIds.indexOf(selectedPrepId);
    
    // changes only the current prep's selection
    const variantId = selectedPrepData.variants[selectedPrepVariant].variantId;
    let newCompleted = [...prepsCompleted];
    newCompleted[prepIdx][variantId] = !prepsCompleted[prepIdx][variantId];
    
    // stores the data for the db
    const prepsData = prepsIds.map((id) => ({ id, completed: newCompleted[prepsIds.indexOf(id)], custom: prepsCustom[prepsIds.indexOf(id)] }));
      
    // stores the change
    updateDoc(doc(db, 'GLOBALS', 'prep'), { preps: prepsData });
    setPrepsCompleted(newCompleted);

    // reloads
    setPrepDropdownOpen(false);
    await reloadPrep(selectedPrepId, false);

    // reload settings
    refreshPreps();
  }

  // to toggle the current prep's custom
  const changeCustom = async (value) => {
    const prepIdx = prepsIds.indexOf(selectedPrepId);
    
    // changes only the current prep's selection
    const variantId = selectedPrepData.variants[selectedPrepVariant].variantId;
    let newCustom = [...prepsCustom];
    newCustom[prepIdx][variantId] = value;
    
    // stores the data for the db
    const prepsData = prepsIds.map((id) => ({ id, completed: prepsCompleted[prepsIds.indexOf(id)], custom: newCustom[prepsIds.indexOf(id)] }));
      
    // stores the change
    updateDoc(doc(db, 'GLOBALS', 'prep'), { preps: prepsData });
    setPrepsCustom(newCustom);

    // gets the new prep data
    let data = {...selectedPrepData};
    data.variants[selectedPrepVariant] = {
      currentAmounts: value === "currents" ? ["", "", "", "", "", "", "", "", "", "", "", ""] : [], 
      currentCals: value === "currents" ? ["", "", "", "", "", "", "", "", "", "", "", ""] : [], 
      currentData: value === "currents" ? [null, null, null, null, null, null, null, null, null, null, null, null] : [], 
      currentIds: value === "currents" ? ["", "", "", "", "", "", "", "", "", "", "", ""] : [], 
      currentPrices: value === "currents" ? ["", "", "", "", "", "", "", "", "", "", "", ""] : [],
      currentIncluded: value === "currents" ? ["", "", "", "", "", "", "", "", "", "", "", ""] : [],
      prepCal: "0", 
      prepMult: data.variants[selectedPrepVariant].prepMult,
      prepName: data.variants[selectedPrepVariant].prepName,
      prepNote: data.variants[selectedPrepVariant].prepNote,
      prepPrice: "0.00", 
      prepId: selectedPrepId,
      variantId: data.variants[selectedPrepVariant].variantId,
    }

    // stores it 
    setSelectedPrepData(data);
    await updateDoc(doc(db, 'PREPS', selectedPrepId), data);

    // reloads
    setPrepDropdownOpen(false);
    await reloadPrep(selectedPrepId, false);

    // reload settings
    refreshPreps();
  }
    
  
  ///////////////////////////////// COMPLEX CUSTOM EDITING /////////////////////////////////

  const [isAdding, setIsAdding] = useState(false);

  // to add an ingredient
  const addPrepIngredient = async (index) => {

    // resets
    setIsAdding(false);

    // formats currentData
    const currentData = {
      ingredientId: "", 
      ingredientData: {"-": { calServing: "", servingSize: "", unit: ""}}, 
      ingredientName: "", 
      ingredientStore: "-", 
      ingredientTypes: [], 
      archive: false, 
      check: false, 
      containerPrice: "0.00", 
      amountTotal: "", 
      amountLeft: "?", 
      unitPrice: "0.00",
    }

    // get a copy of the prep data
    let data = { ...selectedPrepData };
    const variant = data.variants[selectedPrepVariant];

    // helper to insert at index
    const insertAtIndex = (arr, value) => {
      const newArr = [...arr];
      newArr.splice(index, 0, value);
      return newArr;
    };

    // inserts at index
    data.variants[selectedPrepVariant] = {
      ...variant,
      currentAmounts: insertAtIndex(variant.currentAmounts, ""),
      currentCals: insertAtIndex(variant.currentCals, ""),
      currentData: insertAtIndex(variant.currentData, currentData),
      currentIds: insertAtIndex(variant.currentIds, ""),
      currentPrices: insertAtIndex(variant.currentPrices, ""),
      currentIncluded: insertAtIndex(variant.currentIncluded, true),
    };

    // stores it 
    setSelectedPrepData(data);
    await updateDoc(doc(db, 'PREPS', selectedPrepId), data);

    // reloads
    setPrepDropdownOpen(false);
    await reloadPrep(selectedPrepId, false);

    // reload settings
    refreshPreps();
  }

  // to delete or clear the pressed ingredient
  const deletePrepIngredient = async (index) => {

    // gets the new prep data
    let data = {...selectedPrepData};
    data.variants[selectedPrepVariant] = {
      currentAmounts: data.variants[selectedPrepVariant].currentAmounts.filter((_, i) => i !== index), 
      currentCals: data.variants[selectedPrepVariant].currentCals.filter((_, i) => i !== index), 
      currentData: data.variants[selectedPrepVariant].currentData.filter((_, i) => i !== index), 
      currentIds: data.variants[selectedPrepVariant].currentIds.filter((_, i) => i !== index), 
      currentPrices: data.variants[selectedPrepVariant].currentPrices.filter((_, i) => i !== index),
      currentIncluded: data.variants[selectedPrepVariant].currentIncluded.filter((_, i) => i !== index),
      prepCal: (data.variants[selectedPrepVariant].currentCals.map(cal => new Fractional(cal).numerator / new Fractional(cal).denominator).filter(cal => !isNaN(cal)).reduce((sum, cal) => sum + cal, 0)).toFixed(0), 
      prepMult: data.variants[selectedPrepVariant].prepMult,
      prepName: data.variants[selectedPrepVariant].prepName,
      prepNote: data.variants[selectedPrepVariant].prepNote,
      prepPrice: (data.variants[selectedPrepVariant].currentPrices.map(cal => new Fractional(cal).numerator / new Fractional(cal).denominator).filter(cal => !isNaN(cal)).reduce((sum, cal) => sum + cal, 0)).toFixed(2), 
      prepId: selectedPrepId,
      variantId: data.variants[selectedPrepVariant].variantId,
    }

    // updates totals
    data = updateTotals(data);

    // stores it 
    setSelectedPrepData(data);
    await updateDoc(doc(db, 'PREPS', selectedPrepId), data);

    // reloads
    setPrepDropdownOpen(false);
    await reloadPrep(selectedPrepId, false);

    // reload settings
    refreshPreps();
  }

  // when blurred text inputs
  const updateComplexPrep = async (index) => {
    let prepData = {...selectedPrepData};

    // updates numerical values
    if (index !== -1) {
      prepData.variants[selectedPrepVariant].currentCals[index] = Number(prepData.variants[selectedPrepVariant].currentCals[index]);
    }
    
    // stores data
    await updateDoc(doc(db, 'PREPS', selectedPrepId), prepData);

    // reload settings
    refreshPreps();
  }

  // when changing numerical values
  const updateTotals = (data) => {
    let prepData = {...data};
    
    prepData.variants[selectedPrepVariant].prepCal = prepData.variants[selectedPrepVariant].currentCals.reduce((sum, cal) => sum + Number(cal), 0).toFixed(0);
    prepData.variants[selectedPrepVariant].prepPrice = prepData.variants[selectedPrepVariant].currentPrices.reduce((sum, price) => sum + Number(price), 0).toFixed(2);

    setSelectedPrepData(prepData);
    return prepData;
  }
    
  
  ///////////////////////////////// COPY FROM CUSTOM MODAL /////////////////////////////////

  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [plansSnapshot, setPlansSnapshot] = useState(null);

  // gets the list of plans and open the copy modal
  const fetchPlans = async () => {
    if (plansSnapshot === null) {
      const snap = await getDocs(collection(db, 'PLANS'));
      setPlansSnapshot(snap);
    }

    setCopyModalVisible(true);
  }
  
  // when the copy modal is submitted
  const closeCopyModal = async (data, copyName) => {
    const nulls = data.currentData.map(curr => curr !== null);
    const type = prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId];
    
    const cals = data.currentCals.map(c => c === "" ? 0 : c).filter((_, i) => nulls[i]).map(c => Number(c.toFixed(0)));
    const prices = data.currentPrices.map(p => p === "" ? 0 : p).filter((_, i) => nulls[i]).map(p => Number(p.toFixed(2)));
    
    let prepData = {...selectedPrepData};
    prepData.variants[selectedPrepVariant] = {
      currentAmounts: (type === "complex") ? data.currentAmounts.filter((_, i) => nulls[i]) : [],
      currentCals: (type === "complex") ? cals : [],
      currentData: (type === "complex") ? data.currentData.filter((_, i) => nulls[i]) : [],
      currentIds: (type === "complex") ? data.currentIds.filter((_, i) => nulls[i]) : [],
      currentIncluded: (type === "complex") ? data.currentIncluded.filter((_, i) => nulls[i]) : [],
      currentPrices: (type === "complex") ? prices.map(_ => "") : [],
      prepCal: (type === "complex") ? cals.reduce((sum, cal) => sum + cal, 0).toFixed(0) : data.prepCal,
      prepMult: prepData.variants[selectedPrepVariant].prepMult,
      prepName: prepData.variants[selectedPrepVariant].prepName,
      prepNote: (type === "complex") ? prepData.variants[selectedPrepVariant].prepNote : data.prepNote,
      prepPrice: (type === "complex") ? prices.reduce((sum, cal) => sum + cal, 0).toFixed(2) : data.prepPrice,
      prepId: selectedPrepId,
      variantId: prepData.variants[selectedPrepVariant].variantId,
    };

    if (copyName !== null) {
      prepData.prepName = copyName;
      prepData.variants = prepData.variants.map(variant => ({
        ...variant,
        prepName: copyName
      }));
    }
    
    // stores data
    setSelectedPrepData(prepData);
    await updateDoc(doc(db, 'PREPS', selectedPrepId), prepData);

    // closes modal
    setCopyModalVisible(false);
    
    // reload settings
    refreshPreps();
  }
  
  
  ///////////////////////////////// SCROLLING /////////////////////////////////
  
  const [scrollY, setScrollY] = useState(0);
  
  // syncs store scrolling to grid scrolling
  const syncScroll = (event) => {
    const contentOffsetY = event.nativeEvent.contentOffset.y;
    setScrollY(contentOffsetY);
  };
    
  const dropdownScrollRef = useRef(null);
  const ITEM_HEIGHT = 40;

  // when opening dropdown, skip to selected
  useEffect(() => {
    if (prepDropdownOpen) {
      const idx = prepList.map(prep => prep.prepName).indexOf(selectedPrepData?.prepName);
      if (dropdownScrollRef.current) { dropdownScrollRef.current.scrollTo({ y: idx * ITEM_HEIGHT - 5, animated: false }); }
    }
  }, [prepDropdownOpen])


  ///////////////////////////////// HTML /////////////////////////////////

  return (

    // CONTAINER
    <View className="flex-1 items-center justify-center bg-zinc200 border-0.5">

      {/* TOP SECTION */}
      {((selectedPrepData !== null) && (prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] !== "simple")) && (
        <View className="flex flex-row w-5/6 h-[13.5%] justify-center items-center">

          {/* NOTES */}
          <View className="bg-zinc200 w-full h-[50px]">

            {/* text input */}
            <TextInput
              value={selectedNote}
              onChangeText={setSelectedNote}
              onBlur={() => dbNote()}
              multiline={true}
              placeholder="notes"
              placeholderTextColor={colors.zinc400}
              className="flex-1 text-[14px] leading-[17px] pl-2.5 pr-10 bg-white rounded-[5px] border-[1px] border-zinc300"
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

          {/* SAVE AS RECIPE */}
          {(prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "currents") && (
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
          )}
        </View>
      )}

      {/* modal to save a prep as a recipe */}
      {recipeModalVisible && (
        <PrepToRecipeModal
          prepData={selectedPrepData.variants[selectedPrepVariant]}
          ingredientsSnapshot={ingredientsSnapshot}
          recipesSnapshot={recipesSnapshot}
          modalVisible={recipeModalVisible}
          closeModal={closeRecipeModal}
        />
      )}

      {/* PREP CARD SECTION */}
      <View className={`flex flex-row max-h-[80%] space-x-0.5 ${(prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "complex") && (isAdding ? "mr-[5px]" : "mr-[4px]")} ${(selectedPrepData && selectedPrepData.variants[selectedPrepVariant]?.currentData.indexOf(null) !== -1) ? "mx-1" : "justify-center items-center"}`}>
       
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
              {(selectedPrepData !== null) && (
                <Icon
                  size={15}
                  color="white"
                  name="ellipsis-horizontal-outline"
                  onPress={() => setModModalVisible(true)}
                />
              )}

              {/* Modal that appears to edit/delete a prep */}
              {(modModalVisible && selectedPrepId) && (
                <ModMealModal
                  modalVisible={modModalVisible} 
                  closeModal={closeModModal} 
                  editingId={selectedPrepId}
                  setEditingId={(value) => reloadPrep(value, true)}
                  editingData={selectedPrepData}
                  setEditingData={setSelectedPrepData}
                  defaultName={""}
                  type={"prep"}
                />
              )}
            </View>

            {/* ADD PREP MODAL */}
            {newModalVisible && (
              <AddPrepModal
                modalVisible={newModalVisible}
                setModalVisible={setNewModalVisible}
                closeModal={submitNewPrep}
                numPreps={numPreps}
                currentData={[null, ...currentData]}
              />
            )}

            {/* Text */}
            <View className="flex flex-row ml-[-30px] mr-[20px] pl-[30px] items-center justify-center w-full">

              {/* Meal Prep Dropdown */}
              <View className="flex flex-row items-center justify-center w-4/5 h-[50px] z-30">

                <View className="relative flex bg-theme800 items-center justify-center w-full">

                  {/* variant selection */}
                  {(selectedPrepData?.variants.length > 1) && (
                    <View className="absolute w-[35px] left-2 flex z-40 overflow-hidden bg-theme900/20">
                      <Picker
                        selectedValue={selectedPrepVariant}
                        onValueChange={(value) => changeVariant(value)}
                        style={{ height: 30, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -20 }}
                        itemStyle={{ color: 'black', fontWeight: '900', textAlign: 'center', fontSize: 12, }}
                      >
                        {(selectedPrepData?.variants || []).map((_, index) => (
                            <Picker.Item
                              key={index}
                              label={numberToRoman(index + 1)}
                              value={index}
                            />
                          ))
                        }
                      </Picker>
                    </View>
                  )}
                              
                  {/* current selection part */}
                  <TouchableOpacity 
                    className="flex flex-row w-full h-[50px] justify-center items-center"
                    onPress={() => setPrepDropdownOpen(!prepDropdownOpen)}
                  >
                    {/* text */}
                    <Text className={`text-white text-center font-bold text-[12px] mr-[36px] ${(selectedPrepData?.variants.length > 1) && "ml-[42px]"}`}>
                      {selectedPrepData?.prepName}
                    </Text>
    
                    {/* arrow */}
                    <View className="absolute flex right-2.5">
                      <Icon 
                        name={prepDropdownOpen ? "chevron-up" : "chevron-down"} 
                        size={18} 
                        color={colors.theme100}
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {/* mock DropDownPicker */}
                  {prepDropdownOpen && (
                    <View className="absolute top-[100%] z-50 max-h-[200px] w-full pb-1 flex flex-col bg-white border rounded-b-md">
                      {/* blank selector */}
                      <TouchableOpacity
                        className={`h-[${ITEM_HEIGHT}px] w-full bg-zinc200 border-b-0.5 border-zinc400`}
                        onPress={() => {
                          reloadPrep(null, true); 
                          setPrepDropdownOpen(false);
                        }}
                      />
                      {/* prep selector */}
                      <ScrollView ref={dropdownScrollRef}>
                        {prepList.map((prep, index) => (
                          <TouchableOpacity
                            key={index}
                            className={`flex flex-row border-b-0.5 w-full border-zinc350 justify-center items-center h-[${ITEM_HEIGHT}px] ${(prep?.id === selectedPrepId) && "bg-zinc100"}`}
                            onPress={() => {
                              reloadPrep(prep.id, true);
                              setPrepDropdownOpen(false);
                            }}
                          >
                            <View className="flex-1 flex-row justify-center items-center px-8 space-x-1.5">
                              {/* (#) label */}
                              {prepDropdownOpen &&
                                <Text className={`text-[12px] font-bold ${
                                  (prepsCompleted !== null && prepsIds.indexOf(prep.id) !== -1) && (
                                    Object.values(prepsCompleted[prepsIds.indexOf(prep.id)]).length === Object.values(prepsCompleted[prepsIds.indexOf(prep.id)]).filter(bool => bool).length
                                    ? (prep?.id === selectedPrepId ? "text-mauve800" : "text-black")
                                    : Object.values(prepsCompleted[prepsIds.indexOf(prep.id)]).length !== Object.values(prepsCompleted[prepsIds.indexOf(prep.id)]).filter(bool => !bool).length
                                    ? (prep?.id === selectedPrepId ? "text-mauve500 line-through decoration-solid" : "text-zinc500 line-through decoration-solid")
                                    : (prep?.id === selectedPrepId ? "text-mauve500 line-through decoration-double" : "text-zinc500 line-through decoration-double")
                                  )
                                }`}>
                                  {`\u00A0(${prep.variants.map(v => `${v.prepMult}`).join(':')})\u00A0`}
                                </Text>
                              }
                              <Text className={`text-[12px] font-bold ${
                                (prepsCompleted !== null && prepsIds.indexOf(prep.id) !== -1) && (
                                  Object.values(prepsCompleted[prepsIds.indexOf(prep.id)]).length === Object.values(prepsCompleted[prepsIds.indexOf(prep.id)]).filter(bool => bool).length
                                  ? (prep?.id === selectedPrepId ? "text-mauve800" : "text-black")
                                  : Object.values(prepsCompleted[prepsIds.indexOf(prep.id)]).length !== Object.values(prepsCompleted[prepsIds.indexOf(prep.id)]).filter(bool => !bool).length
                                  ? (prep?.id === selectedPrepId ? "text-mauve500 line-through decoration-solid" : "text-zinc500 line-through decoration-solid")
                                  : (prep?.id === selectedPrepId ? "text-mauve500 line-through decoration-double" : "text-zinc500 line-through decoration-double")
                                )
                              }`}>
                                {`${(selectedPrepId === prep.id && selectedPrepData) ? selectedPrepData.prepName : prep.prepName}`}
                              </Text>
                            </View>
    
                            {/* selected indicator */}
                            {(prep?.id === selectedPrepId) && (
                              <View className="w-1/12 justify-center items-center h-[30px] right-2">
                                <Icon
                                  name="checkmark"
                                  color="black"
                                  size={20}
                                />
                              </View>
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
          
                {/* Completed Button */}
                {(prepsIds !== null && selectedPrepId !== null) && (
                  <View className="absolute right-2 w-1/12 h-[50px] items-end justify-center">
                    {/* Signifier */}
                    <View className="absolute z-40">
                      <Icon
                        name={prepsCompleted?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] ? "heart-circle" : "heart-dislike-circle"}
                        size={24}
                        color={colors.zinc900}
                        onPress={() => changeCompleted()}
                      />
                    </View>
                    {/* Background */}
                    <View className="absolute z-30">
                      <Icon
                        name="ellipse"
                        size={24}
                        color={colors.zinc300}
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* Multiplicity */}
              <View className="flex flex-row bg-theme700 border-l-0.5 items-center justify-center w-1/5 h-[50px] pr-[5px] z-30">
                
                {(selectedPrepData !== null) && (
                  <>
                    {/* Input */}
                    <TextInput
                      value={String(currPrepMult)}
                      onChangeText={(text) => {
                        updateMult(text);
                        setCurrentDropdownOpen(false);
                      }}
                      placeholder={selectedPrepData ? String(selectedPrepData?.variants?.[selectedPrepVariant]?.prepMult) : "0"}
                      placeholderTextColor={'white'}
                      className="flex-1 text-center text-white font-bold text-[14px] leading-[17px]"
                    />

                    {/* Use up (decrement multiplicity)*/}
                    {(currPrepMult !== 0) && (
                      <Icon
                        size={20}
                        color="white"
                        name="checkmark-done"
                        onPress={() => decreaseMult()}
                      />
                    )}
                  </>
                )}
              </View>

              {/* to add back a prep */}
              {(selectedPrepData && selectedPrepData?.variants?.[selectedPrepVariant]?.currentData.filter(curr => curr !== null).length > 0 && (prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "currents")) && (
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
              )}

              {/* Modal that appears to delete a current prep */}
              {deleteModalVisible && (
                <DeletePrepModal
                  prepData={deletingData}
                  visible={deleteModalVisible}
                  custom={prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId]}
                  onBoth={confirmSaveDelete}
                  onSave={confirmSave}
                  onDelete={confirmDelete}
                  onCancel={cancelDelete}
                />
              )}
            </View>
          </View>
        
          {/* HEADER ROW */}
          {(selectedPrepId === null || ((prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] !== "simple") && (selectedPrepData?.variants?.[selectedPrepVariant]?.currentData.length > 0))) && (
            <View className="w-full flex flex-row h-[30px] bg-theme900 border-b-[1px] z-20">
              {(selectedPrepData !== null) && (
                <>
                  {/* ingredient header */}
                  <View className="flex items-center justify-center w-5/12 border-r-0.5">
                      <Text className="text-white text-xs font-bold">
                        INGREDIENT
                      </Text>
                  </View>

                  {/* amount header */}
                  <View className="flex items-center justify-center w-1/3 border-r-0.5">
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
              )}
            </View>
          )}
          
          {/* DETAILS SECTION */}
          {/* simple custom */}
          {(prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "simple") ? (
            <View className="flex flex-col max-h-[60%] bg-zinc700 w-full justify-center items-center px-8 py-12">
              {/* Note Input */}
              <View className="flex justify-center items-center w-full bg-white rounded-t-lg py-6 border-0.5 border-zinc500">
                <TextInput
                  className="w-full text-center text-[12px] leading-[15px]"
                  placeholder={"meal prep notes"}
                  placeholderTextColor={colors.zinc400}
                  multiline={true}
                  blurOnSubmit={true}
                  value={selectedPrepData?.variants?.[selectedPrepVariant]?.prepNote || ""}
                  onChangeText={(value) => {
                    setSelectedPrepData(prev => {
                      if (!prev) return prev;

                      const updatedVariants = [...prev.variants];
                      updatedVariants[selectedPrepVariant].prepNote = value;
                      
                      return { ...prev, variants: updatedVariants, };
                    });
                  }}
                  onBlur={() => {
                    setIsKeyboardOpen(false);
                    updateComplexPrep(-1);
                  }}
                />
              </View>

              {/* Details Input */}
              <View className="flex flex-row w-full justify-center items-center rounded-b-lg bg-theme200">
                {/* calories */}
                <View className="flex w-1/2 flex-row justify-center items-center bg-theme200 space-x-1 py-2 border-0.5 border-zinc500">
                  <TextInput
                    className="italic text-center text-[12px] pb-[5.5px]"
                    placeholder={"_"}
                    placeholderTextColor={colors.zinc400}
                    multiline={true}
                    blurOnSubmit={true}
                    value={selectedPrepData?.variants?.[selectedPrepVariant]?.prepCal || ""}
                    onChangeText={(value) => {
                      setSelectedPrepData(prev => {
                        if (!prev) return prev;

                        const updatedVariants = [...prev.variants];
                        updatedVariants[selectedPrepVariant].prepCal = validateWholeNumberInput(value);
                        
                        return { ...prev, variants: updatedVariants, };
                      });
                    }}
                    onBlur={() => {
                      setIsKeyboardOpen(false);
                      updateComplexPrep(-1);
                    }}
                  />
                  <Text className="text-center text-[12px] italic">calories</Text>
                </View>

                {/* price */}
                <View className="flex w-1/2 h-full flex-row justify-center items-center bg-theme200 py-2 border-0.5 border-zinc500">
                  <Text className="text-center text-[12px] italic">$</Text>
                  <TextInput
                    className="text-center text-[12px] italic pb-[4.5px]"
                    placeholder={"0.00"}
                    placeholderTextColor={colors.zinc400}
                    multiline={true}
                    blurOnSubmit={true}
                    value={selectedPrepData?.variants?.[selectedPrepVariant]?.prepPrice || ""}
                    onChangeText={(value) => {
                      setSelectedPrepData(prev => {
                        if (!prev) return prev;

                        const updatedVariants = [...prev.variants];
                        updatedVariants[selectedPrepVariant].prepPrice = validateDecimalInput(value);
                        
                        return { ...prev, variants: updatedVariants, };
                      });
                    }}
                    onBlur={() => {
                      setIsKeyboardOpen(false);
                      updateComplexPrep(-1);
                    }}
                  />
                </View>
              </View>
            </View>

          // complex custom
          ) : (prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "complex") ? (
            // INGREDIENTS GRID
            <ScrollView 
              className="flex flex-col z-10 bg-zinc700 h-[360px] w-full overflow-visible"
              onScroll={syncScroll}
            >
              {(selectedPrepData?.variants?.[selectedPrepVariant]?.currentData?.map((current, index) => (
                <View key={`frozen-${index}`} className="flex flex-row w-full min-h-[30px] bg-white">
                  
                  {/* ingredient names */}
                  <View className="flex items-center justify-center w-5/12 bg-theme600 border-b-0.5 border-r-0.5 border-zinc700 z-10">
                    {/* Input */}
                    <TextInput
                      className="w-full text-white font-semibold text-[10px] text-center px-2 py-2"
                      placeholder="ingredient name"
                      placeholderTextColor={colors.zinc350}
                      value={current?.ingredientName || ""}
                      onChangeText={(value) => {
                        setSelectedPrepData(prev => {
                          if (!prev) return prev;

                          const updatedVariants = [...prev.variants];
                          const updatedCurrentData = [...updatedVariants[selectedPrepVariant].currentData];

                          updatedCurrentData[index] = { ...updatedCurrentData[index], ingredientName: value, };
                          updatedVariants[selectedPrepVariant] = { ...updatedVariants[selectedPrepVariant], currentData: updatedCurrentData, };

                          return { ...prev, variants: updatedVariants, };
                        });
                      }}
                      multiline={true}
                      blurOnSubmit={true}
                      onFocus={() => setIsKeyboardOpen(true)}
                      onBlur={() => {
                        setIsKeyboardOpen(false);
                        updateComplexPrep(index);
                      }}
                    />
                  </View>

                  {/* amount */}
                  <View className="flex flex-row items-center justify-center w-1/3 bg-zinc-100 border-b-0.5 border-b-zinc400 border-r-[1px] border-r-zinc300 z-0">

                    {/* amount and units */}
                    {selectedPrepData?.variants?.[selectedPrepVariant]?.currentData?.[index] ?
                      <View className="flex flex-row space-x-[3px]">
                        {/* Amount */}
                        <TextInput
                          className="text-black text-[10px] text-center pl-4"
                          placeholder="_"
                          placeholderTextColor={colors.zinc450}
                          value={selectedPrepData?.variants?.[selectedPrepVariant]?.currentAmounts?.[index] || ""}
                          onChangeText={(value) => {
                            setSelectedPrepData(prev => {
                              if (!prev) return prev;

                              const updatedVariants = [...prev.variants];
                              const updatedCurrentAmounts = [...updatedVariants[selectedPrepVariant].currentAmounts];

                              updatedCurrentAmounts[index] = validateFractionInput(value);
                              updatedVariants[selectedPrepVariant] = { ...updatedVariants[selectedPrepVariant], currentAmounts: updatedCurrentAmounts, };

                              return { ...prev, variants: updatedVariants, };
                            });
                          }}
                          blurOnSubmit={true}
                          onFocus={() => setIsKeyboardOpen(true)}
                          onBlur={() => {
                            setIsKeyboardOpen(false);
                            updateComplexPrep(index);
                          }}
                        />
                        {/* Unit */}
                        <TextInput
                          className="text-black text-[10px] text-center pr-4"
                          placeholder="units"
                          placeholderTextColor={colors.zinc450}
                          value={extractUnit(current?.ingredientData?.[current?.ingredientStore]?.unit, selectedPrepData?.variants?.[selectedPrepVariant]?.currentAmounts?.[index]) || ""}
                          onChangeText={(value) => {
                            setSelectedPrepData(prev => {
                              if (!prev) return prev;

                              const updatedVariants = [...prev.variants];
                              const updatedCurrentData = [...updatedVariants[selectedPrepVariant].currentData];

                              updatedCurrentData[index].ingredientData[current.ingredientStore].unit = value;
                              updatedVariants[selectedPrepVariant] = { ...updatedVariants[selectedPrepVariant], currentData: updatedCurrentData, };

                              return { ...prev, variants: updatedVariants, };
                            });
                          }}
                          blurOnSubmit={true}
                          onFocus={() => setIsKeyboardOpen(true)}
                          onBlur={() => {
                            setIsKeyboardOpen(false);
                            updateComplexPrep(index);
                          }}
                        />
                      </View>
                    : null }
                  </View>

                  {/* details */}
                  <View className="flex flex-row items-center justify-evenly w-1/4 border-b-0.5 border-b-zinc400">
                    
                    {/* calories */}
                    <View className="flex flex-row justify-center items-center space-x-1">
                      <TextInput
                        className="text-black text-[10px]"
                        placeholder="_"
                        placeholderTextColor={colors.zinc450}
                        value={selectedPrepData?.variants?.[selectedPrepVariant]?.currentCals?.[index].toString() || ""}
                        onChangeText={(value) => {
                          setSelectedPrepData(prev => {
                            if (!prev) return prev;

                            const updatedVariants = [...prev.variants];
                            const updatedCurrentCals = [...updatedVariants[selectedPrepVariant].currentCals];

                            updatedCurrentCals[index] = validateWholeNumberInput(value);
                            updatedVariants[selectedPrepVariant] = { ...updatedVariants[selectedPrepVariant], currentCals: updatedCurrentCals, };

                            const newData = { ...prev, variants: updatedVariants, };
                            updateTotals(newData);
                            return newData;
                          });
                        }}
                        blurOnSubmit={true}
                        onFocus={() => setIsKeyboardOpen(true)}
                        onBlur={() => {
                          setIsKeyboardOpen(false);
                          updateComplexPrep(index);
                        }}
                      />
                      
                      {/* label */}
                      <Text className="text-[10px]">cal</Text>
                    </View>
                  </View>
            
                  {/* add / delete */}
                  <View className={`absolute flex flex-row w-[30px] h-full -right-6 justify-center ${isAdding ? "items-end -bottom-2 pr-1" : "items-center"}`}>
                    {isAdding ? (
                      <View className="rotate-180">
                        <Icon
                          name="send"
                          color={colors.zinc600}
                          size={12}
                          onPress={() => addPrepIngredient(index + 1)}
                        />
                      </View>
                    ) : (
                      <View className="ml-[2px]">
                        <Icon
                          name="close"
                          color={colors.zinc600}
                          size={16}
                          onPress={() => deletePrepIngredient(index)}
                        />
                      </View>
                    )}
                  </View>
                </View>
              )))}
                                  
              {/* empty space at the bottom if the keyboard is open */}
              {isKeyboardOpen && (
                <View className="flex flex-row h-[120px]"/>
              )}
            </ScrollView>
          
          // normal
          ) : (
            // 12 INGREDIENTS GRID
            <ScrollView 
              className="flex flex-col z-10 bg-zinc700 max-h-[360px]"
              onScroll={syncScroll}
            >
              {Array.from({ length: 12 }, (_, index) => (
                <View key={`frozen-${index}`} className="flex flex-row h-[30px] bg-white">
                  
                  {/* ingredient names */}
                  <View className={`flex items-center justify-center w-5/12 ${(currEnoughLeft[index] || selectedPrepData === null) ? "bg-theme600" : "bg-zinc500"} border-b-0.5 border-r-0.5 border-zinc700 z-10`}>
                    {/* on press, open a modal that gives the amounts */}
                    <TouchableOpacity
                      key={index}
                      onPress={() => displayAmounts(selectedPrepData.variants[selectedPrepVariant].currentData[index])}
                    >
                      <View className="flex flex-wrap flex-row">
                        <Text className="text-white font-semibold text-[10px] text-center px-2">
                          {(selectedPrepData && selectedPrepData?.variants?.[selectedPrepVariant]?.currentData[index]) ? selectedPrepData.variants[selectedPrepVariant].currentData[index].ingredientName : ""}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Modal to Display Amounts */}
                    {amountsModalVisible && (
                      <AmountsDetailsModal
                        data={amountsModalData}
                        modalVisible={amountsModalVisible}
                        setModalVisible={setAmountsModalVisible}
                      />
                    )}
                  </View>

                  {/* amount */}
                  <View className={`flex flex-row items-center justify-center ${(!currEnoughLeft[index] &&  selectedPrepData !== null) ? "bg-zinc300" : (!currMoreLeft[index] &&  selectedPrepData !== null) ? "bg-theme100" : "bg-zinc100"} w-1/3 border-b-0.5 border-b-zinc400 border-r-[1px] border-r-zinc300 z-0`}>
                    
                    {/* indicator of the current ingredient */}
                    {(selectedPrepData !== null && (selectedCurrentIndex - 1) === index) && (
                      <View className={`absolute left-[-15px] mb-[1px] z-10 ${(!currEnoughLeft[index] &&  selectedPrepData !== null) ? "bg-zinc300" : (!currMoreLeft[index] &&  selectedPrepData !== null) ? "bg-theme100" : "bg-zinc100"} h-[28px]`}>
                        <Icon
                          name="reorder-four"
                          size={30}
                          color={!currEnoughLeft[index] &&  selectedPrepData !== null ? colors.zinc400 : !currMoreLeft[index] &&  selectedPrepData !== null ? colors.zinc400 : colors.zinc350}
                        />
                      </View>
                    )}

                    {/* amount and units */}
                    {selectedPrepData?.variants?.[selectedPrepVariant]?.currentData?.[index] ?
                      <View className="flex flex-row space-x-[3px]">
                        {/* Input Amount */}
                        <TextInput
                          key={index}
                          className="text-[10px] leading-[12px] text-center"
                          placeholder={(selectedPrepData?.variants?.[selectedPrepVariant]?.currentData[index] !== null && selectedPrepData?.variants[selectedPrepVariant].currentAmounts[index] !== "") ? selectedPrepData?.variants[selectedPrepVariant].currentAmounts[index] : "_"}
                          placeholderTextColor="black"
                          value={currCurrentAmounts[index]}
                          onChangeText={(value) => {
                            setAmount(validateFractionInput(value), index);
                            setCurrentDropdownOpen(false);
                          }}
                        />
                        {/* Unit */}
                        <Text className="text-[10px]">
                          {` ${extractUnit(selectedPrepData.variants[selectedPrepVariant].currentData[index].ingredientData[selectedPrepData.variants[selectedPrepVariant].currentData[index].ingredientStore].unit, currCurrentAmounts[index])}`}
                        </Text>
                      </View>
                    : null }
                  </View>

                  {/* details */}
                  <TouchableOpacity 
                    onPress={selectedPrepData?.variants?.[selectedPrepVariant]?.currentData?.[index] ? () => showCalcModal(index) : undefined}
                    className={`flex flex-row items-center justify-evenly ${(currEnoughLeft[index] || selectedPrepData === null) ? "bg-white" : "bg-zinc200"} w-1/4 border-b-0.5 border-b-zinc400`}
                  >
                    
                    {/* calories */}
                    {selectedPrepData?.variants?.[selectedPrepVariant]?.currentCals?.[index] ?
                      <Text className="text-[10px]">
                        {selectedPrepData.variants[selectedPrepVariant].currentCals[index].toFixed(0)} {"cal"}
                      </Text>
                    : selectedPrepData?.variants?.[selectedPrepVariant]?.currentData?.[index] ?
                      <Text className="text-[10px]">
                        {"0 cal"}
                      </Text> 
                    : null }

                    {/* price */}
                    {selectedPrepData?.variants?.[selectedPrepVariant]?.currentPrices?.[index] ?
                      <Text className="text-[10px]">
                        {"$"}{selectedPrepData.variants[selectedPrepVariant].currentPrices[index].toFixed(2)}
                      </Text>
                    : selectedPrepData?.variants?.[selectedPrepVariant]?.currentData?.[index] ?
                      <Text className="text-[10px]">
                        {"$0.00"}
                      </Text> 
                    : null }
                  </TouchableOpacity>
                </View>
              ))}
                                  
              {/* empty space at the bottom if the keyboard is open */}
              {isKeyboardOpen && (
                <View className="flex flex-row h-[120px]"/>
              )}
            </ScrollView>
          )}




          {/* CALCULATION MODAL */}
          {calcModalVisible && (
            <CalcIngredientModal
              type="prep"
              modalVisible={calcModalVisible}
              setModalVisible={setCalcModalVisible}
              submitModal={submitCalcModal}
              ingredientData={selectedPrepData?.variants[selectedPrepVariant].currentData[calcIndex]}
              ingredientName={null}
              ingredientStore={selectedPrepData?.variants[selectedPrepVariant].currentData[calcIndex].ingredientStore}
              initialCals={selectedPrepData?.variants[selectedPrepVariant].currentCals[calcIndex].toFixed(0)}
              initialPrice={selectedPrepData?.variants[selectedPrepVariant].currentPrices[calcIndex].toFixed(2)}
              initialServings={null}
              initialAmount={selectedPrepData?.variants[selectedPrepVariant].currentAmounts[calcIndex]}
              totalAmountUsed={totalAmtUsed}
              amountsUsed={otherAmtsUsed}
              othersUsed={otherPrepsUsed}
              selectedUsed={null}
              altPrepVariants={altPrepVariants}
              amountContainer={new Fraction(selectedPrepData.variants[selectedPrepVariant].currentData[calcIndex].amountTotal === "" ? 0 : selectedPrepData.variants[selectedPrepVariant].currentData[calcIndex].amountTotal) * 1}
              servingSize={
                new Fraction(selectedPrepData?.variants[selectedPrepVariant].currentData[calcIndex].ingredientData[selectedPrepData?.variants[selectedPrepVariant].currentData[calcIndex].ingredientStore].servingSize) * 1 === 0 
                ? // if completely custom
                  1
                : // if pre-existing
                  new Fraction (selectedPrepData?.variants[selectedPrepVariant].currentData[calcIndex].ingredientData[selectedPrepData?.variants[selectedPrepVariant].currentData[calcIndex].ingredientStore].servingSize) * 1
              }
            />
          )}

          {/* TOTAL ROW */}
          {(selectedPrepId === null || ((prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] !== "simple") && (selectedPrepData?.variants?.[selectedPrepVariant]?.currentData.length > 0))) && (
            <View className="flex flex-row h-[30px] border-t-[0.25px] border-b-[1px] z-20 bg-theme800 w-full">
              
              {(selectedPrepData !== null) && (
                <View className="flex flex-row items-center justify-center w-full border-r-0.5 bg-theme800">
                  
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
                      {selectedPrepData?.variants?.[selectedPrepVariant]?.prepCal ?
                        <Text className="text-white text-xs italic">
                          {selectedPrepData.variants[selectedPrepVariant].prepCal} {"cal"}
                        </Text>
                      : 
                        <Text className="text-white text-xs italic">
                          {"0 cal"}
                        </Text> 
                      }
                    </View>

                    {/* price */}
                    <View>
                      {selectedPrepData?.variants?.[selectedPrepVariant]?.prepPrice ? (
                        <>
                          {(prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "currents") ? (
                            <Text className="text-white text-xs italic">
                              {"$"}{selectedPrepData.variants[selectedPrepVariant].prepPrice}
                            </Text>
                          ) : (                    
                          <View className="flex flex-row">
                            {/* label */}
                            <Text className="text-white text-[12px] leading-[14px] italic">$</Text>

                            <TextInput
                              className="text-white text-[12px] leading-[14px] italic"
                              placeholder="0.00"
                              placeholderTextColor={colors.zinc450}
                              value={selectedPrepData?.variants?.[selectedPrepVariant]?.prepPrice || ""}
                              onChangeText={(value) => {
                                setSelectedPrepData(prev => {
                                  if (!prev) return prev;

                                  const updatedVariants = [...prev.variants];
                                  updatedVariants[selectedPrepVariant].prepPrice = validateDecimalInput(value);
                                  
                                  return { ...prev, variants: updatedVariants, };
                                });
                              }}
                              blurOnSubmit={true}
                              onFocus={() => setIsKeyboardOpen(true)}
                              onBlur={() => {
                                setIsKeyboardOpen(false);
                                updateComplexPrep(-1);
                              }}
                            />
                          </View>
                          )}
                        </>
                      ) : (
                        <Text className="text-white text-xs italic">
                          {"$0.00"}
                        </Text> 
                      )}
                    </View>
                  </View>        
                </View>
              )}
            </View>
          )}
                
          {/* CUSTOM INDICATOR */}
          {(prepsIds !== null && selectedPrepId !== null) && (
            <View className="flex flex-row z-20 justify-center items-center space-x-3 bg-zinc900 border-t-2 mt-[-1px] pb-[2px] h-[30px]">
              
              {/* type of custom */}
              {(prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] !== "currents") && (
                <View className="absolute left-2">
                  <Icon
                    name={(prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "complex") ? "information-circle" : "information-circle-outline"}
                    color={colors.theme100}
                    size={16}
                    onPress={() => changeCustom(prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "complex" ? "simple" : "complex")}
                  />
                </View>
              )}

              {/* text */}
              <Text className="font-bold text-[12px] text-zinc300 italic">
                {prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "currents" ? "NORMAL" : "CUSTOM"}
              </Text>

              {/* toggle button */}
              <View className="justify-center items-center" style={ (prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "currents") ? null : { transform: [{ scaleX: -1 }] } }>
                <Icon
                  name="toggle"
                  size={20}
                  color={colors.zinc100}
                  onPress={() => changeCustom(prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "currents" ? "complex" : "currents")}
                />
              </View>

              {/* copy from */}
              {(prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] !== "currents") && (
                <View className="absolute right-2">
                  <Icon
                    name="archive"
                    color={colors.theme100}
                    size={16}
                    onPress={() => fetchPlans()}
                  />
                </View>
              )}
            </View>
          )}
        </View> 
            
        {/* Checkbox Column */}
        {(prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "currents") && (
          <View className={`flex ${(prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "currents" ? "mt-[82px]" : "mt-[25px] mr-[-4px]")} z-40`}>
            <ScrollView 
              className="max-h-[360px]"
              contentOffset={{ y: scrollY }}
              scrollEnabled={false}
            >
              {(selectedPrepData?.variants?.[selectedPrepVariant]?.currentData?.map((current, index) => (
                <View key={`store-${index}`}>
                  {current ?
                    <View className="flex flex-row h-[30px] justify-center items-center">
                      <Icon
                        name={selectedPrepData.variants[selectedPrepVariant].currentIncluded[index] ? "checkbox" : "square-outline"}
                        color={colors.zinc600}
                        size={16}
                        onPress={() => updateCheck(index)}
                      />
                    </View>
                  : 
                    <View className="flex flex-row h-[30px]"/>
                  }
                </View>
              )))}

              {/* empty space at the bottom if the keyboard is open */}
              {isKeyboardOpen && (
                <View className="flex flex-row h-[120px]"/>
              )}
            </ScrollView>  
          </View>  
        )}

        {/* COPY MODAL */}
        <CopyMealModal
          type={prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId]}
          snapshot={plansSnapshot}
          modalVisible={copyModalVisible}
          setModalVisible={setCopyModalVisible}
          closeModal={closeCopyModal}
        />
            
        {/* Select Add Index Column */}
        {(prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "complex" && isAdding) && (
          <View className={`absolute top-0 right-0 flex ${(selectedPrepData?.variants?.[selectedPrepVariant]?.currentData.length > 0) ? "mt-[75px]" : "mt-[45px]"} mr-[-12px]`}>
            {/* first row */}
            <View className="flex rotate-180 justify-start">
              <Icon
                name="send"
                color={colors.zinc600}
                size={12}
                onPress={() => addPrepIngredient(0)}
              />
            </View>
          </View>  
        )}
      </View>
              
      {/* ADD */}
      {(prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "complex") && (
        <View className="h-[10%] w-2/3">
          <TouchableOpacity 
            className="mt-6 w-full flex justify-center items-center bg-zinc350 py-2 border-[1px] border-zinc400"
            onPress={() => setIsAdding(!isAdding)}
          >
            <Icon
              name={isAdding ? "close-outline" : "add"}
              size={16}
              color={colors.zinc900}
            />
          </TouchableOpacity>
        </View>
      )}


      {/* CURRENT INGREDIENT SELECTION SECTION */}
      {((selectedPrepData !== null) && (prepsCustom?.[prepsIds?.indexOf(selectedPrepId)]?.[selectedPrepData?.variants?.[selectedPrepVariant]?.variantId] === "currents")) && (
        <View className="flex flex-row h-[16.5%] items-center justify-center">

          {/* Left Boxes */}
          <View className="flex flex-col pr-[10px] items-center justify-center">

            {/* Index Picker */}
            <View className="flex z-0 w-[130px] bg-zinc700 border-0.5 border-zinc900 overflow-hidden">
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
            <View className="flex z-0 w-[130px] bg-theme200 border-0.5 border-theme400 overflow-hidden">
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
                const displayStoreBrand = (ingredientIdCounts[current.ingredientId] > 1 && current.ingredientId !== "")
                  ? ` (${current.ingredientData[current.ingredientStore].brand !== "" ? current.ingredientData[current.ingredientStore].brand : "no brand" || ""})` 
                  : "";
                // returns results
                return {
                  label: current.ingredientName + displayStoreBrand,
                  value: current.id,
                  key: current.id,
                  labelStyle: { 
                    color: 'black',
                    flex: 1, 
                    flexWrap: 'wrap' 
                  },
                  containerStyle: {
                    height: 'auto', 
                    minHeight: 42,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    justifyContent: 'center', 
                    alignItems: 'center', 
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
                return ( <Icon size={18} color={ colors.theme100 } name="chevron-down" /> );
              }}
              ArrowUpIconComponent={() => {
                return ( <Icon size={18} color={ colors.theme100 } name="chevron-up" /> );
              }}
            />
          </View>
          

          {/* BUTTONS */}
          <View className="flex ml-[10px] justify-center">
            <View className="flex flex-col space-y-[3px] items-center rounded bg-zinc300 py-1">
                              
              {/* Submit */}
              {(selectedCurrentId !== "" && selectedCurrentId !== null) && (
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
              )}

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
              {(selectedPrepData?.variants?.[selectedPrepVariant]?.currentData?.[selectedCurrentIndex - 1] !== null) && (
                <Icon
                  name="trash"
                  size={18}
                  color={colors.theme900}
                  onPress={() => deleteCurrent()}
                />
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};