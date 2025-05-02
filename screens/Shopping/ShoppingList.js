///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useRef, useState, useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';

import { View, Text, ScrollView, TextInput, Linking, Keyboard, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

import RecipeListModal from '../../components/Shopping-List/RecipeListModal';
import SpotlightSelectorModal from '../../components/Shopping-List/SpotlightSelectorModal';

// Fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

import extractUnit from '../../components/Validation/extractUnit';

// initialize Firebase App
import { getFirestore, doc, updateDoc, getDocs, getDoc, collection, writeBatch } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

export default function ShoppingList ({ isSelectedTab }) {

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardType, setKeyboardType] = useState("");
  const [keyboardIndex, setKeyboardIndex] = useState(0);

  // keyboard listener
  useEffect(() => {
    // listens for keyboard show event
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setIsKeyboardOpen(true);
    });

    // listens for keyboard hide event
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      if (keyboardType !== "individual notes") {
        setIsKeyboardOpen(false);
        setKeyboardType("");
        setKeyboardIndex(0);
      }
    });

    // cleans up listeners on unmount
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [keyboardType]);

  ///////////////////////////////// NAVIGATION LOGIC /////////////////////////////////

  // if the tab has changed
  useEffect(() => {
    if (isSelectedTab) {
      fetchGlobalNote();
      loadDB();
    }
  }, [isSelectedTab]);

  const previousIndexRef = useRef(null);
  const currentIndex = useNavigationState((state) => state.index);

  // if the screen has changed
  useEffect(() => {
    
    // if the page has changed to the current one, refetch the current data from the globals
    if (isSelectedTab && previousIndexRef !== null && previousIndexRef.current !== currentIndex && currentIndex === 0) {      
      setTimeout(() => {
        loadDB();
      }, 1500);
    }

    // updates the ref to the new index
    previousIndexRef.current = currentIndex;
  }, [currentIndex]);


  ///////////////////////////////// STORES /////////////////////////////////

  const [spotlightsSnapshot, setSpotlightsSnapshot] = useState(null);

  // list of stores
  const stores = [
    { id: 'a', name: 'ALDI' },
    { id: 'mb', name: 'MARKET BASKET' },
    { id: 'sm', name: 'STAR MARKET' },
    { id: 'ss', name: 'STOP AND SHOP' },
    { id: 't', name: 'TARGET' },
    { id: 'w', name: 'WALMART' },
  ];
    
  // for store picker
  const [selectedStore, setSelectedStore] = useState('a'); 
  
  // store details
  const [allStoreLists, setAllStoreLists] = useState({
    a: { check: [], included: [], name: [], id: [], link: [], amountNeeded: [], brand: [], unit: [], totalYield: [], yieldNeeded: [], costUnit: [], costTotal: [], notes: [], },
    mb: { check: [], included: [], name: [], id: [], link: [], amountNeeded: [], brand: [], unit: [], totalYield: [], yieldNeeded: [], costUnit: [], costTotal: [], notes: [], },
    sm: { check: [], included: [], name: [], id: [], link: [], amountNeeded: [], brand: [], unit: [], totalYield: [], yieldNeeded: [], costUnit: [], costTotal: [], notes: [], },
    ss: { check: [], included: [], name: [], id: [], link: [], amountNeeded: [], brand: [], unit: [], totalYield: [], yieldNeeded: [], costUnit: [], costTotal: [], notes: [], },
    t: { check: [], included: [], name: [], id: [], link: [], amountNeeded: [], brand: [], unit: [], totalYield: [], yieldNeeded: [], costUnit: [], costTotal: [], notes: [], },
    w: { check: [], included: [], name: [], id: [], link: [], amountNeeded: [], brand: [], unit: [], totalYield: [], yieldNeeded: [], costUnit: [], costTotal: [], notes: [], },
  })

  // to load in database data on startup
  const loadDB = async () => {
    
    // gets all of the spotlight data
    const querySnapshot = await getDocs(collection(db, 'spotlights'));
    setSpotlightsSnapshot(querySnapshot);
    
    // gets current global spotlight info
    const shopping = await getDoc(doc(db, 'globals', 'shopping'));
    const shoppingData = shopping.data();
    const shoppingIds = shoppingData.spotlights.map((doc) => doc.id);
    const shoppingSelected = shoppingData.spotlights.map((doc) => doc.selected);
    
    // stores it
    setSpotlightsIds(shoppingIds);
    setSpotlightsSelected(shoppingSelected);

    await getAllShoppingLists(querySnapshot, shoppingIds, shoppingSelected, null, null);
  }


  // to get all shopping lists
  const getAllShoppingLists = async (querySnapshot, shoppingIds, shoppingSelected, ingredientIdList, ingredientIncludedList) => {
   
    try {
      const batch = writeBatch(db); // initializes a Firestore batch
      const storeIds = stores.map(store => store.id); // gets the ids for the stores

      // gets all lists
      const aSnap = await getDoc(doc(db, 'shopping', 'aList'));
      const mbSnap = await getDoc(doc(db, 'shopping', 'mbList'));
      const smSnap = await getDoc(doc(db, 'shopping', 'smList'));
      const ssSnap = await getDoc(doc(db, 'shopping', 'ssList'));
      const tSnap = await getDoc(doc(db, 'shopping', 'tList'));
      const wSnap = await getDoc(doc(db, 'shopping', 'wList'));

      const snapshots = {
        a: aSnap,
        mb: mbSnap,
        sm: smSnap,
        ss: ssSnap,
        t: tSnap,
        w: wSnap,
      };

      let initialStoreFound = false;
      
      // loops over all 6 stores
      await Promise.all(storeIds.map(async (store) => {
        
        // gets the current data
        const docSnap = snapshots[store];
        
        // stores the current data
        const idList = docSnap.data().id;
        const checkList = docSnap.data().check;
        const includedList = docSnap.data().included;
        const notesList = docSnap.data().notes;

        // quits early if the snapshot is empty
        if (!querySnapshot || querySnapshot.length === 0) {
          return;
        }
        
        // empty lists to populate
        const newIdList = [];
        const nameList = [];
        const linkList = [];
        const brandList = [];
        const unitList = [];
        const yieldUnitList = [];
        const yieldNeededList = [];
        const costUnitList = [];
        const totalYieldList = [];
    
        // loops over the collection of spotlights
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // only adds the data of the selected spotlights
          if (shoppingIds !== null && shoppingSelected[shoppingIds.indexOf(doc.id)] ) {
            
            // loops over all ingredients of the current spotlight
            data.ingredientData.forEach((ingredient, index) => {
              const ingredientStore = data.ingredientStores[index];
              
              // adds its data to the empty arrays
              if (data.ingredientData[index] !== null && ingredientStore === store) {
                newIdList.push(data.ingredientIds[index]);
                nameList.push(ingredient.ingredientName);
                linkList.push(ingredient[`${store}Link`]);
                brandList.push(ingredient[`${store}Brand`]);
                unitList.push(ingredient[`${store}Unit`]);
                yieldUnitList.push(ingredient[`${store}ServingContainer`]);
                const amt = new Fractional(data.ingredientAmounts[index]).multiply(new Fractional(data.spotlightMult));
                yieldNeededList.push(amt === 0 || isNaN(amt.numerator / amt.denominator) ? "0" : amt.toString())
                costUnitList.push(ingredient[`${store}PriceContainer`]);
                totalYieldList.push(ingredient[`${store}TotalYield`]);
              }
            });
          }
        });
         
        // gets the ids of the ingredients and their corresponding data
        const uniqueIds = [...new Set(newIdList)];
        
        const combinedList = uniqueIds.map((uniqueId) => {
          const matchingIndices = newIdList
            .map((id, index) => (id === uniqueId ? index : -1))
            .filter((index) => index !== -1);
            
          // select only one of the unique ids and corresponding data
          const name = nameList[matchingIndices[0]];
          const link = linkList[matchingIndices[0]];
          const brand = brandList[matchingIndices[0]];
          const unit = unitList[matchingIndices[0]];
          const totalYield = totalYieldList[matchingIndices[0]];
          const costUnit = costUnitList[matchingIndices[0]];

          // add together all yields needed to get the total needed
          let yieldNeeded = 0;
          matchingIndices.forEach((index) => {
            if (yieldNeededList[index] !== "" && yieldNeededList[index] !== "0") {
              yieldNeeded = new Fractional(yieldNeeded).add(new Fractional(yieldNeededList[index])).toString();
            }
          }) 
          yieldNeeded = yieldNeeded.toString();

          let amountNeeded = (new Fractional(0)) * 1;
          let costTotal = (new Fractional(0)) * 1; 
          
          // calculate the total amount needed
          if (totalYield !== "" && !isNaN((new Fraction(totalYield.toString())) * 1)) {
            amountNeeded = Math.ceil(
              (new Fraction(
                (new Fractional(yieldNeeded))
                  .divide(new Fractional(totalYield))
                  .toString())
              ) * 1);
          }
          
          // calculate the total cost needed
          if (costUnit !== "" && !isNaN((new Fraction(costUnit.toString())) * 1)) {
            costTotal = (new Fraction(
              ((new Fractional(amountNeeded))
                .multiply(new Fractional(costUnit)))
                .toString()
            ) * 1);
          }
          
          // returns the unique list
          return {
            id: uniqueId,
            name,
            link,
            brand,
            unit,
            amountNeeded,
            totalYield,
            yieldNeeded,
            costUnit,
            costTotal,
          };
        })
        // sorts by name alphabetically
        .sort((a, b) => a.name.localeCompare(b.name));
        
        // collected the new combined list of ids
        const combinedIdList = combinedList.map(item => item.id);

        // empty arrays to populate the combined check, included, and notes lists
        const combinedCheckList = [];
        const combinedIncludedList = [];
        const combinedNotesList = [];
        
        // loops over each id
        combinedIdList.forEach((id) => {
          const index = idList.indexOf(id);
          
          // if it was in the original id list, set its corresponding value
          if (id && index !== -1) {
            combinedCheckList.push(checkList[index] || false);
            combinedIncludedList.push(includedList[index] || false);
            combinedNotesList.push(notesList[index] || "");

          // if it wasn't, look in the other store lists
          } else if (id) {
            let found = false;

            storeIds.map((currStore) => {
              if (currStore !== store) {

                // current list data
                const currSnap = snapshots[currStore];

                const currIdList = currSnap.data().id;
                const currCheckList = currSnap.data().check;
                const currIncludedList = currSnap.data().included;
                const currNotesList = currSnap.data().notes;

                const currIndex = currIdList.indexOf(id);

                // if it was found in this list, add that data
                if (currIndex !== -1) {
                  combinedCheckList.push(currCheckList[currIndex] || false);
                  combinedIncludedList.push(currIncludedList[currIndex] || false);
                  combinedNotesList.push(currNotesList[currIndex] || "");
                  found = true;
                }
              }
            })
              
            // if not found in any store, use defaults
            if (!found) {
              combinedCheckList.push(false);
              combinedIncludedList.push(false);
              combinedNotesList.push("");
            }

          // otherwise, use defaults
          } else {
            combinedCheckList.push(false);
            combinedIncludedList.push(false);
            combinedNotesList.push("");
          }
        });

        // if using after the modal selector
        if (ingredientIdList !== null && ingredientIncludedList !== null) {
          // loops over the list of ids
          combinedIdList.forEach((id, index) => {
            const idIndex = ingredientIdList[store].indexOf(id)
            // if the id is found, update the inclusion to match the modal results
            if (idIndex !== -1) { combinedIncludedList[index] = ingredientIncludedList[store][idIndex]; }
          })
        } 

        // initializes groupedData with the correct structure
        let groupedData = {
          amountNeeded: [],
          brand: [],
          costTotal: [],
          costUnit: [],
          id: [],
          link: [],
          name: [],
          totalYield: [],
          unit: [],
          yieldNeeded: [],
        };

        // groups the combined list to match Shopping format in globals if there is data to add
        if (combinedList.length > 0) {
          groupedData = combinedList.reduce((acc, item) => {
            Object.keys(item).forEach((key) => {
              if (!acc[key]) {
                acc[key] = [];
              }
              acc[key].push(item[key]);
            });
            return acc;
          }, {});

          // adds check, included, and notes lists
          groupedData.check = combinedCheckList;
          groupedData.included = combinedIncludedList;
          groupedData.notes = combinedNotesList;

        // if null, add dummy values
        } else {
          groupedData.check = [];
          groupedData.included = [];
          groupedData.notes = [];
        }
        
        // adds the update operation to the batch
        batch.update(doc(db, 'shopping', `${store}List`), groupedData);

        // stores the store selection if the list length is > 0
        if (!initialStoreFound && combinedList.length > 0) {
          setSelectedStore(store);
          initialStoreFound = true;
        }

        // updates the states with the new lists
        setAllStoreChecks((prev) => ({ ...prev, [store]: combinedCheckList }));
        setAllStoreIncluded((prev) => ({ ...prev, [store]: combinedIncludedList }));
        setAllStoreNotes((prev) => ({ ...prev, [store]: combinedNotesList }));
        setAllStoreLists((prev) => ({ ...prev, [store]: combinedList }));
        setAllStoreCosts((prev) => ({ ...prev, [store]: 
          combinedList.reduce(
          (acc, item, index) =>
            combinedIncludedList[index] ? acc + item.costTotal : acc,
          0 // initial value
        ) }));
      }));
      
      // commits the batch
      await batch.commit();

      // gets the lists that pertain to the current list
      await fetchListData(querySnapshot, shoppingIds, shoppingSelected);
      
    } catch (error) {
      console.error("Error getting shopping lists:", error);
    }
  };


  ///////////////////////////////// STORE LIST DATA /////////////////////////////////

  const [storeListCosts, setStoreListCosts] = useState({
    aList: 0, mbList: 0, smList: 0, ssList: 0, tList: 0, wList: 0, 
  });

  const [allStoreCosts, setAllStoreCosts] = useState({ 
    a: 0, mb: 0, sm: 0, ss: 0, t: 0, w: 0, 
  });

  // to fetch the global shopping list of a given store
  const getStoreListCost = async (docSnap) => {

    if (docSnap.exists()) {
      const total = (docSnap.data().costTotal.reduce(
        (acc, item, index) =>
          docSnap.data().included[index] ? acc + item : acc,
        0 // initial value
      ))        
      
      return total;
    } else {
      return 0;
    }
  }

  const [storeListLengths, setStoreListLengths] = useState({
    aList: 0,
    mbList: 0,
    smList: 0,
    ssList: 0,
    tList: 0,
    wList: 0,
  });

  // to fetch the global shopping list length of a given store
  const getStoreListLength = async (docSnap) => {
    if (docSnap.exists()) { 
      // doesn't count ingredients that are not needed
      return docSnap.data()['amountNeeded'].filter((amt) => amt !== 0).length; 
    } 
    else { return 0; }
  }

  const [storeListDone, setStoreListDone] = useState({
    aList: false,
    mbList: false,
    smList: false,
    ssList: false,
    tList: false,
    wList: false,
  });

  // to fetch the global shopping list length of a given store
  const getStoreListDone = async (docSnap) => {

    if (docSnap.exists()) {
      const data = docSnap.data()
      const num = data.included.reduce((acc, included, index) => {
        if (included && !data.check[index]) {
          acc += 1; // increment count if both are true
        }
        return acc;
      }, 0);

      return num === 0;
    } else {
      return 0;
    }
  }

  const [numSpotlights, setNumSpotlights] = useState(0);

  // gets the data for the current list
  const fetchListData = async (querySnapshot, shoppingIds, shoppingSelected) => {
    
    // quits early if the snapshot is empty
    if (!querySnapshot || querySnapshot.length === 0) {
      return;
    }
    
    // the shopping lists
    const shoppingLists = [
      "aList",
      "mbList",
      "smList",
      "ssList",
      "tList",
      "wList",
    ];

    // to store the cost and length of each list
    const costs = {};
    const lengths = {};
    const done = {};

    // loops over each list
    for (const list of shoppingLists) {
      const docSnap = await getDoc(doc(db, 'shopping', list));
      costs[list] = await getStoreListCost(docSnap);
      lengths[list] = await getStoreListLength(docSnap);
      done[list] = await getStoreListDone(docSnap);
    }
    
    // store the data in states
    setStoreListCosts(costs);
    setStoreListLengths(lengths);
    setStoreListDone(done);
      
    // to calculate the total number of spotlights
    let multTotal = 0;

    // loops through the recipes and adds all found tags
    querySnapshot.forEach((doc) => {

      // only adds the data of the selected spotlights
      if (shoppingSelected[shoppingIds.indexOf(doc.id)]) {
        const data = doc.data();
        multTotal = multTotal + data.spotlightMult;
      }
    });
    
    // stores the number of spotlights
    setNumSpotlights(multTotal);
  };


  ///////////////////////////////// CHECKBOXES /////////////////////////////////

  // whether the lists of checkboxes is selected
  const [allStoreChecks, setAllStoreChecks] = useState({ 
    a: null, mb: null, sm: null, ss: null, t: null, w: null, 
  });

  // to update the list of checkboxes
  const updateCheck = async (index) => {
    
    setAllStoreChecks((prev) => {
      const updated = { ...prev }; 
      updated[selectedStore][index] = !updated[selectedStore][index];
      return updated;
    });

    // to store whether a current list is done
    const docSnap = await getDoc(doc(db, 'shopping', `${selectedStore}List`));
    const newDone = await getStoreListDone(docSnap);
    
    setStoreListDone((prev) => {
      const updated = { ...prev }; 
      updated[selectedStore + "List"] = newDone;
      return updated;
    });
  };

  // when a checkbox is changed, update the corresponding global document
  useEffect(() => {
    if (allStoreChecks[selectedStore] !== null) {
      updateDoc(doc(db, 'shopping', `${selectedStore}List`), { check: allStoreChecks[selectedStore] });
    }
  }, [allStoreChecks]);


  ///////////////////////////////// INCLUSION /////////////////////////////////

  // whether the lists of included buttons are selected
  const [allStoreIncluded, setAllStoreIncluded] = useState({ 
    a: null,  mb: null, sm: null, ss: null, t: null, w: null, 
  })

  // to calculate the number of included ingredients that are not checked
  const calcNumLeft = () => {
    if (allStoreIncluded[selectedStore]) {
      const num = allStoreIncluded[selectedStore].reduce((acc, included, index) => {
        if (included && !allStoreChecks[selectedStore][index]) {
          acc += 1; // increment count if both are true
        }
        return acc;
      }, 0)

      return num;
    
    } else {
      return 0;
    }
  }

  // to update the list of included buttons
  const updateIncluded = async (index) => {
    
    const cost = allStoreCosts[selectedStore] + (allStoreIncluded[selectedStore][index] ? -1 : 1) * allStoreLists[selectedStore][index].costTotal;
    setAllStoreCosts((prev) => ({ ...prev, [selectedStore]: cost }));

    // updates the list of included stores
    setAllStoreIncluded((prevState) => {
      const updated = { ...prevState };
      updated[selectedStore][index] = !updated[selectedStore][index];
      return updated;
    });

    // to store the cost of the current list
    const docSnap = await getDoc(doc(db, 'shopping', `${selectedStore}List`));
    const newCost = await getStoreListCost(docSnap);
    const newDone = await getStoreListDone(docSnap);
    
    setStoreListCosts((prev) => {
      const updated = { ...prev }; 
      updated[selectedStore + "List"] = newCost;
      return updated;
    });
    
    setStoreListDone((prev) => {
      const updated = { ...prev }; 
      updated[selectedStore + "List"] = newDone;
      return updated;
    });
  };

  // when a included button is changed, update the corresponding global document
  useEffect(() => {
    if (allStoreIncluded[selectedStore] !== null) {
      updateDoc(doc(db, 'shopping', `${selectedStore}List`), { included: allStoreIncluded[selectedStore] });
    }
  }, [allStoreIncluded]);
  

  ///////////////////////////////// NOTES /////////////////////////////////

  // whether the lists of notes are selected
  const [allStoreNotes, setAllStoreNotes] = useState({ 
    a: null,  mb: null, sm: null, ss: null, t: null, w: null, 
  });

  // to update the list of notes
  const updateIndivNotes = (index, newValue) => {
    setAllStoreNotes((prevState) => {
      const updated = { ...prevState };
      updated[selectedStore][index] = newValue;
      return updated;
    });
  };

  // when a note is changed, update the corresponding global document
  const dbIndivNotes = (storeNotes) => {
    if (storeNotes !== null) {
      updateDoc(doc(db, 'shopping', `${selectedStore}List`), { notes: storeNotes });
    }
  }

  // overall notes
  const [currNote, setCurrNote] = useState("");

  // when a note is changed, update the corresponding global document
  const dbNote = (note) => {
    updateDoc(doc(db, 'globals', 'shopping'), { note: note });
  }

  // to get the global note
  const fetchGlobalNote = async () => {
      
    try {
      // gets the global meal prep document
      const shoppingDoc = ((await getDoc(doc(db, 'globals', 'shopping'))));
      if (shoppingDoc.exists()) {
        const note = shoppingDoc.data().note;
        setCurrNote(note);

      } else {
        console.error('No such document in Firestore!');
      }
    } catch (error) {
      console.error('Error fetching meal prep document:', error);
    }
  }


  ///////////////////////////////// SHOWING RECIPES OF SHOPPING LISTS /////////////////////////////////

  const [recipeListModalVisible, setRecipeListModalVisible] = useState(false);
  const [currIngredient, setCurrIngredient] = useState(null);
  const [currRecipeList, setCurrRecipeList] = useState(null);
  const [currAmountList, setCurrAmountList] = useState(null);
  const [currUnitList, setCurrUnitList] = useState(null);
  const [currMultList, setCurrMultList] = useState(null);
  const [currOtherList, setCurrOtherList] = useState(null);

  // before opening the modal that displays the recipe lists of the current ingredient
  const displayRecipes = async (index) => {
    let recipeList = [];
    let amountList = [];
    let unitList = [];
    let multList = [];
    let otherStores = [];
    
    // loops through the recipes and adds all data
    spotlightsSnapshot.forEach((doc) => {

      // only adds the data of the selected spotlights
      if (spotlightsSelected[spotlightsIds.indexOf(doc.id)]) {

        // loops over each ingredient
        for (let i = 0; i < 12; i++) {

          // if the spotlight's ingredient matches the current store 
          if (allStoreLists[selectedStore][index].id === doc.data().ingredientIds[i] && doc.data().ingredientStores[i] === selectedStore) {
            recipeList.push(doc.data().spotlightName);
            amountList.push(doc.data().ingredientAmounts[i]);
            unitList.push(doc.data().ingredientData[i][`${doc.data().ingredientStores[i]}Unit`]);
            multList.push(doc.data().spotlightMult);
          
          // if it doesn't
          } else if (allStoreLists[selectedStore][index].id === doc.data().ingredientIds[i] && doc.data().ingredientStores[i] !== selectedStore) {
            otherStores.push({ 
              ingredientStore: doc.data().ingredientStores[i] === "a" ? "Aldi" 
                             : doc.data().ingredientStores[i] === "mb" ? "Market Basket" 
                             : doc.data().ingredientStores[i] === "sm" ? "Star Market" 
                             : doc.data().ingredientStores[i] === "ss" ? "Stop & Shop" 
                             : doc.data().ingredientStores[i] === "t" ? "Target" 
                             : doc.data().ingredientStores[i] === "w" ? "Walmart" : "", 
              spotlightName: doc.data().spotlightName,
            })
          }
        }
      }
    });
    setCurrIngredient(allStoreLists[selectedStore][index]);
    setCurrRecipeList(recipeList);
    setCurrAmountList(amountList);
    setCurrUnitList(unitList);
    setCurrMultList(multList);
    setCurrOtherList(otherStores);

    setRecipeListModalVisible(true);
  }

  // to close the modal for the recipe lists of the current ingredient
  const closeRecipes = () => {
    setCurrIngredient(null);
    setCurrRecipeList(null);
    setCurrAmountList(null);
    setCurrUnitList(null);
    setCurrMultList(null);
    setCurrOtherList(null);
    setRecipeListModalVisible(false);
  }
  

  ///////////////////////////////// SPOTLIGHT SELECTOR /////////////////////////////////

  const [spotlightModalVisible, setSpotlightModalVisible] = useState(false);
  const [spotlightsIds, setSpotlightsIds] = useState(null);
  const [spotlightsSelected, setSpotlightsSelected] = useState(null);

  // when the checkmark in the modal is clicked
  const submitSpotlightModal = async (ids, selected, ingredientIdList, ingredientIncludedList) => {
    
    // stores the provided selected info
    setSpotlightsIds(ids);
    setSpotlightsSelected(selected);
    
    // creates a map with the ids and selected info
    const spotlightsData = ids.map((id, index) => ({
      id,
      selected: selected[index]
    }));
    
    // updates info and closes modal
    await updateDoc(doc(db, 'globals', 'shopping'), { spotlights: spotlightsData });
    await getAllShoppingLists(spotlightsSnapshot, ids, selected, ingredientIdList, ingredientIncludedList);
    setSpotlightModalVisible(false);
  }


  ///////////////////////////////// HTML /////////////////////////////////

  return (

    // CONTAINER
    <View className="flex flex-col w-full h-full items-center justify-center bg-zinc300 border">

      {/* Store Display */}
      <View className="flex h-4/5 -mt-5 w-full justify-center items-center space-y-5">

        {/* HEADER */}
        <View className="flex flex-row w-11/12 justify-evenly items-center h-[30px] border-black bg-zinc700 border-[1px]">
                  
          {/* Selection */}
          <View className="w-[45%] h-[30px] ml-[-10px] z-20">
            <Picker
              selectedValue={selectedStore}
              onValueChange={setSelectedStore}
              style={{ height: 30, justifyContent: 'center', overflow: 'hidden', backgroundColor: calcNumLeft() !== 0 ? colors.theme600 : colors.zinc500, borderWidth: 1, }}
              itemStyle={{ color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 13, }}
            >
              {storeListLengths.aList > 0 && (
                <Picker.Item label="ALDI" value="a" />
              )}
              {storeListLengths.mbList > 0 && (
                <Picker.Item label="MARKET BASKET" value="mb" />
              )}
              {storeListLengths.smList > 0 && (
                <Picker.Item label="STAR MARKET" value="sm" />
              )}
              {storeListLengths.ssList > 0 && (
                <Picker.Item label="STOP & SHOP" value="ss" />
              )}
              {storeListLengths.tList > 0 && (
                <Picker.Item label="TARGET" value="t" />
              )}
              {storeListLengths.wList > 0 && (
                <Picker.Item label="WALMART" value="w" />
              )}
            </Picker>
          </View>

          {/* Calculates the cost of the current store */}
          <Text className="text-white font-bold text-center">
            {"LIST COST: $"}{allStoreCosts[selectedStore].toFixed(2)}
          </Text>
        </View>

        {/* selects the store from the dropdown */}
        {stores
          .filter((store) => store.id === selectedStore)
          .map((store) => {

          return (
            <View
              key={store.id}
              className="flex flex-col w-11/12 h-4/5 bg-zinc700"
            >
              {/* DATA */}
              <View className="flex flex-col border-[1.5px] border-black w-full h-full">
                {Array.isArray(allStoreLists[selectedStore]) && (
                  <>
                    {/* SCROLLABLE INGREDIENT SECTION */}
                    <ScrollView>
                      {allStoreLists[selectedStore].map((store, index) => (
                        (store.yieldNeeded !== 0 && (new Fractional(store.yieldNeeded.toString()).numerator !== undefined)) && (
                          <View key={`data-${index}`}>
                            {/* If the ingredient is to be included according to the button */}
                            {allStoreIncluded[selectedStore][index] ? 
                              <View className="flex flex-row border-b-[1px] w-full h-[60px]">

                                {/* Specifics */}
                                <View className={`flex w-[30px] justify-center items-center ${Array.isArray(allStoreChecks[selectedStore]) && allStoreChecks[selectedStore][index] ? "bg-zinc500" : "bg-theme700"} space-y-[4px] border-r`}>
                                  
                                  {/* BUTTONS */}
                                  <View className="flex flex-col space-y-[3px]">
                                    {/* Included */}
                                    <Icon
                                      name={Array.isArray(allStoreIncluded[selectedStore]) && allStoreIncluded[selectedStore][index] ? "close-outline" : "add"}
                                      size={14}
                                      color="white"
                                      onPress={() => updateIncluded(index)}
                                    />
                                    {/* Check */}
                                    <Icon
                                      name={Array.isArray(allStoreChecks[selectedStore]) && allStoreChecks[selectedStore][index] ? "checkbox" : "square-outline"}
                                      size={14}
                                      color="white"
                                      onPress={() => updateCheck(index)}
                                    />
                                  </View>
                                  
                                  {/* Amount Needed */}
                                  <TouchableOpacity
                                    className="w-full justify-center items-center"
                                    onPress={() => displayRecipes(index)}
                                  >
                                    <View className="flex flex-col">
                                      <Text className="text-white text-[12px]">{store.amountNeeded}</Text>
                                    </View>
                                  </TouchableOpacity>
                                </View>
                                
                                {/* INGREDIENT NAME */}
                                <View
                                  className={`flex w-[125px] justify-center items-center border-r-2 border-black ${Array.isArray(allStoreChecks[selectedStore]) && allStoreChecks[selectedStore][index] ? "bg-zinc600" : "bg-theme800"}`}
                                >
                                  {/* Linking */}
                                  <Text 
                                    className={`text-white text-[12px] font-bold text-center px-1 ${store.link !== "" && "underline"}`}
                                    onPress={ store.link !== "" ? () => Linking.openURL(store.link) : undefined }
                                  >
                                    {store.name}
                                  </Text>
                                </View>
                              

                                {/* SCROLLABLE COLUMNS */}
                                <ScrollView
                                  horizontal
                                  scrollEventThrottle={16}
                                  contentContainerStyle={{ flexDirection: 'column', minWidth: 500 }}
                                  showsHorizontalScrollIndicator={false}
                                >
                                  <View className={`flex flex-col border-b-[1px] h-[60px] space-y-1 ${index % 2 === 0 ? (Array.isArray(allStoreChecks[selectedStore]) && allStoreChecks[selectedStore][index] ? "bg-zinc400" : "bg-theme400") : (Array.isArray(allStoreChecks[selectedStore]) && allStoreChecks[selectedStore][index] ? "bg-zinc450" : "bg-theme500") } items-center justify-center`} key={`middle${index}`}>
                                    
                                    {/* to open the detailed recipe list */}
                                    <TouchableOpacity
                                      className="w-full space-y-1"
                                      onPress={() => displayRecipes(index)}
                                    >
                                      {/* List of details */}
                                      <View className="flex flex-row">
                                        <Text className="w-[15%] text-right pr-2 font-bold text-[12px]">
                                          DETAILS:
                                        </Text>
                                        {/* brand, unit yield, and unit cost */}
                                        {store.brand ? 
                                          <Text className="w-[85%] text-left text-[12px]">
                                            {store.brand} {"—"} {store.totalYield} {extractUnit(store.unit, store.totalYield)}{" for $"}{((new Fraction(store.costUnit)) * 1)}
                                          </Text>
                                        : 
                                          <Text className="w-[85%] text-left text-[12px]">
                                            N/A
                                          </Text>
                                        }
                                      </View>

                                      {/* List of purchase details */}
                                      <View className="flex flex-row">
                                        <Text className="w-[15%] text-right pr-2 font-bold text-[12px]">
                                          NEEDED:
                                        </Text>
                                        {/* yield needed, amount needed, cost expected */}
                                        {store.brand ? 
                                          <Text className="w-[85%] text-left text-[12px]">
                                            {store.yieldNeeded} {extractUnit(store.unit, store.yieldNeeded)} {"—"} {store.amountNeeded}{"x for $"}{store.costTotal.toFixed(2)}
                                          </Text>
                                        : 
                                          <Text className="w-[85%] text-left text-[12px]">
                                            N/A
                                          </Text>
                                        }
                                      </View>
                                    </TouchableOpacity>
                                  
                                    {/* Notes input */}
                                    <View className="flex flex-row">
                                      {/* Text */}
                                      <Text className="w-[15%] text-right pr-2 font-bold text-[12px] justify-start">
                                        NOTES:
                                      </Text>
                                      {/* MOCK text input */}
                                      <TouchableOpacity 
                                        className="w-[85%] pr-[10px] h-[15px]"
                                        onPress={() => {
                                          setKeyboardType("individual notes");
                                          setKeyboardIndex(index);
                                          setIsKeyboardOpen(true);
                                        }}
                                      >
                                        <Text className="flex bg-zinc300 px-[5px] border-[1px] border-zinc300 rounded-[5px] text-[12px] leading-[14px]">
                                          {Array.isArray(allStoreNotes[selectedStore]) && allStoreNotes[selectedStore][index] ? allStoreNotes[selectedStore][index] : ""}
                                        </Text>      
                                      </TouchableOpacity>    
                                    </View>
                                  </View>
                                </ScrollView>                            
                              </View>
                            :

                              // IF THE INGREDIENT IS NOT INCLUDED
                              <View className="flex flex-row border-b-[1px] h-[30px]">

                                {/* Included Button ONLY */}
                                <View className="w-[30px] bg-zinc300 border-r justify-center items-center z-10">
                                  <Icon
                                    name={Array.isArray(allStoreIncluded[selectedStore]) && allStoreIncluded[selectedStore][index] ? "close-outline" : "add"}
                                    size={14}
                                    color="black"
                                    onPress={() => updateIncluded(index)}
                                  />
                                </View>
                                
                                {/* Ingredient Name */}
                                <View className="w-full bg-zinc350 justify-center pl-[30px] ml-[-30px] z-0">
                                  <Text 
                                    className={`text-zinc800 text-[12px] font-bold px-1 ${store.link !== "" && "underline"}`}
                                    onPress={ store.link !== "" ? () => Linking.openURL(store.link) : undefined }
                                  >
                                    {store.name}
                                  </Text>
                                </View>
                              </View>
                            }
                          </View>
                        )
                      ))}
                    </ScrollView>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </View>


      {/* Popup to show details if clicked */}
      {recipeListModalVisible && 
        <RecipeListModal
          ingredient={currIngredient}
          recipeList={currRecipeList}
          amountList={currAmountList}
          unitList={currUnitList}
          multList={currMultList}
          otherList={currOtherList}
          modalVisible={recipeListModalVisible}
          setModalVisible={setRecipeListModalVisible}
          closeModal={closeRecipes}
        />
      }


      {/* Details */}
      <View className="flex flex-row h-[15%] w-11/12 space-x-5 justify-center items-center rounded">
         
        {/* Prices and Amounts */}
        <View className="flex flex-col justify-center items-center w-[45%] h-[90%] bg-theme400 rounded-lg border border-black">
          
          {/* overall price and number of recipes */}
          <TouchableOpacity className="flex w-full py-2 bg-zinc500 justify-center items-center border-b rounded-t-lg" onPress={() => setSpotlightModalVisible(true)}>
            <Text className="font-bold text-[14px] text-white text-center">
              {"$"}
              {(storeListCosts['aList'] + storeListCosts['mbList'] + storeListCosts['smList'] + storeListCosts['ssList'] + storeListCosts['tList'] + storeListCosts['wList']).toFixed(2)}
              {"   |   "}
              {numSpotlights}
              {numSpotlights === "1" ? " Recipe" : " Recipes"}
            </Text>
          </TouchableOpacity>

          {/* SPOTLIGHT MODAL */}
          {spotlightModalVisible &&
            <SpotlightSelectorModal
              spotlightsSnapshot={spotlightsSnapshot}
              spotlightsSelected={spotlightsSelected}
              spotlightsIds={spotlightsIds}
              modalVisible={spotlightModalVisible} 
              setModalVisible={setSpotlightModalVisible}
              submitModal={submitSpotlightModal}
            />
          }

          {/* individual store prices */}
          <ScrollView className="flex flex-col pt-1.5 mb-2">
            {selectedStore !== "a" && storeListLengths['aList'] > 0 &&
              <View className="flex flex-row justify-end space-x-1 mb-0.5">
                {/* whether the shopping list is done */}
                <Icon
                  name={storeListDone['aList'] ? "checkmark" : "close-outline"}
                  color={colors.theme900}
                  size={16}
                />
                {/* text */}
                <Text className="text-[13px]">
                  {"ALDI: $"}{storeListCosts['aList'].toFixed(2)}
                </Text>
              </View>
            }
            {selectedStore !== "mb" && storeListLengths['mbList'] > 0 &&
              <View className="flex flex-row justify-end space-x-1 mb-0.5">
                {/* whether the shopping list is done */}
                <Icon
                  name={storeListDone['mbList'] ? "checkmark" : "close-outline"}
                  color={colors.theme900}
                  size={16}
                />
                {/* text */}
                <Text className="text-[13px]">
                  {"MARKET BASKET: $"}{storeListCosts['mbList'].toFixed(2)}
                </Text>
              </View>
            }
            {selectedStore !== "sm" && storeListLengths['smList'] > 0 &&
              <View className="flex flex-row justify-end space-x-1 mb-0.5">
                {/* whether the shopping list is done */}
                <Icon
                  name={storeListDone['smList'] ? "checkmark" : "close-outline"}
                  color={colors.theme900}
                  size={16}
                />
                {/* text */}
                <Text className="text-[13px]">
                  {"STAR MARKET: $"}{storeListCosts['smList'].toFixed(2)}
                </Text>
              </View>
            }
            {selectedStore !== "ss" && storeListLengths['ssList'] > 0 &&
              <View className="flex flex-row justify-end space-x-1 mb-0.5">
                {/* whether the shopping list is done */}
                <Icon
                  name={storeListDone['ssList'] ? "checkmark" : "close-outline"}
                  color={colors.theme900}
                  size={16}
                />
                {/* text */}
                <Text className="text-[13px]">
                  {"STOP & SHOP: $"}{storeListCosts['ssList'].toFixed(2)}
                </Text>
              </View>
            }
            {selectedStore !== "t" && storeListLengths['tList'] > 0 &&
              <View className="flex flex-row justify-end space-x-1 mb-0.5">
                {/* whether the shopping list is done */}
                <Icon
                  name={storeListDone['tList'] ? "checkmark" : "close-outline"}
                  color={colors.theme900}
                  size={16}
                />
                {/* text */}
                <Text className="text-[13px]">
                  {"TARGET: $"}{storeListCosts['tList'].toFixed(2)}
                </Text>
              </View>
            }
            {selectedStore !== "w" && storeListLengths['wList'] > 0 &&
              <View className="flex flex-row justify-end space-x-1 mb-0.5">
                {/* whether the shopping list is done */}
                <Icon
                  name={storeListDone['wList'] ? "checkmark" : "close-outline"}
                  color={colors.theme900}
                  size={16}
                />
                {/* text */}
                <Text className="text-[13px]">
                  {"WALMART: $"}{storeListCosts['wList'].toFixed(2)}
                </Text>
              </View>
            }
          </ScrollView>
        </View>

        {/* Global Notes */}
        <View className="flex w-5/12 h-full justify-center items-center my-3">
          <View className="bg-transparent w-full h-full">
  
            {/* MOCK text input */}
            <TouchableOpacity 
              className="flex w-full h-full"
              onPress={() => {
                setKeyboardType("global notes");
                setIsKeyboardOpen(true);
              }}
            >
              <Text
                multiline={true}
                className={`${currNote !== "" ? "text-black" : "text-zinc400"} flex-1 bg-white border-[1px] border-zinc400 px-[10px] rounded-[5px] py-[5px] text-[13px] leading-[15px]`}
              >
                {currNote !== "" ? currNote : "notes"}
              </Text>
            </TouchableOpacity>
  
            {/* clear button */}
            <View className="absolute right-0 justify-end h-full">
              <Icon
                name="close-outline"
                size={20}
                color="black"
                onPress={() => {
                  setCurrNote("");
                  dbNote("");
                }}
              />
            </View>
          </View>
        </View>
      </View>



      {/* KEYBOARD POPUP SECTION */}
      {isKeyboardOpen &&
      <>
        {/* Grayed Out BG */}
        <TouchableOpacity 
          className="absolute bg-black bg opacity-40 w-full h-full" 
          onPress={() => {
            keyboardType === "individual notes" && dbIndivNotes(allStoreNotes[selectedStore]);
            keyboardType === "global notes" && dbNote(currNote);
            Keyboard.dismiss();
            setIsKeyboardOpen(false); 
          }}
          pointerEvents="box-none"
        />

        {/* Individual Notes */}
        {keyboardType === "individual notes" &&
        <View className="absolute bottom-[300px] w-5/6 border-2" key={`data-${keyboardIndex}`}>
          <View className="flex flex-row border-b-2">

            {/* Buttons */}
            <View className={`flex flex-row w-1/5 h-[30px] justify-center items-center space-x-1 ${Array.isArray(allStoreChecks[selectedStore]) && allStoreChecks[selectedStore][keyboardIndex] ? "bg-zinc500" : "bg-theme700"}`}>
                                  
              {/* Included */}
              <Icon
                name={Array.isArray(allStoreIncluded[selectedStore]) && allStoreIncluded[selectedStore][keyboardIndex] ? "close-outline" : "add"}
                size={14}
                color="white"
                onPress={() => updateIncluded(keyboardIndex)}
              />
              {/* Check */}
              <Icon
                name={Array.isArray(allStoreChecks[selectedStore]) && allStoreChecks[selectedStore][keyboardIndex] ? "checkbox" : "square-outline"}
                size={14}
                color="white"
                onPress={() => updateCheck(keyboardIndex)}
              />
              {/* Amount Needed */}
              <Text className="text-white text-[12px]">{allStoreLists[selectedStore][keyboardIndex].amountNeeded}</Text>
            </View>
                                
            {/* INGREDIENT NAME */}
            <View className={`flex w-4/5 justify-center items-center ${Array.isArray(allStoreChecks[selectedStore]) && allStoreChecks[selectedStore][keyboardIndex] ? "bg-zinc600" : "bg-theme800"}`}>
              {/* Linking */}
              <Text 
                className={`text-white text-[12px] font-bold text-center px-1 ${allStoreLists[selectedStore][keyboardIndex].link !== "" && "underline"}`}
                onPress={ allStoreLists[selectedStore][keyboardIndex].link !== "" ? () => Linking.openURL(allStoreLists[selectedStore][keyboardIndex].link) : undefined }
              >
                {allStoreLists[selectedStore][keyboardIndex].name}
              </Text>
            </View>
          </View>   

          {/* DETAILS */}
          <View className={`flex flex-col border-b-[1px] h-[60px] space-y-1 ${keyboardIndex % 2 === 0 ? (Array.isArray(allStoreChecks[selectedStore]) && allStoreChecks[selectedStore][keyboardIndex] ? "bg-zinc400" : "bg-theme400") : (Array.isArray(allStoreChecks[selectedStore]) && allStoreChecks[selectedStore][keyboardIndex] ? "bg-zinc450" : "bg-theme500") } items-center justify-center`} key={`middle${keyboardIndex}`}>
            
            {/* List of details */}
            <View className="flex flex-row">
              <Text className="w-1/5 text-right pr-2 font-bold text-[12px]">
                DETAILS:
              </Text>
              {/* brand, unit yield, and unit cost */}
              {allStoreLists[selectedStore][keyboardIndex].brand ? 
                <Text className="w-4/5 text-left text-[12px]">
                  {allStoreLists[selectedStore][keyboardIndex].brand} {"—"} {allStoreLists[selectedStore][keyboardIndex].totalYield} {extractUnit(allStoreLists[selectedStore][keyboardIndex].unit, allStoreLists[selectedStore][keyboardIndex].totalYield)}{" for $"}{((new Fraction(allStoreLists[selectedStore][keyboardIndex].costUnit)) * 1)}
                </Text>
              : 
                <Text className="w-4/5 text-left text-[12px]">
                  N/A
                </Text>
              }
            </View>

            {/* List of purchase details */}
            <View className="flex flex-row">
              <Text className="w-1/5 text-right pr-2 font-bold text-[12px]">
                NEEDED:
              </Text>
              {/* yield needed, amount needed, cost expected */}
              {allStoreLists[selectedStore][keyboardIndex].brand ? 
                <Text className="w-4/5 text-left text-[12px]">
                  {allStoreLists[selectedStore][keyboardIndex].yieldNeeded} {extractUnit(allStoreLists[selectedStore][keyboardIndex].unit, allStoreLists[selectedStore][keyboardIndex].yieldNeeded)} {"—"} {allStoreLists[selectedStore][keyboardIndex].amountNeeded}{"x for $"}{allStoreLists[selectedStore][keyboardIndex].costTotal.toFixed(2)}
                </Text>
              : 
                <Text className="w-4/5 text-left text-[12px]">
                  N/A
                </Text>
              }
            </View>

            {/* Notes input */}
            <View className="flex flex-row">
              {/* Text */}
              <Text className="w-1/5 text-right pr-2 font-bold text-[12px]">
                NOTES:
              </Text>
              {/* Text Input */}
              <View className="w-4/5 pr-[10px]">
                <TextInput
                  value={Array.isArray(allStoreNotes[selectedStore]) && allStoreNotes[selectedStore][keyboardIndex] ? allStoreNotes[selectedStore][keyboardIndex] : ""}
                  onFocus={() => {
                    setKeyboardType("individual notes");
                    setKeyboardIndex(keyboardIndex);
                  }}
                  onChangeText={(text) => updateIndivNotes(keyboardIndex, text)}
                  placeholder={Array.isArray(allStoreNotes[selectedStore]) && allStoreNotes[selectedStore][keyboardIndex] ? allStoreNotes[selectedStore][keyboardIndex] : ""}
                  placeholderTextColor={colors.zinc400}
                  className="flex-1 text-[12px] leading-[15px] bg-zinc300 rounded-[5px] px-[5px]"
                  onBlur={() => dbIndivNotes(allStoreNotes[selectedStore])}
                />
              </View>
            </View>                       
          </View> 
        </View>
        }

        {/* Global Notes */}
        {keyboardType === "global notes" &&
        <View className="absolute flex w-5/12 h-[15%] bottom-[300px]">
          <View className="bg-transparent w-full h-full">
  
            {/* text input */}
            <TextInput
              value={currNote}
              onChangeText={(value) => setCurrNote(value)}
              multiline={true}
              placeholder="notes"
              placeholderTextColor={colors.zinc400}
              className="flex-1 bg-white rounded-[5px] border-[1px] border-zinc400 px-2.5 text-[13px] leading-[16px]"
            />
  
            {/* clear button */}
            <View className="absolute right-0 justify-end h-full">
              <Icon
                name="close-outline"
                size={20}
                color="black"
                onPress={() => setCurrNote("")}
              />
            </View>
          </View>
        </View>
        }
      </>
      }
    </View>
  );
}