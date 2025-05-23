///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useRef, useState, useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';

// UI components
import { View, Text, ScrollView, TextInput, Linking, Keyboard, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// store lists
import storeKeys from '../../assets/storeKeys';
import storeLabels from '../../assets/storeLabels';

// fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

// validation
import extractUnit from '../../components/Validation/extractUnit';

// modals
import RecipeListModal from '../../components/Shopping-List/RecipeListModal';
import SpotlightSelectorModal from '../../components/Shopping-List/SpotlightSelectorModal';

// initialize firebase app
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
    
  // for store picker
  const [selectedStore, setSelectedStore] = useState(storeKeys[0]); 
  
  // store details
  const [allStoreLists, setAllStoreLists] = useState(Object.fromEntries(
    storeKeys.map(storeKey => [storeKey, {
      check: [],
      included: [],
      name: [],
      id: [],
      link: [],
      amountNeeded: [],
      brand: [],
      unit: [],
      totalYield: [],
      yieldNeeded: [],
      costUnit: [],
      costTotal: [],
      notes: [],
    }])
  ));

  // to load in database data on startup
  const loadDB = async () => {
    
    // gets all of the spotlight data
    const querySnapshot = await getDocs(collection(db, 'SPOTLIGHTS'));
    setSpotlightsSnapshot(querySnapshot);
    
    // gets current global spotlight info
    const shopping = await getDoc(doc(db, 'GLOBALS', 'shopping'));
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

      // gets all lists
      const snapshots = {};
      for (const storeKey of storeKeys) {
        const snap = await getDoc(doc(db, 'SHOPPING', `list${storeKey}`));
        snapshots[storeKey] = snap;
      }

      let initialStoreFound = false;
      
      // loops over all 6 stores
      await Promise.all(storeKeys.map(async (storeKey) => {
        
        // stores the current data
        const idList = snapshots[storeKey].data().id;
        const checkList = snapshots[storeKey].data().check;
        const includedList = snapshots[storeKey].data().included;
        const notesList = snapshots[storeKey].data().notes;

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
              if (data.ingredientData[index] !== null && ingredientStore === storeKey) {
                newIdList.push(data.ingredientIds[index]);
                nameList.push(data.ingredientNames[index]);
                linkList.push(ingredient[storeKey].link);
                brandList.push(ingredient[storeKey].brand);
                unitList.push(ingredient[storeKey].unit);
                yieldUnitList.push(ingredient[storeKey].servingContainer);
                const amt = new Fractional(data.ingredientAmounts[index]).multiply(new Fractional(data.spotlightMult));
                yieldNeededList.push(amt === 0 || isNaN(amt.numerator / amt.denominator) ? "0" : amt.toString())
                costUnitList.push(ingredient[storeKey].priceContainer);
                totalYieldList.push(ingredient[storeKey].totalYield);
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

            storeKeys.map((currStore) => {
              if (currStore !== storeKey) {

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
            const idIndex = ingredientIdList[storeKey].indexOf(id)
            // if the id is found, update the inclusion to match the modal results
            if (idIndex !== -1) { combinedIncludedList[index] = ingredientIncludedList[storeKey][idIndex]; }
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
        batch.update(doc(db, 'SHOPPING', `list${storeKey}`), groupedData);

        // stores the store selection if the list length is > 0
        if (!initialStoreFound && combinedList.length > 0) {
          setSelectedStore(storeKey);
          initialStoreFound = true;
        }

        // updates the states with the new lists
        setAllStoreChecks((prev) => ({ ...prev, [storeKey]: combinedCheckList }));
        setAllStoreIncluded((prev) => ({ ...prev, [storeKey]: combinedIncludedList }));
        setAllStoreNotes((prev) => ({ ...prev, [storeKey]: combinedNotesList }));
        setAllStoreLists((prev) => ({ ...prev, [storeKey]: combinedList }));
        setAllStoreCosts((prev) => ({ ...prev, [storeKey]: 
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

  const [storeListCosts, setStoreListCosts] = useState(
    Object.fromEntries(storeKeys.map(storeKey => [storeKey, 0]))
  );
  
  const [allStoreCosts, setAllStoreCosts] = useState(
    Object.fromEntries(storeKeys.map(storeKey => [storeKey, 0]))
  );

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

  const [storeListLengths, setStoreListLengths] = useState(
    Object.fromEntries(storeKeys.map(storeKey => [storeKey, 0]))
  );

  // to fetch the global shopping list length of a given store
  const getStoreListLength = async (docSnap) => {
    
    if (docSnap.exists()) { 
      // doesn't count ingredients that are not needed
      return docSnap.data()['amountNeeded'].filter((amt) => amt !== 0).length; 
    } 
    else { return 0; }
  }

  const [storeListDone, setStoreListDone] = useState(
    Object.fromEntries(storeKeys.map(storeKey => [storeKey, false]))
  );

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

    // to store the cost and length of each list
    const costs = {};
    const lengths = {};
    const done = {};

    // loops over each list
    for (const storeKey of storeKeys) {
      const docSnap = await getDoc(doc(db, 'SHOPPING', `list${storeKey}`));
      costs[storeKey] = await getStoreListCost(docSnap);
      lengths[storeKey] = await getStoreListLength(docSnap);
      done[storeKey] = await getStoreListDone(docSnap);
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
  const [allStoreChecks, setAllStoreChecks] = useState(
    Object.fromEntries(storeKeys.map(storeKey => [storeKey, null]))
  );  

  // to update the list of checkboxes
  const updateCheck = async (index) => {
    
    setAllStoreChecks((prev) => {
      const updated = { ...prev }; 
      updated[selectedStore][index] = !updated[selectedStore][index];
      return updated;
    });

    // to store whether a current list is done
    const docSnap = await getDoc(doc(db, 'SHOPPING', `list${selectedStore}`));
    const newDone = await getStoreListDone(docSnap);
    
    setStoreListDone((prev) => {
      const updated = { ...prev }; 
      updated[selectedStore] = newDone;
      return updated;
    });
  };

  // when a checkbox is changed, update the corresponding global document
  useEffect(() => {
    if (allStoreChecks[selectedStore] !== null) {
      updateDoc(doc(db, 'SHOPPING', `list${selectedStore}`), { check: allStoreChecks[selectedStore] });
    }
  }, [allStoreChecks]);


  ///////////////////////////////// INCLUSION /////////////////////////////////

  // whether the lists of included buttons are selected
  const [allStoreIncluded, setAllStoreIncluded] = useState(
    Object.fromEntries(storeKeys.map(storeKey => [storeKey, null]))
  );  

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
    const docSnap = await getDoc(doc(db, 'SHOPPING', `list${selectedStore}`));
    const newCost = await getStoreListCost(docSnap);
    const newDone = await getStoreListDone(docSnap);
    
    setStoreListCosts((prev) => {
      const updated = { ...prev }; 
      updated[selectedStore] = newCost;
      return updated;
    });
    
    setStoreListDone((prev) => {
      const updated = { ...prev }; 
      updated[selectedStore] = newDone;
      return updated;
    });
  };

  // when a included button is changed, update the corresponding global document
  useEffect(() => {
    if (allStoreIncluded[selectedStore] !== null) {
      updateDoc(doc(db, 'SHOPPING', `list${selectedStore}`), { included: allStoreIncluded[selectedStore] });
    }
  }, [allStoreIncluded]);
  

  ///////////////////////////////// NOTES /////////////////////////////////

  // whether the lists of notes are selected
  const [allStoreNotes, setAllStoreNotes] = useState(
    Object.fromEntries(storeKeys.map(storeKey => [storeKey, null]))
  );  

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
      updateDoc(doc(db, 'SHOPPING', `list${selectedStore}`), { notes: storeNotes });
    }
  }

  // overall notes
  const [currNote, setCurrNote] = useState("");

  // when a note is changed, update the corresponding global document
  const dbNote = (note) => {
    updateDoc(doc(db, 'GLOBALS', 'shopping'), { note: note });
  }

  // to get the global note
  const fetchGlobalNote = async () => {
      
    try {
      // gets the global meal prep document
      const shoppingDoc = ((await getDoc(doc(db, 'GLOBALS', 'shopping'))));
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
            unitList.push(doc.data().ingredientData[i][doc.data().ingredientStores[i]].unit);
            multList.push(doc.data().spotlightMult);
          
          // if it doesn't
          } else if (allStoreLists[selectedStore][index].id === doc.data().ingredientIds[i] && doc.data().ingredientStores[i] !== selectedStore) {
            otherStores.push({ 
              ingredientStore: storeLabels[storeKeys.indexOf(doc.data().ingredientStores[i])] || "",
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
    await updateDoc(doc(db, 'GLOBALS', 'shopping'), { spotlights: spotlightsData });
    await getAllShoppingLists(spotlightsSnapshot, ids, selected, ingredientIdList, ingredientIncludedList);
    setSpotlightModalVisible(false);
  }


  ///////////////////////////////// HTML /////////////////////////////////

  return (

    // CONTAINER
    <View className="flex flex-col w-full h-full items-center justify-center bg-zinc300 border-0.5">
      
      {/* Store Display */}
      <View className="flex h-4/5 -mt-5 w-full justify-center items-center space-y-5">

        {/* HEADER */}
        <View className="flex flex-row w-11/12 justify-evenly items-center h-[30px] border-[1px] border-black bg-zinc700">
                  
          {/* Selection */}
          <View className="w-[45%] h-[30px] ml-[-10px] z-20">
            <Picker
              selectedValue={selectedStore}
              onValueChange={setSelectedStore}
              style={{ height: 30, justifyContent: 'center', overflow: 'hidden', backgroundColor: calcNumLeft() !== 0 ? colors.theme600 : colors.zinc500, borderWidth: 1, }}
              itemStyle={{ color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 13, }}
            >
              {storeLabels.map((storeLabel, index) => {
                if (storeListLengths[storeKeys[index]] > 0) {
                  return <Picker.Item key={storeKeys[index]} label={storeLabel.toUpperCase()} value={storeKeys[index]} />;
                }
                return null;
              })}
            </Picker>
          </View>

          {/* Calculates the cost of the current store */}
          <Text className="text-white font-bold text-center">
            {"LIST COST: $"}{allStoreCosts[selectedStore]?.toFixed(2)}
          </Text>
        </View>

        {/* selects the store from the dropdown */}
        {storeKeys
          .filter((store) => store === selectedStore)
          .map((store) => {

          return (
            <View
              key={store}
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
                                <View className={`flex w-[30px] justify-center items-center ${Array.isArray(allStoreChecks[selectedStore]) && allStoreChecks[selectedStore][index] ? "bg-zinc500" : "bg-theme700"} space-y-[4px] border-r-0.5`}>
                                  
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
                                <View className="w-[30px] bg-zinc300 border-r-0.5 justify-center items-center z-10">
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
        <View className="flex flex-col justify-center items-center w-[45%] h-[90%] bg-theme400 rounded-lg border-0.5 border-black">
          
          {/* overall price and number of recipes */}
          <TouchableOpacity className="flex w-full py-2 bg-zinc500 justify-center items-center border-b-0.5 rounded-t-lg" onPress={() => setSpotlightModalVisible(true)}>
            <Text className="font-bold text-[14px] text-white text-center">
              {"$"}
              {storeKeys.reduce((sum, key) => sum + (storeListCosts[key] || 0), 0).toFixed(2)}
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
          {Object.entries(storeListLengths).filter(([key, value]) => key !== selectedStore && value !== 0).length
          ?
            <ScrollView className="flex flex-col pt-1.5 mb-2">
              {storeKeys.map((storeKey, index) => (
                <View key={index}>
                {(selectedStore !== storeKey && storeListLengths[storeKey] > 0) && 
                  <View className="flex flex-row justify-end space-x-1 mb-0.5">
                    {/* whether the shopping list is done */}
                    <Icon
                      name={storeListDone[storeKey] ? "checkmark" : "close-outline"}
                      color={colors.theme900}
                      size={16}
                    />
                    {/* Store label and cost */}
                    <Text className="text-[13px]">
                      {storeLabels[index].toUpperCase() + ": $"}{storeListCosts[storeKey].toFixed(2)}
                    </Text>
                  </View>
                }
                </View>
              ))}
            </ScrollView>
          : // if there are no other stores present
            <View className="flex-1 pt-1.5 mb-2 justify-center items-center">
              <Text className="text-center italic text-zinc800">
                no other stores have shopping lists
              </Text>
            </View>
          }
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
                className={`${currNote !== "" ? "text-black" : "text-zinc400"} flex-1 bg-white border-[1px] border-zinc400 px-[10px] rounded-[5px] py-[5px] text-[13px] leading-[16px]`}
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