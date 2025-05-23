///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useRef, useState, useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';

// UI components
import { View, Text, ScrollView, TextInput, TouchableOpacity, Keyboard, Image} from 'react-native';
import { Picker } from '@react-native-picker/picker';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// store lists
import storeKeys from '../../assets/storeKeys';
import storeImages from '../../assets/storeImages';

// fractions
var Fractional = require('fractional').Fraction;

// validation
import validateFractionInput from '../../components/Validation/validateFractionInput';
import extractUnit from '../../components/Validation/extractUnit';

// modals
import DeleteCurrentModal from '../../components/Prep-Currents/DeleteCurrentModal';
import ModPriceModal from '../../components/Prep-Currents/ModPriceModal';
import ViewCurrentModal from '../../components/Prep-Currents/ViewCurrentModal';
import ViewIngredientModal from '../../components/MultiUse/ViewIngredientModal';
import ModCurrentModal from '../../components/Prep-Currents/ModCurrentModal';

// firebase
import currentAdd from '../../firebase/Currents/currentAdd';
import currentEdit from '../../firebase/Currents/currentEdit';

// initialize firebase app
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
    
    const snapshot = await getDocs(collection(db, 'PREPS'));
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
  const [selectedIngredientStore, setSelectedIngredientStore] = useState("-");
  
  // for filtering
  const [filteredIngredientData, setFilteredIngredientData] = useState([]);

  // for ingredient dropdown
  const [ingredientDropdownOpen, setIngredientDropdownOpen] = useState(false);

  // gets the list of ingredients
  const updateIngredients = async () => {

    // gets the data
    const snapshot = await getDocs(collection(db, 'INGREDIENTS'));
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
            .flatMap(item => item.ingredientTypes)
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
        Array.isArray(ingredient.ingredientTypes) && ingredient.ingredientTypes.includes(selectedIngredientType)
      );
    }

    // filers for store
    if (selectedIngredientStore !== "-") {
      filtered = filtered.filter(ingredient => 
        ingredient.ingredientData[selectedIngredientStore]?.brand !== ""
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
    const ingredientStores = ["-", ...storeKeys];
    setSelectedIngredientStore(ingredientStores[(ingredientStores.indexOf(selectedIngredientStore) + 1) % (storeKeys.length + 1)]); 
  }


  ///////////////////////////////// INGREDIENT LOGIC /////////////////////////////////

  // for the ingredient search textinput
  const [searchIngredientQuery, setSearchIngredientQuery] = useState('');
  const [selectedIngredientId, setSelectedIngredientId] = useState("");
  const [selectedIngredientData, setSelectedIngredientData] = useState(null);
  const [selectedIngredientName, setSelectedIngredientName] = useState("");
  const [selectedIngredientTypes, setSelectedIngredientTypes] = useState([]);


  // for when an ingredient is selected from the dropdown that appears above the textinput
  const pickIngredient = (item) => {
    
    // stores the selection
    setSearchIngredientQuery(item.ingredientName);
    setSelectedIngredientId(item.id);
    setSelectedIngredientData(item.ingredientData);
    setSelectedIngredientName(item.ingredientName);
    setSelectedIngredientTypes(item.ingredientTypes)
    
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
    setSelectedIngredientName("");
    setSelectedIngredientTypes("");
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
        
        const currStore = storeKeys[0];
        let nextStore = currStore;
        
        // if a store is not being filtered, calculates the initial store based on the brands that are and are not empty
        if (selectedIngredientStore === "-") {

          const ingredientKeys = ["-", ...storeKeys];

          // loops over the stores to find the next filled in one
          for (let i = 0; i < ingredientKeys.length; i++) {
            if (selectedIngredientData[ingredientKeys[(ingredientKeys.indexOf(currStore) + i) % ingredientKeys.length]].brand !== "") {
              nextStore = ingredientKeys[(ingredientKeys.indexOf(currStore) + i) % ingredientKeys.length];
              break;
            }
          }
        // otherwise, just use the selected store
        } else {
          nextStore = selectedIngredientStore;
        }
        
        // stores overall data
        const data = {
          '-': { calServing: "", servingSize: "", unit: "" },
          ...selectedIngredientData,
        };

        // adds the current ingredient
        await currentAdd(
          selectedIngredientId, data, selectedIngredientName, nextStore, selectedIngredientTypes, showArchive
        );

 
      // if submitting a new (temporary) ingredient
      } else {
        
        // stores blank data with the name as the query
        let data = { '-': { calServing: "", servingSize: "", unit: "" } };
        storeKeys.forEach(storeKey => { data[storeKey] = { brand: "", calContainer: "", calServing: "", link: "", priceContainer: "", priceServing: "", servingContainer: "", servingSize: "", totalYield: "", unit: "" }; });       
        
        // adds the current ingredient
        await currentAdd(selectedIngredientId, data, searchIngredientQuery, "-", [], showArchive);
      }

      // refreshes current 
      const currents = await loadCurrents();
      
      // stores the id of the selected ingredient if valid or the name if not (temp ingredient)
      setNewIds((prevNewIds) => [
        ...prevNewIds, 
        selectedIngredientId !== "" ? selectedIngredientId : searchIngredientQuery
      ]);

      // finds the index of the new current and scrolls to the correct y value
      const itemHeight = 50;
      const idx = currents.map(current => current.ingredientName).indexOf(searchIngredientQuery);
      setScrollY(idx * itemHeight);
      if (verticalScrollRef.current) { verticalScrollRef.current.scrollTo({ y: idx * itemHeight, animated: false }); }
        
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
    setDeleteName(currentList[index].ingredientName);
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
    const querySnapshot = await getDocs(collection(db, 'CURRENTS'));

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
      const nameA = a.data.ingredientName.toLowerCase(); // Convert to lowercase for case-insensitive comparison
      const nameB = b.data.ingredientName.toLowerCase();
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

    return allData;
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
          amountLeft: currentList[index].amountLeft, 
          amountTotal: newValue, 
          archive: currentList[index].archive,
          check: newValue === "0",
          containerPrice: currentList[index].containerPrice, 
          ingredientData: currentList[index].ingredientData,  
          ingredientId: currentList[index].ingredientId, 
          ingredientName: currentList[index].ingredientName, 
          ingredientStore: currentList[index].ingredientStore, 
          ingredientTypes: currentList[index].ingredientTypes, 
          unitPrice: currentList[index].unitPrice, 
        });
      }

      // recalculate the amount left of the current ingredient
      await calcAmountsLeft(index);
    

    // if the new value is empty
    } else {
      await currentEdit({
        editingId: currentIds[index],
        amountLeft: "?", 
        amountTotal: newValue, 
        archive: currentList[index].archive,
        check: newValue === "0",
        containerPrice: currentList[index].containerPrice, 
        ingredientData: currentList[index].ingredientData,  
        ingredientId: currentList[index].ingredientId, 
        ingredientName: currentList[index].ingredientName, 
        ingredientStore: currentList[index].ingredientStore, 
        ingredientTypes: currentList[index].ingredientTypes, 
        unitPrice: currentList[index].unitPrice, 
      });      

      // refreshes data
      await loadCurrents();
    }
  };


  ///////////////////////////////// CURRENT AMOUNTS LEFT /////////////////////////////////

  // to calculate the amount left of the given current ingredient
  const calcAmountsLeft = async (index) => {
    
    // gets the current ingredient data
    const currentDocSnap = await getDoc(doc(db, 'CURRENTS', currentIds[index]));
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
      await updateDoc(doc(db, 'CURRENTS', currentIds[index]), { amountLeft: calcAmount.toString() });

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
        amountLeft: currentList[priceIndex].amountLeft, 
        amountTotal: currentList[priceIndex].amountTotal, 
        archive: currentList[priceIndex].archive,
        check: currentList[priceIndex].amountTotal === "0",
        containerPrice: newContainerPrice, 
        ingredientData: currentList[priceIndex].ingredientData,  
        ingredientId: currentList[priceIndex].ingredientId, 
        ingredientName: currentList[priceIndex].ingredientName, 
        ingredientStore: currentList[priceIndex].ingredientStore, 
        ingredientTypes: currentList[priceIndex].ingredientTypes, 
        unitPrice: newUnitPrice, 
      });
    }

    setNewIds((prevNewIds) => [
      ...prevNewIds, 
      currentList[priceIndex].ingredientId !== "" 
        ? currentList[priceIndex].ingredientId 
        : currentList[priceIndex].ingredientName
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

    // calculates the next store based on the brands that are and are not empty
    for (let i = 1; i <= storeKeys.length; i++) {
      const nextStore = storeKeys[(storeKeys.indexOf(currStores[index]) + i) % storeKeys.length];
      if (currentList[index].ingredientData[nextStore].brand !== "") {
        newValue = nextStore;
        break;
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
        amountLeft: currentList[index].amountLeft, 
        amountTotal: currentList[index].amountTotal, 
        archive: currentList[index].archive,
        check: currentList[index].amountTotal === "0",
        containerPrice: currentList[index].containerPrice, 
        ingredientData: currentList[index].ingredientData,  
        ingredientId: currentList[index].ingredientId, 
        ingredientName: currentList[index].ingredientName, 
        ingredientStore: newValue,
        ingredientTypes: currentList[index].ingredientTypes, 
        unitPrice: currentList[index].unitPrice, 
      });

      // reloads the current ingredients
      await loadCurrents();
    }
  };


  ///////////////////////////////// MODIFYING A TEMPORARY CURRENT /////////////////////////////////
  
  const [modModalVisible, setModModalVisible] = useState(false);
  const [currentModId, setCurrentModId] = useState(null);
  const [currentModData, setCurrentModData] = useState(null);

  // when opening the mod modal
  const openModModal = (currData, currId) => {
    setCurrentModData(currData);
    setCurrentModId(currId);
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
  const [currentViewData, setCurrentViewData] = useState(null);

  // populated with snapshot
  const [currPrepList, setCurrPrepList] = useState(null);
  const [currAmountList, setCurrAmountList] = useState(null);
  const [currMultList, setCurrMultList] = useState(null);
  
  // when opening the mod modal to view a non temp current
  const openViewModal = (index) => {
    const initialData = {
      name: currentList[index].ingredientName,
      servingSize: currentList[index].ingredientData[currStores[index]].servingSize,
      unit: currentList[index].ingredientData[currStores[index]].unit,
      calServing: currentList[index].ingredientData[currStores[index]].calServing,
    }
    
    setCurrentViewData(initialData);

    // empty arrays to populate
    const prepList = [];
    const amountList = [];
    const multList = [];
    
    // loops through the recipes and adds all data
    prepsSnapshot.forEach((doc) => {
      for (let i = 0; i < 12; i++) {
        if (doc.data().currentData[i] !== null) {
          const listId = currentList[index].ingredientId === "" ? currentList[index].ingredientName : currentList[index].ingredientId;
          const dataId = doc.data().currentData[i].ingredientId === "" ? doc.data().currentData[i].ingredientName : doc.data().currentData[i].ingredientId;
          if (listId === dataId) {
            prepList.push(doc.data().prepName);
            amountList.push(doc.data().currentAmounts[i] + " " + extractUnit(doc.data().currentData[i].ingredientData[doc.data().currentData[i].ingredientStore].unit, doc.data().currentAmounts[i]));
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
    setCurrentViewData(null);
    setCurrentModalVisible(false);
  };


  ///////////////////////////////// IMPORTING INGREDIENTS FROM SHOPPING LIST /////////////////////////////////

  // the list of recently modified ids
  const [newIds, setNewIds] = useState([]);

  // helper function to retrieve and augment the shopping list data
  const getShoppingListWithStore = async (docPath, storeIdentifier) => {
    
    // gets the current data
    const docSnap = await getDoc(doc(db, 'SHOPPING', docPath));                   
    const data = docSnap.exists() ? docSnap.data() : null;

    // adds the store attribute if data and id exist
    if (data && data.id) {
      data.store = Array(data.id.length).fill(storeIdentifier);
    }
    
    return data;
  };
  
  // helper function to merge the lists of store shopping lists
  const mergeShoppingLists = async () => {
    
    // the object of all shopping lists, stacked on top of each other
    const allData = {};
    for (const storeKey of storeKeys) {
      allData[storeKey] = await getShoppingListWithStore("list" + storeKey, storeKey);
    }
    
    // concatenates all the list's keys together
    const mergedList = {
      amountNeeded: storeKeys.map(storeKey => allData[storeKey].amountNeeded).flat(),
      brand: storeKeys.map(storeKey => allData[storeKey].brand).flat(),
      check: storeKeys.map(storeKey => allData[storeKey].check).flat(),
      costTotal: storeKeys.map(storeKey => allData[storeKey].costTotal).flat(),
      costUnit: storeKeys.map(storeKey => allData[storeKey].costUnit).flat(),
      id: storeKeys.map(storeKey => allData[storeKey].id).flat(),
      included: storeKeys.map(storeKey => allData[storeKey].included).flat(),
      link: storeKeys.map(storeKey => allData[storeKey].link).flat(),
      name: storeKeys.map(storeKey => allData[storeKey].name).flat(),
      notes: storeKeys.map(storeKey => allData[storeKey].notes).flat(),
      store: storeKeys.map(storeKey => allData[storeKey].store).flat(),
      totalYield: storeKeys.map(storeKey => allData[storeKey].totalYield).flat(),
      types: storeKeys.map(storeKey => allData[storeKey].types).flat(),
      unit: storeKeys.map(storeKey => allData[storeKey].unit).flat(),
      yieldNeeded: storeKeys.map(storeKey => allData[storeKey].yieldNeeded).flat()
    };

    return mergedList;
  };


  // to import the list of ingredients from the shopping list
  const importIngredients = async () => {
    
    // the combined shopping list from the helper function
    const combinedData = await mergeShoppingLists();
    
    // gets the list of ingredient IDs from currentList - matching the archive
    const ingredientIds = currentList.map((ingredient) => ingredient.ingredientId).filter((id, index) => currentList[index].archive === showArchive);
    const ingredientStores = currentList.map((ingredient) => ingredient.ingredientStore).filter((store, index) => currentList[index].archive === showArchive);
    
    // loops over the combined shopping list to find them in the current list of ingredients
    for (let i = 0; i < combinedData.id.length; i++) {
      const index = ingredientIds.indexOf(combinedData.id[i]);
      
      // only imports the ingredients with a needed yield (from spotlights with a mult of > 0) and that are included
      if (combinedData.yieldNeeded[i] !== 0 && new Fractional(combinedData.yieldNeeded[i]).numerator !== undefined && combinedData.included[i]) {

        // if the current ingredient of the combined list is in the current list
        if (index !== -1 && combinedData.store[i] === ingredientStores[index]) {
          // calculate the total amount and amount left using both the current and shopping list amounts
          const amountTotal = ((new Fractional(
            currentList[index].amountTotal === "" ? "0" 
            : currentList[index].amountTotal)).add(((new Fractional(combinedData.amountNeeded[i])).multiply(new Fractional(combinedData.totalYield[i]))).toString())).toString();
          const amountLeft = 
            currentList[index].amountLeft === "?" 
            ? (new Fractional(combinedData.amountNeeded[i])).multiply(new Fractional(combinedData.totalYield[i])).toString()
            : (new Fractional(currentList[index].amountLeft)).add(((new Fractional(combinedData.amountNeeded[i])).multiply(new Fractional(combinedData.totalYield[i]))).toString()).toString();
          // edits the current ingredient accordingly
          await currentEdit({
            editingId: currentIds[index],
            amountLeft: amountLeft.toString(), 
            amountTotal: amountTotal.toString(), 
            archive: currentList[index].archive, 
            check: amountTotal.toString() === "0", 
            containerPrice: currentList[index].containerPrice, 
            ingredientData: currentList[index].ingredientData, 
            ingredientId: currentList[index].ingredientId, 
            ingredientName: currentList[index].ingredientName, 
            ingredientStore: currentList[index].ingredientStore,
            ingredientTypes: currentList[index].ingredientTypes,
            unitPrice: currentList[index].unitPrice, 
          });


        // if the current ingredient of the combined list is new (not in the current list)
        } else {   
          // calculate the total amount and amount left based only on the shopping list
          const amountTotal = ((new Fractional(combinedData.amountNeeded[i])).multiply(new Fractional(combinedData.totalYield[i]))).toString();
          const amountLeft = ((new Fractional(combinedData.amountNeeded[i])).multiply(new Fractional(combinedData.totalYield[i]))).toString();
          
          // gets the ingredient data
          const docSnap = await getDoc(doc(db, 'INGREDIENTS', combinedData.id[i])); 
          const data = docSnap.exists() ? docSnap.data() : null;
          
          // stores overall data
          const overallData = {
            '-': { calServing: "", servingSize: "", unit: "" },
            ...data.ingredientData,
          };
          
          // adds the current ingredient, since it is new
          await currentAdd(combinedData.id[i], overallData, combinedData.name[i], combinedData.store[i], data.ingredientTypes, showArchive, {
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
  const updateFilter = (archive) => {
    
    // to store the indices that match the filtering
    let matchingIndices = [];

    // loops over the current list
    currentList.forEach((current, index) => {

      // finds the matching indices based off of the icon
      if ((currentFilter === "square" 
          || (currentFilter === "checkbox" && current.check) 
          || (currentFilter === "checkbox-outline" && !current.check && current.amountLeft === "0")
          || (currentFilter === "square-outline" && !current.check && current.amountLeft > "0")
          || (currentFilter === "warning" && !current.check && current.amountLeft < "0"))
        && (archive === currentList[index]?.archive)
      ) {
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
    updateFilter(showArchive);
  }, [currentFilter, currentList])


  ///////////////////////////////// VIEWING INGREDIENT /////////////////////////////////

  const [ingredientModalVisible, setIngredientModalVisible] = useState(false);


  ///////////////////////////////// ARCHIVE /////////////////////////////////

  const [showArchive, setShowArchive] = useState(false);

  // to change the archive status of the selected ingredient
  const changeArchive = async (index) => {
    
    // gets a copy of the item to update
    const updatedItem = {
      ...currentList[index],
      archive: !currentList[index].archive,
    };
    
    // updates state locally
    setCurrentList((prev) => {
      const updatedList = [...prev];
      updatedList[index] = updatedItem;
      return updatedList;
    });
    
    // updates db
    await updateDoc(doc(db, 'CURRENTS', currentIds[index]), { archive: updatedItem.archive });
  }
  
  // vertical scroll syncing
  const [scrollY, setScrollY] = useState(0);
  const verticalScrollRef = useRef(null);

  const syncVerticalScroll = (e) => {
    const contentOffsetY = e.nativeEvent.contentOffset.y;
    setScrollY(contentOffsetY);
  };


  ///////////////////////////////// HTML /////////////////////////////////

  return (
    
    // CONTAINER
    <View className="flex-1 items-center justify-center bg-zinc200 border-0.5">

      {/* Number of meal preps */}
      <View className="flex justify-center items-center w-5/6 h-[30px] mb-3 bg-zinc400 border-0.5 rounded-md">
        <Text className="text-[14px] font-bold text-black">
          {numPreps} {"MEAL PREP(S)"}
        </Text>
      </View>

      {/* CURRENT SECTION */}
      <View className="flex flex-row">
        <View className="w-11/12 ml-[5px] border-[1px] border-black bg-zinc700">

          {/* HEADER ROW */}
          <View className="flex flex-row absolute h-[30px] bg-theme900 border-[1px] border-black z-10">
              
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
            <View className="flex flex-row  space-x-4 items-center justify-center w-2/5 border-r-[1px]">
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
            <View className="flex items-center justify-center w-[35%] border-r-0.5">
              <Text className="text-white text-xs font-bold">
                AMOUNT
              </Text>
            </View>

            {/* unit price header */}
            <View className="flex items-center justify-center w-1/6">
              <Text className="text-white text-xs font-bold">
                UNIT $
              </Text>
            </View>
          </View>
        
          {/* SCROLLABLE INGREDIENT GRID */}
          <ScrollView
            className="flex-1 my-[30px] w-full h-2/3"
            scrollEventThrottle={16}
            onScroll={syncVerticalScroll}
            ref={verticalScrollRef}
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
                      <View className="flex flex-col pt-2 items-center justify-center bg-theme500 w-1/12 border-b-0.5 border-b-theme900">
                        
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
                        onPress={() => openViewModal(index)}
                        className={`flex items-start justify-center w-2/5 border-b-0.5 border-r-0.5 border-r-theme900 pl-1 pr-[5px] ${curr.ingredientId === "" && newIds.indexOf(curr.ingredientName) !== -1 ? "bg-zinc500 border-b-zinc700" : newIds.indexOf(curr.ingredientId) === -1 ? "bg-theme600 border-b-theme900" : "bg-zinc500 border-b-zinc700"}`}
                      >
                        <Text className="text-white text-[12px]">
                          {curr && curr.ingredientData ? curr.ingredientName : ""}
                        </Text>
                      </TouchableOpacity>

                      {/* Modal that appears to view an ingredient */}
                      {currentModalVisible && (
                        <ViewCurrentModal 
                          modalVisible={currentModalVisible} 
                          closeModal={closeViewModal}
                          ingredientData={currentViewData}
                          prepList={currPrepList}
                          amountList={currAmountList}
                          multList={currMultList}
                        />
                      )}

                      {/* amount */}
                      <View className={`flex flex-row items-center justify-center bg-white w-[35%] border-b-0.5 border-b-zinc400 z-20`}>
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
                                  onBlur={() => updateFilter(showArchive)}
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
                                <Text className={`text-[12px] ${curr.ingredientData[currStores[index]].unit === undefined || curr.ingredientData[currStores[index]].unit === "" ? "bg-zinc200" : "bg-white"}`}>
                                  {` ${curr.ingredientData[currStores[index]].unit === undefined || curr.ingredientData[currStores[index]].unit === "" ? "unit(s)" : curr.ingredientData[currStores[index]].unit}`}
                                </Text>
                              </View>
                            </View>

                            {/* Store Logo */}
                            <View className="flex justify-start absolute right-0 w-[30px] h-[50px] -mr-2">
                              {currStores[index] === "-" ? 
                                <View className="mt-[6.5px] w-full justify-center items-center">
                                  <Icon
                                    name="create"
                                    size={18}
                                    color={colors.theme500}
                                    onPress={() => openModModal(currentList[index], currentIds[index])}
                                  />
                                </View>
                                :
                                <View className="w-full justify-center items-center">
                                  <TouchableOpacity 
                                    onPress={() => updateStores(index)} 
                                  >
                                    <View className={`${currStores[index] === "Aldi" ? "mt-[10px]" : "mt-[8px]"}`}>
                                      {currStores[index] === "-" ? (
                                        <Text>-</Text>
                                      ) : (
                                        <Image
                                          source={storeImages[currStores[index]]?.src}
                                          alt="store"
                                          style={{
                                            width: storeImages[currStores[index]]?.width,
                                            height: storeImages[currStores[index]]?.height,
                                          }}
                                        />
                                      )}
                                    </View>
                                  </TouchableOpacity>
                                  <Icon 
                                    name="ellipsis-horizontal"
                                    color={colors.zinc500}
                                    size={18}
                                    onPress={() => openModModal(currentList[index], currentIds[index])}
                                  />
                                </View>
                              }
                            </View>
                          </View>
                        : null }
                      </View>

                      {/* Modal that appears to edit an ingredient */}
                      {(modModalVisible && currentModData) && (
                        <ModCurrentModal 
                          modalVisible={modModalVisible} 
                          closeModal={closeModModal}
                          initialData={currentModData}
                          editingId={currentModId}
                        />
                      )}

                      {/* price */}
                      <TouchableOpacity
                        className="flex flex-row items-center justify-center w-1/6 border-b-0.5 border-b-zinc450 bg-zinc100"
                        onPress={() => changePrice(index)}
                        activeOpacity={0.9}
                      >
                        {/* Amount */}
                        {Array.isArray(currPrices) && currPrices[index] !== "" &&
                          <Text className={`text-[12px] leading-[15px] text-center ${(currPrices[index] === "0.00" || currPrices[index] === "0.0000") ? "bg-zinc200 p-0.5" : "bg-zinc100"}`}>
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

        {/* Archive Column */}
        <View className={`${currentList.length === 0 ? "w-[0px]" : "w-[20px]"} my-[30px]`}>
        
          {/* SCROLLABLE INGREDIENT GRID */}
          <ScrollView
            className="w-full h-2/3"
            contentOffset={{ y: scrollY }}
            scrollEnabled={false}
          >
            <View className="flex flex-col">
              
              {/* Maps over the list of current ingredients */}
              {currentList.length > 0 && currentList.map((curr, index) => (

                // only shows the ones that fit the filtering
                <View key={`curr-${index}`}>
                  {filteredIndices[index] ?

                    // archive button
                    <View className="flex justify-center items-center h-[50px]">
                      <Icon
                        name={showArchive ? "lock-closed" : "lock-open"}
                        color={colors.zinc700}
                        size={16}
                        onPress={() => changeArchive(index)}
                      />
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

      {/* ARCHIVE INDICATOR */}
      <View className={`flex flex-row ${currentList.length === 0 ? "w-[0px]" : "w-11/12"} mr-[15px] justify-center items-center space-x-3 bg-zinc900 mt-[-30px] h-[30px]`}>
        
        {/* text */}
        <Text className="font-bold text-[12px] text-zinc300 italic">
          {showArchive ? "SHOWING ARCHIVE" : "HIDING ARCHIVE"}
        </Text>

        {/* toggle button */}
        <View className="justify-center items-center" style={ showArchive ? null : { transform: [{ scaleX: -1 }] } }>
          <Icon
            name="toggle"
            size={20}
            color={colors.zinc100}
            onPress={() => {
              setShowArchive(!showArchive);
              updateFilter(!showArchive);
            }}
          />
        </View>
      </View>
      
      {/* INGREDIENT FILTERING SECTION */}
      <View className="flex flex-row mt-[20px] space-x-4">

        {/* Left Boxes */}
        <View className="flex flex-col items-center justify-center">
        
          {/* Ingredient Addition Info */}
          <View className="flex flex-row z-0 w-[160px] h-[30px] space-x-2 justify-center items-center bg-zinc700 border-0.5 border-zinc900">
            
            {/* Current Ingredient Number */}
            <Text className="font-bold text-zinc100 text-[12px]">
              INGREDIENT {currentList.filter(current => current?.archive === showArchive).length + 1}
            </Text>

            {/* Submit */}
            {searchIngredientQuery !== "" &&
            <Icon
              name="checkmark-circle"
              size={17}
              color={colors.zinc100}
              onPress={() => submitIngredient()}
            />
            }
          </View>
        
          {/* Bottom Row */}
          <View className="flex w-[160px] flex-row z-0 border-0.5 border-theme400">
            
            {/* store selection */}
            <TouchableOpacity 
              className="z-10 w-[30px] bg-zinc100 border-2 border-theme200 justify-center items-center"
              onPress={() => changeSelectedStore()}
            >
              {selectedIngredientStore === "-" 
              ? // when no store is selected
              <Icon
                name="menu"
                size={20}
                color={colors.theme600}
              />
              : // when store is selected
              <Image
                source={storeImages[selectedIngredientStore]?.src}
                alt="store"
                style={{
                  width: storeImages[selectedIngredientStore]?.width,
                  height: storeImages[selectedIngredientStore]?.height,
                }}
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
              className={`${searchIngredientQuery !== '' && searchIngredientQuery !== "" ? "text-black" : "text-zinc400"} ${ingredientDropdownOpen ? "rounded-b-[5px]" : "rounded-[5px]"} flex-1 bg-white border-[1px] border-zinc300 px-[10px] py-[5px] text-[14px] leading-[17px]`}
            >
              {searchIngredientQuery !== '' && searchIngredientQuery !== "" ? searchIngredientQuery : "search for ingredient"}
            </Text>
          </TouchableOpacity>


          {/* Ingredient Dropdown */}
          {ingredientDropdownOpen && !isKeyboardOpen && (
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
              ingredient={{ingredientName: selectedIngredientName, ingredientData: selectedIngredientData}}
            />
          }

          {/* BUTTONS */}
          <View className="absolute right-0 bottom-0 flex flex-row">
          
            <View className="flex flex-row space-x-[-5px] ">
              {/* Drop Up/Down */}
              <Icon
                name={ingredientDropdownOpen ? "chevron-down-outline" : "chevron-up-outline" }
                size={20}
                color="black"
                onPress={() => {
                  if (ingredientDropdownOpen) { setIngredientDropdownOpen(false); }
                  else {
                    filterIngredientData(searchIngredientQuery);
                    setIngredientDropdownOpen(true);
                  }
                }}
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
                className={`${ingredientDropdownOpen ? "rounded-b-[5px]" : "rounded-[5px]"} flex-1 bg-white border-[1px] border-zinc300 px-[10px] text-[14px] leading-[17px] z-10`}
                multiline={true}
                blurOnSubmit={true}
                onFocus={() => {
                  filterIngredientData(searchIngredientQuery);
                  setIngredientDropdownOpen(true);
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

                {/* Drop Up/Down */}
                <Icon
                  name={ingredientDropdownOpen ? "chevron-down-outline" : "chevron-up-outline" }
                  size={20}
                  color="black"
                  onPress={() => {
                    if (ingredientDropdownOpen) { setIngredientDropdownOpen(false); }
                    else {
                      filterIngredientData(searchIngredientQuery);
                      setIngredientDropdownOpen(true);
                    }
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