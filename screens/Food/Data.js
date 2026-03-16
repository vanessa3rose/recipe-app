///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useRef, useState, useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';

// UI components
import { View, Text, ScrollView, TextInput, Linking, Keyboard, TouchableOpacity } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
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

// modals
import ModDetailsModal from '../../components/Food-Data/ModDetailsModal';
import ModIngredientModal from '../../components/Food-Data/ModIngredientModal';
import DeleteIngredientModal from '../../components/Food-Data/DeleteIngredientModal';

// initialize firebase app
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

export default function Data ({ isSelectedTab }) {


  ///////////////////////////////// KEYBOARD /////////////////////////////////

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardType, setKeyboardType] = useState("");

  // keyboard listener
  useEffect(() => {
    
    // listens for keyboard show event
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      if (keyboardType === "page") {
        setIsKeyboardOpen(true);
      }
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
  }, [keyboardType]);
  

  ///////////////////////////////// NAVIGATION LOGIC /////////////////////////////////

  // when the tab is switched to recipes
  useEffect(() => {

    if (isSelectedTab) {   
      getCardSnapshots();
    }
  }, [isSelectedTab]);
  
  const previousIndexRef = useRef(null);
  const currentIndex = useNavigationState((state) => state.index);

  // if the screen has changed
  useEffect(() => {

    // if the page has changed to the current one, refetch the spotlight snapshot
    if (isSelectedTab && previousIndexRef !== null && previousIndexRef.current !== currentIndex && currentIndex === 3) {
      setTimeout(() => {
        getSpotlightSnapshot();
      }, 1000);
    }

    // updates the ref to the new index
    previousIndexRef.current = currentIndex;
  }, [currentIndex]);
  

  ///////////////////////////////// SNAPSHOTS /////////////////////////////////

  const [ingredientsSnapshot, setIngredientsSnapshot] = useState(null);

  const [recipeSnapshot, setRecipeSnapshot] = useState(null);
  const [recipeIds, setRecipeIds] = useState(null);

  const [spotlightSnapshot, setSpotlightSnapshot] = useState(null);
  const [spotlightIds, setSpotlightIds] = useState(null);

  // gets the collection of recipes & spotlights
  const getCardSnapshots = async () => {
    const recipes = await getRecipeSnapshot();
    const spotlights = await getSpotlightSnapshot();
    loadUniqueLists(null, recipes, spotlights);
  }

  // gets the collection of recipes
  const getRecipeSnapshot = async () => {
    const querySnapshot = await getDocs(collection(db, 'RECIPES'));
    setRecipeSnapshot(querySnapshot);

    // retrieves their ids for sorting
    setRecipeIds(querySnapshot?.docs.flatMap(doc => doc.data().ingredientIds || []));
    return querySnapshot?.docs.flatMap(doc => doc.data().ingredientIds || []);
  }

  // gets the collection of spotlights
  const getSpotlightSnapshot = async () => {
    const querySnapshot = await getDocs(collection(db, 'SPOTLIGHTS'));
    setSpotlightSnapshot(querySnapshot);

    // retrieves their ids for sorting
    setSpotlightIds(querySnapshot?.docs.flatMap(doc => doc.data().ingredientIds || []));
    return querySnapshot?.docs.flatMap(doc => doc.data().ingredientIds || []);
  }


  ///////////////////////////////// SORTING INGREDIENTS /////////////////////////////////

  // general
  const [currKey, setCurrKey] = useState("ingredientName");
  const [currOrder, setCurrOrder] = useState('caret-down-outline');

  // sorting specifics
  const wordSorts = ["ingredientName", "brand"];
  const numSorts = ["servingContainer", "calServing", "calContainer", "priceServing", "priceContainer"]
  const multiSorts = ["servingSize", "totalYield"]

  // specific
  const [ingredientSort, setIngredientSort] = useState('caret-down-outline');
  const [brandSort, setBrandSort] = useState('remove-outline');
  const [servingSizeSort, setServingSizeSort] = useState('remove-outline');
  const [servingContainerSort, setServingContainerSort] = useState('remove-outline');
  const [servingYieldSort, setServingYieldSort] = useState('remove-outline');
  const [calServingSort, setCalServingSort] = useState('remove-outline');
  const [calContainerSort, setCalContainerSort] = useState('remove-outline');
  const [priceServingSort, setPriceServingSort] = useState('remove-outline');
  const [priceContainterSort, setPriceContainerSort] = useState('remove-outline');

  // when the column that is being sorted is changed
  const changeSortCol = (sort, setSort, key) => {
    
    let order = 'remove-outline';

    if (sort === 'remove-outline') {
      order = 'caret-down-outline'; // ascending
    } else if (sort === 'caret-down-outline') {
      order = 'caret-up-outline'; // descending
    }
  
    // resets all other sort states
    setIngredientSort('remove-outline');
    setBrandSort('remove-outline');
    setServingSizeSort('remove-outline');
    setServingContainerSort('remove-outline');
    setServingYieldSort('remove-outline');
    setCalServingSort('remove-outline');
    setCalContainerSort('remove-outline');
    setPriceServingSort('remove-outline');
    setPriceContainerSort('remove-outline');
  
    // applies the new state to the current column
    setSort(order);
    setCurrOrder(order);
  
    // stores the current sort info
    setCurrKey(key);
  }


  ///////////////////////////////// FILTERING INGREDIENTS /////////////////////////////////
  
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');     
  
  // for store picker
  const [selectedStore, setSelectedStore] = useState(storeKeys[0]); 

  // for type dropdown
  const [selectedType, setSelectedType] = useState("-"); 
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);   // the ingredient search textinput at the top

  // for filter type
  const [filterType, setFilterType] = useState("ingredient");   // for the searchbar
  const [filterKey, setFilterKey] = useState("ingredientName");   // for the attribute
  
  // for specific filtering
  const [emptyFiltering, setEmptyFiltering] = useState("filter-circle-outline");   // the filter button at the top left
  const [includedFiltering, setIncludedFiltering] = useState("remove");            // the filter button to the left of the grid
  
  // inclusion vs exclusion
  const [exactFiltering, setExactFiltering] = useState(false);                     // the filter button (letters) in the 1st textbar
  const [exactExclusionFiltering, setExactExclusionFiltering] = useState(false);   // the filter button (letters) in the 2nd textbar
  const [showExclusion, setShowExclusion] = useState(false);
  const [excludeQuery, setExcludeQuery] = useState('');

  // helper function
  const getValue = (obj, key) => key.split('.').reduce((o, i) => (o ? o[i] : ''), obj);

  // getting a specific store's ingredients
  const storeIngredientFetch = async (storeKey, ingredientsSnapshot) => {
    
    try {
      // loops over snapshot and compiles data
      const ingredientsArray = ingredientsSnapshot?.docs.map((doc) => {
        const ingredient = doc.data();
        
        // calculation data
        let size = ingredient.ingredientData[storeKey]?.servingSize || '';
        let container = ingredient.ingredientData[storeKey]?.servingContainer || '';
        let cal = ingredient.ingredientData[storeKey]?.calServing || '';
        let price = ingredient.ingredientData[storeKey]?.priceContainer || '';
        const validLink = ingredient.ingredientData[storeKey].link && ingredient.ingredientData[storeKey].link !== '#' ? ingredient.ingredientData[storeKey].link : null;
        
        // final data
        const formattedIngredient = {
          id: doc.id,
          ingredientName: ingredient.ingredientName || "",
          ingredientTypes: ingredient.ingredientTypes || [],
          link: validLink,
          brand: ingredient.ingredientData[storeKey].brand || '',
          unit: ingredient.ingredientData[storeKey]?.unit || '',
          servingSize: size,
          servingContainer: container,
          totalYield: (size === "" || container === "") ? "" : (new Fractional(size)).multiply(new Fractional(container)).toString(), 
          calServing: cal,
          calContainer: (cal === "" || container === "") ? "" : ((new Fraction((new Fractional(cal)).multiply(new Fractional(container)).toString())) * 1).toFixed(0),
          priceServing: (price === "" || container === "") ? "" : ((new Fraction((new Fractional(price)).divide(new Fractional(container)).toString())) * 1).toFixed(2),
          priceContainer: price === "" ? "" : parseFloat(price).toFixed(2)
        };
  
        return formattedIngredient;
      });
  
      return ingredientsArray;
  
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      throw error;
    }
  };

  // remove empty brands and maintain sorting
  const filterIngredientData = async (snapshot, currName, recipes, spotlights, prevPage) => {
    let dataToUse = await storeIngredientFetch(selectedStore, snapshot);
    
    // refilters based on type
    if (selectedType !== "-") {
      dataToUse = dataToUse.filter(ingredient => 
        Array.isArray(ingredient.ingredientTypes) 
          ? ingredient.ingredientTypes.includes(selectedType) 
          : ingredient.ingredientTypes === selectedType
      );
    }
    
    // refilters based on ingredient
    if (searchQuery !== "") {
      dataToUse = dataToUse.filter(ingredient => {
        const queryWords = searchQuery
          .toLowerCase()
          .split(' ')
          .filter(word => word.trim() !== '');  // splits into words and remove empty strings

        const ingredientWords = ingredient[filterKey].toLowerCase().split(' ').flatMap(word => word.split(':')).flatMap(word => word.split(',')).flatMap(word => word.split('('));
        const ingredientUnits = ingredient.unit.toLowerCase().split(' ').flatMap(word => word.split('('));
          
        // filtering for exact
        if (exactFiltering) {
          return filterKey === "servingSize" || filterKey === "totalYield"
            // unit then measurement
            ? queryWords.filter(word => word.split("").filter(char => !isNaN(char)).length !== 0).length !== 0
              ? (queryWords.filter(word => word.split("").filter(char => !isNaN(char)).length === 0).flatMap(word => word.split('(')).every(word => ingredientUnits.includes(word))
                  && (ingredientWords.filter(word => word.split("").filter(char => !isNaN(char)).length !== 0).join(" ") === queryWords.filter(word => word.split("").filter(char => !isNaN(char)).length !== 0).join(" ")))
              : queryWords.filter(word => word.split("").filter(char => !isNaN(char)).length === 0).flatMap(word => word.split('(')).every(word => ingredientUnits.includes(word))
            // measurement
            : filterKey === "servingContainer" ? ingredientWords.join(" ") === queryWords.join(" ")
            // value
            : queryWords.every(word => ingredientWords.includes(word));

        // filtering for inclusion
        } else {
          return filterKey === "servingSize" || filterKey === "totalYield"
            // unit then measurement
            ? (queryWords.filter(word => word.split("").filter(char => !isNaN(char)).length === 0).every(word => ingredient.unit.toLowerCase().includes(word))
                && ingredient[filterKey].toLowerCase().includes(queryWords.filter(word => word.split("").filter(char => !isNaN(char)).length !== 0).join(" ")))
            // measurement
            : filterKey === "servingContainer" ? ingredient[filterKey].toLowerCase().includes(queryWords.join(" "))
            // value
            : queryWords.every(word => ingredient[filterKey].toLowerCase().includes(word));
        }
      });
    }
    
    // refilters based on exclusions
    if (showExclusion && excludeQuery !== "") {
      dataToUse = dataToUse.filter(ingredient => {
        const queryWords = excludeQuery
          .toLowerCase()
          .split(' ')
          .filter(word => word.trim() !== '');  // splits into words and remove empty strings

        const ingredientWords = ingredient[filterKey].toLowerCase().split(' ').flatMap(word => word.split(':')).flatMap(word => word.split(',')).flatMap(word => word.split('('));
        const ingredientUnits = ingredient.unit.toLowerCase().split(' ').flatMap(word => word.split('('));
          
        // filtering for exact
        if (exactExclusionFiltering) {
          return filterKey === "servingSize" || filterKey === "totalYield"
            // unit then measurement
            ? queryWords.filter(word => word.split("").filter(char => !isNaN(char)).length !== 0).length !== 0
              ? !(queryWords.filter(word => word.split("").filter(char => !isNaN(char)).length === 0).flatMap(word => word.split('(')).every(word => ingredientUnits.includes(word))
                  && (ingredientWords.filter(word => word.split("").filter(char => !isNaN(char)).length !== 0).join(" ") === queryWords.filter(word => word.split("").filter(char => !isNaN(char)).length !== 0).join(" ")))
              : !queryWords.filter(word => word.split("").filter(char => !isNaN(char)).length === 0).flatMap(word => word.split('(')).every(word => ingredientUnits.includes(word))
            // measurement
            : filterKey === "servingContainer" ? ingredientWords.join(" ") !== queryWords.join(" ")
            // value
            : !queryWords.every(word => ingredientWords.includes(word));

        // filtering for inclusion
        } else {
          return filterKey === "servingSize" || filterKey === "totalYield"
            // unit then measurement
            ? !(queryWords.filter(word => word.split("").filter(char => !isNaN(char)).length === 0).every(word => ingredient.unit.toLowerCase().includes(word))
                && ingredient[filterKey].toLowerCase().includes(queryWords.filter(word => word.split("").filter(char => !isNaN(char)).length !== 0).join(" ")))
            // measurement
            : filterKey === "servingContainer" ? !ingredient[filterKey].toLowerCase().includes(queryWords.join(" "))
            // value
            : !queryWords.every(word => ingredient[filterKey].toLowerCase().includes(word));
        }
      });
    }
    
    // filters out empty brands
    if (emptyFiltering === "filter-circle") {
      dataToUse = dataToUse.filter(ingredient => ingredient.brand !== "");
    // filters out filled brands
    } else if (emptyFiltering === "ellipse-outline") {
      dataToUse = dataToUse.filter(ingredient => ingredient.brand === "");
    }

    // filters for inclusions in recipes/spotlights
    const linkedIds = new Set([...recipes, ...spotlights]);
    if (includedFiltering === "link") {
      dataToUse = dataToUse.filter(ingredient => linkedIds.has(ingredient.id));
    } else if (includedFiltering === "unlink") {
      dataToUse = dataToUse.filter(ingredient => !linkedIds.has(ingredient.id));
    }

    // applies sorting after filtering
    if (currKey && currOrder) {

      // for word sorting
      if (wordSorts.includes(currKey)) {
        dataToUse = [...dataToUse].sort((a, b) => {
          const strA = (getValue(a, currKey) || '').toString().toLowerCase();
          const strB = (getValue(b, currKey) || '').toString().toLowerCase();
    
          // A->Z or Z->A
          if (currOrder === 'caret-down-outline') {
            return strA > strB ? 1 : strA < strB ? -1 : 0;
          } else if (currOrder === 'caret-up-outline') {
            return strA < strB ? 1 : strA > strB ? -1 : 0;
          }
          return 0;
        });

      // for number sorting
      } else if (numSorts.includes(currKey)) {
        dataToUse = [...dataToUse].sort((a, b) => {
          const numA = new Fractional(getValue(a, currKey)).numerator / new Fractional(getValue(a, currKey)).denominator;
          const numB = new Fractional(getValue(b, currKey)).numerator / new Fractional(getValue(b, currKey)).denominator;

          // 0-> or ->0
          if (currOrder === 'caret-down-outline') {
            return numA > numB ? 1 : numA < numB ? -1 : 0;
          } else if (currOrder === 'caret-up-outline') {
            return numA < numB ? 1 : numA > numB ? -1 : 0;
          }
          return 0;
        });
      
      // for multi sorting
      } else if (multiSorts.includes(currKey)) {
        dataToUse = [...dataToUse].sort((a, b) => {
          // string
          const strA = (getValue(a, 'unit') || '').toString().toLowerCase();
          const strB = (getValue(b, 'unit') || '').toString().toLowerCase();
          // number
          const numA = new Fractional(getValue(a, currKey)).numerator / new Fractional(getValue(a, currKey)).denominator;
          const numB = new Fractional(getValue(b, currKey)).numerator / new Fractional(getValue(b, currKey)).denominator;

          // A->Z then 0-> or Z->A then ->0
          if (currOrder === 'caret-down-outline') {
            return strA > strB ? 1 : strA < strB ? -1 : (numA > numB ? 1 : numA < numB ? -1 : 0);
          } else if (currOrder === 'caret-up-outline') {
            return strA < strB ? 1 : strA > strB ? -1 : (numA < numB ? 1 : numA > numB ? -1 : 0);
          }
          return 0;
        });
      }
    }

    let newPage = 1;
    
    // recalculates the current page based on the index of the current ingredient
    if (currName !== "") {
      const idx = dataToUse.map(ingredient => ingredient.ingredientName).indexOf(currName);
      newPage = (Math.floor(idx / NUM_PER_PAGE) + 1).toString();

      // scrolls to the correct y value
      const scrollY = (idx % NUM_PER_PAGE) * ITEM_HEIGHT;
      if (verticalScrollRef.current) { verticalScrollRef.current.scrollTo({ y: scrollY, animated: false }); }
      if (modScrollRef.current) {  modScrollRef.current.scrollTo({ y: scrollY, animated: false }); }

      // stores the current name to highlight
      setCurrIngredientName(currName);

    // recalculates the current page based on lengths
    } else {
      newPage = (
        Math.round((prevPage / dataLength) * dataToUse.length) === 0 || dataLength === 0
          || Math.round((prevPage / dataLength) * dataToUse.length) > Math.ceil(dataToUse.length / NUM_PER_PAGE)
        ? 1
        : Math.round((prevPage / dataLength) * dataToUse.length)
      ).toString();
    }
    
    setDataPage(newPage);
    setDataLength(dataToUse.length);

    // filters based on the selected page
    dataToUse = dataToUse.filter((_, index) => 
      index >= (Number(newPage) - 1) * NUM_PER_PAGE && index < Number(newPage) * NUM_PER_PAGE
    );
    
    // sets the filtered data in the state
    setFilteredData(dataToUse);
  }
  
  // synchronize filtering and sorting whenever filters change
  useEffect(() => {
    if (ingredientsSnapshot) {
      filterIngredientData(ingredientsSnapshot, currIngredientName, recipeIds, spotlightIds, dataPage);
    }
  }, [emptyFiltering, includedFiltering, exactFiltering, searchQuery, showExclusion, exactExclusionFiltering, excludeQuery, selectedStore, selectedType, filterKey, currKey, currOrder]);


  ///////////////////////////////// TYPE AND BRAND DROPDOWNS /////////////////////////////////

  const [typeList, setTypeList] = useState([]);
  const [brandLists, setBrandLists] = useState({});

  // loads the unique ingredient or brand types
  const loadUniqueLists = async (currIngredient, recipes, spotlights) => {
    const valuesMap = new Map();
    
    // Initialize sets for each store and ingredientTypes
    valuesMap.set('ingredientTypes', new Set());
    storeKeys.forEach(store => valuesMap.set(store, new Set()));

    const querySnapshot = await getDocs(collection(db, 'INGREDIENTS'));

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // collects ingredient types
      if (Array.isArray(data.ingredientTypes)) {
        data.ingredientTypes.forEach(type => {
          if (type !== '') valuesMap.get('ingredientTypes').add(type);
        });
      }

      // collects store brands
      storeKeys.forEach(storeKey => {
        const storeData = data.ingredientData?.[storeKey];
        const brand = storeData?.brand;
        if (brand && brand !== '') {
          valuesMap.get(storeKey).add(brand);
        }
      });
    });
    
    // sets and refilters data
    setIngredientsSnapshot(querySnapshot);
    setCurrIngredientName(currIngredient?.ingredientName || "")
    filterIngredientData(querySnapshot, currIngredient?.ingredientName || "", recipes, spotlights, dataPage);
    
    // processes ingredientTypes
    const ingredientTypeValues = [...valuesMap.get('ingredientTypes')].filter(val => val !== 'CUSTOM');
    const sortedTypeList = [
      { label: 'CUSTOM', value: 'CUSTOM', labelStyle: { color: 'white' } },
      ...ingredientTypeValues.map(val => ({ label: val, value: val })).sort((a, b) => a.value.localeCompare(b.value))
    ];
    setTypeList(sortedTypeList);

    // processes brand lists into one object
    const brandListsObj = {};
    storeKeys.forEach(storeKey => {
      const brandValues = [...valuesMap.get(storeKey)].filter(val => val !== 'CUSTOM');
      const sortedBrands = brandValues.map(val => ({ label: val, value: val })).sort((a, b) => a.value.localeCompare(b.value));
      brandListsObj[storeKey] = sortedBrands;
    });
  
    // Set all brand lists in one go
    setBrandLists(brandListsObj);
  };


  ///////////////////////////////// ADD/EDIT AN INGREDIENT /////////////////////////////////

  const [currIngredientName, setCurrIngredientName] = useState("");

  const [modModalVisible, setModModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [addingType, setAddingType] = useState(null);
  
  // when submitting the modal
  const closeModModal = async (types, brands, modedData) => { 
    setModModalVisible(false);
      
    // fetches the new snapshots
    const recipes = await getRecipeSnapshot();
    const spotlights = await getSpotlightSnapshot();

    // reloads types and brands
    loadUniqueLists(modedData, recipes, spotlights);

    // resets
    setEditingId(null);
    setTypeList(types);
    setBrandLists(brands);
  };

  // when canceling the modal
  const cancelModModal = () => {
    setEditingId(null);
    setModModalVisible(false);
  }

  // when opening the mod modal to edit
  const openEditModal = (ingredientId) => {
    
    setEditingId(ingredientId);
    setModModalVisible(true);

    // resets the selected type if it's not in the typeList
    if (selectedType !== "-" && !typeList.some(item => item.label === selectedType || item.value === selectedType)) {
      setSelectedType("-"); 
    }
  };


  ///////////////////////////////// DELETING AN INGREDIENT /////////////////////////////////

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // when opening the delete modal
  const openDeleteModal = (ingredientId) => {
    setDeletingId(ingredientId);
    setDeleteModalVisible(true);
  };

  // when confirming the deletion of an ingredient
  const confirmDelete = async () => {

    // if a valid ingredient is being deleted
    if (deletingId) {
      setDeleteModalVisible(false);
      setDeletingId(null);

      // resets the selected type if it's not in the typeList
      if (selectedType !== "-" && selectedType !== "" && !typeList.some(item => item.label === selectedType || item.value === selectedType)) {
        setSelectedType("-"); 
      }

      // fetches the new snapshots
      const recipes = await getRecipeSnapshot();
      const spotlights = await getSpotlightSnapshot();

      // reloads types and brands
      loadUniqueLists(null, recipes, spotlights);
    }
  };

  // when canceling the deletion of an ingredient
  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setDeletingId(null);
  };


  ///////////////////////////////// TYPES SEARCH /////////////////////////////////

  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  // to submit the ingredient details modal
  const closeDetailsModal = async () => {
    setDetailsModalVisible(false);

    // fetches the new snapshots
    const recipes = await getRecipeSnapshot();
    const spotlights = await getSpotlightSnapshot();

    // reloads types and brands
    loadUniqueLists(null, recipes, spotlights);

    // resets the selected type if it's not in the typeList
    if (selectedType !== "-" && selectedType !== "" && !typeList.some(item => item.label === selectedType || item.value === selectedType)) {
      setSelectedType("-"); 
    }
  }


  ///////////////////////////////// SCROLLING / PAGES /////////////////////////////////
  
  // horizontal scroll syncing
  const sortScrollRef = useRef(null);
  const horizontalScrollRef = useRef(null);
  const headerScrollRef = useRef(null);

  const syncHorizontalScroll = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;

    if (sortScrollRef.current) {
      sortScrollRef.current.scrollTo({ x: offsetX, animated: false });
    }
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollTo({ x: offsetX, animated: false });
    }
  };

  // vertical scroll syncing
  const verticalScrollRef = useRef(null);
  const modScrollRef = useRef(null);

  const syncVerticalScroll = (e) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    
    if (modScrollRef.current) {
      modScrollRef.current.scrollTo({ y: offsetY, animated: false });
    }
  };

  // for pages
  const [dataPage, setDataPage] = useState("1");
  const [dataLength, setDataLength] = useState(0);
  const NUM_PER_PAGE = 50;
  const ITEM_HEIGHT = 65;


///////////////////////////////// HTML /////////////////////////////////

  return (
    <View className={`w-full h-full bg-zinc300 border-0.5 py-4`}>
      <View className={`flex-1 pl-4 ${filteredData?.length === 0 ? 'pr-4' : 'pr-2'} overflow-x-auto`}>

        {/* FILTER ROW */}
        <View className="flex-row justify-center items-center w-full">
          {/* BLANK FILTERING */}
          <View className="w-[25px] justify-center items-center">
            <Icon
              name={emptyFiltering}
              color={emptyFiltering === "filter-circle-outline" ? 'black' : colors.theme600}
              size={24}
              onPress={() => setEmptyFiltering(emptyFiltering === "filter-circle-outline" ? "filter-circle" : emptyFiltering === "filter-circle" ? "ellipse-outline" : emptyFiltering === "ellipse-outline" && "filter-circle-outline")}
            />
          </View>

          {/* INGREDIENT FILTERING */}
          <View className="flex w-full mx-[-30px] px-[35px] flex-col py-2 pr items-center justify-center">
            {/* normal */}
            <View className="flex w-full h-[40px] justify-center">

              {/* Exact vs Include filtering */}
              <TouchableOpacity 
                className={`absolute left-4 z-10 bg-zinc200 rounded-sm px-[0.5px] ${exactFiltering ? "border-t-2 border-t-zinc200 border-b-2 border-b-mauve500 py-[1px]" : "py-[3px]"}`}
                activeOpacity={1}
                onPress={() => setExactFiltering(!exactFiltering)}
              >
                <Icon
                  name="text-outline"
                  size={20}
                  color={colors.mauve500}
                />
              </TouchableOpacity>

              {/* input */}
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={`search for ${filterType}`}
                placeholderTextColor={colors.zinc400}
                className="flex-1 bg-white rounded-[5px] border-[1px] border-zinc350 pl-8 pr-[60px] text-[16px] leading-[18px] ml-2.5"
                onFocus={() => setKeyboardType("")}
              />

              <View className="absolute right-1 flex flex-row">

                {/* Type Search Button */}
                {(ingredientsSnapshot?.docs?.length > 0) && (
                  <Icon 
                    size={24}
                    color={colors.theme400}
                    name="list-circle"
                    onPress={() => setDetailsModalVisible(true)}
                  />
                )}

                {/* Clear Button */}
                <Icon 
                  size={24}
                  color="black"
                  name="close-outline"
                  onPress={() => setSearchQuery("")}
                />
              </View>

              {/* Show Exclusion Button */}
              {!showExclusion && (
                <View className="absolute bottom-[-13px] left-[1.5px] rotate-45">
                  <Icon
                    name="trending-down-outline"
                    size={25}
                    color={colors.zinc500}
                    onPress={() => setShowExclusion(true)}
                  />
                </View>
              )}
            </View>

            {/* exclude */}
            {showExclusion && (
              <View className="flex w-full h-[30px] justify-center">

                {/* Exact vs Include filtering */}
                <TouchableOpacity 
                  className={`absolute left-[18px] z-20 bg-zinc300 rounded-sm px-[0.5px] ${exactExclusionFiltering ? "border-t-[1px] border-t-zinc200 border-b-[1px] border-b-mauve600" : "py-[1px]"}`}
                  activeOpacity={1}
                  onPress={() => setExactExclusionFiltering(!exactExclusionFiltering)}
                >
                  <Icon
                    name="text-outline"
                    size={16}
                    color={colors.mauve600}
                  />
                </TouchableOpacity>

                {/* input */}
                <TextInput
                  value={excludeQuery}
                  onChangeText={setExcludeQuery}
                  placeholder={`exclude from search`}
                  placeholderTextColor={colors.zinc400}
                  className={`flex-1 text-zinc800 bg-zinc100 rounded-[5px] border-[1px] italic border-zinc350 pl-8 pr-[60px] text-[14px] leading-[16px] ml-2.5 z-10 ${(excludeQuery !== "") && "line-through decoration-mauve500"}`}
                  onFocus={() => setKeyboardType("")}
                />

                {/* Clear Button */}
                <View className="absolute right-1 flex flex-row z-20">
                  <Icon 
                    size={24}
                    color="black"
                    name="close-outline"
                    onPress={() => setExcludeQuery("")}
                  />
                </View>

                {/* collapse section */}
                <View className="absolute top-[-2px] left-[-4px] z-0 rotate-90">
                  <Icon
                    name="return-down-back-outline"
                    size={20}
                    color={colors.zinc600}
                    onPress={() => setShowExclusion(false)}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Add Button */}
          <View className="flex w-[25px] justify-center items-center">
            <Icon 
              size={24}
              color="black"
              name="add-circle"
              onPress={() => {
                setAddingType(selectedType);
                setModModalVisible(true);
              }}
            />
          </View>
        </View>

        <View className="flex-1 mt-2 flex-col w-full justify-center items-center">
          {/* SORTING ROW */}
          <View className="h-[25px] max-w-[893px] pt-2">

            {/* Frozen Sorting Icon */}
            <View className="w-[125px] flex items-center absolute pt-2">
              <Icon
                size={20}
                color="black"
                name={ingredientSort}
                onPress={() => changeSortCol(ingredientSort, setIngredientSort, 'ingredientName')}
              />
            </View>
                
            {/* Scrollable Sorting Row */}
            <ScrollView
              ref={sortScrollRef}
              horizontal
              className="ml-[125px] mr-10 relative z-10"
              scrollEnabled={false}
            >
              <View className="w-[90px] flex items-center">
                <Icon
                  size={20}
                  color="black"
                  name={brandSort}
                  onPress={() => changeSortCol(brandSort, setBrandSort, 'brand')}
                />
              </View>
              <View className="w-[100px] flex items-center">
                <Icon
                  size={20}
                  color="black"
                  name={servingSizeSort}
                  onPress={() => changeSortCol(servingSizeSort, setServingSizeSort, 'servingSize')}
                />
              </View>
              <View className="w-[90px] flex items-center">
                <Icon
                  size={20}
                  color="black"
                  name={servingContainerSort}
                  onPress={() => changeSortCol(servingContainerSort, setServingContainerSort, 'servingContainer')}
                />
              </View>
              <View className="w-[100px] flex items-center">
                <Icon
                  size={20}
                  color="black"
                  name={servingYieldSort}
                  onPress={() => changeSortCol(servingYieldSort, setServingYieldSort, 'totalYield')}
                />
              </View>
              <View className="w-[90px] flex items-center">
                <Icon
                  size={20}
                  color="black"
                  name={calServingSort}
                  onPress={() => changeSortCol(calServingSort, setCalServingSort, 'calServing')}
                />
              </View>
              <View className="w-[90px] flex items-center">
                <Icon
                  size={20}
                  color="black"
                  name={calContainerSort}
                  onPress={() => changeSortCol(calContainerSort, setCalContainerSort, 'calContainer')}
                />
              </View>
              <View className="w-[90px] flex items-center">
                <Icon
                  size={20}
                  color="black"
                  name={priceServingSort}
                  onPress={() => changeSortCol(priceServingSort, setPriceServingSort, 'priceServing')}
                />
              </View>
              <View className="w-[90px] flex items-center">
                <Icon
                  size={20}
                  color="black"
                  name={priceContainterSort}
                  onPress={() => changeSortCol(priceContainterSort, setPriceContainerSort, 'priceContainer')}
                />
              </View>
            </ScrollView>
          </View>

          <View className="flex-1 flex-row h-5/6 max-w-[893px]">

            {/* MAIN CONTAINER */}
            <View className="flex-1 mt-2 mb-1 border-2 border-black bg-zinc600 pt-1.5 pb-2">

              {/* Store Dropdown */}
              <View className="absolute w-[125px] h-[40px] bg-zinc900 border-r-2 border-b-2 border-r-black border-b-zinc900 z-20 overflow-hidden">
                <Picker
                  selectedValue={selectedStore}
                  onValueChange={(itemValue) => setSelectedStore(itemValue)}
                  style={{ height: 40, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -30 }}
                  itemStyle={{ color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 12, }}
                >
                  {storeLabels.map((label, index) => (
                    <Picker.Item
                      key={index}
                      label={label.toUpperCase()}
                      value={storeKeys[index]}
                    />
                  ))}
                </Picker>
              </View>

              {/* Type Dropdown */}
              <View className="absolute mt-[40px] w-[125px] h-[50px] bg-zinc800 border-r-2 border-b-2 border-black">
                
                {/* selection */}
                <View className="z-10">
                  <DropDownPicker
                    open={typeDropdownOpen}
                    setOpen={setTypeDropdownOpen}
                    value={selectedType}
                    setValue={setSelectedType}
                    items={typeList.length > 1 
                      ? [
                        { label: "all types", value: "-", labelStyle: { color: "white" } },
                        ...typeList.map(item => ({
                          label: item.value === 'CUSTOM' ? "no type" : item.label,
                          value: item.value === 'CUSTOM' ? "" : item.label,
                          labelStyle: item.value === 'CUSTOM' 
                            ? { color: colors.zinc450, padding: 12.5, paddingLeft: 15, marginLeft: -10, marginRight: -50, backgroundColor: colors.zinc100 } 
                            : { color: 'black',  marginRight: selectedType === item.value ? -5 : 0 } 
                        }))
                      ]
                      : [{ label: 'no types available', value: 'none', labelStyle: { color: 'black' }, disabled: true }]
                    }
                    listItemContainerStyle={{ borderBottomWidth: 1, borderBottomColor: colors.zinc200, }}
                    placeholder="all types" 
                    placeholderStyle={{ fontWeight: 'bold' }}
                    style={{ height: 50, backgroundColor: colors.zinc800, borderWidth: 0, borderBottomWidth: 2, justifyContent: 'center' }}
                    dropDownContainerStyle={{ backgroundColor: 'white', }}
                    textStyle={{ color: colors.theme100, fontWeight: 'bold', textAlign: 'center', fontSize: 12, }}
                    listItemLabelStyle={{ textAlign: 'left', paddingLeft: 5, fontSize: 12, color: colors.zinc800, }}
                    TickIconComponent={() => selectedType !== "-" && <Icon name="checkmark" size={18} color="black" /> }
                    ArrowDownIconComponent={() => {
                      return ( <Icon size={18} color={ colors.theme100 } name="chevron-down" /> );
                    }}
                    ArrowUpIconComponent={() => {
                      return ( <Icon size={18} color={ colors.theme100 } name="chevron-up" /> );
                    }}
                  />
                </View>
                
                {/* Frozen "all" Selection */}
                {typeDropdownOpen && (
                  <TouchableOpacity
                    className="w-full absolute z-40 mt-[50px] h-[40px] bg-zinc200 justify-center items-start pl-4 border-x-[1px] border-x-black border-b-[0.5px] border-b-zinc300"
                    onPress={() => {
                      setSelectedType("-")
                      setTypeDropdownOpen(false);
                    }}
                  >
                    {/* label */}
                    <Text className="text-theme600 text-[12px] font-bold">
                      all types
                    </Text>

                    {/* indicator */}
                    {(selectedType === "-") && (
                      <View className="absolute right-2">
                        <Icon 
                          name="checkmark" 
                          size={18} 
                          color="black" 
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Scrollable */}
              <ScrollView
                ref={headerScrollRef}
                horizontal
                className="absolute ml-[125px] h-[90px] border-b-2"
                scrollEnabled={false}
              >
                {/* BRAND */}
                <TouchableOpacity 
                  activeOpacity={1}
                  onPress={() => {setFilterType(filterType === "brand" ? "ingredient" : "brand"); setFilterKey(filterType === "brand" ? "ingredientName" : "brand")}}
                  className={`p-2 border-r w-[89px] flex justify-center items-center ${filterType === "brand" ? "bg-mauve950" : "bg-theme900"}`}
                >
                  <Text className="text-center font-bold text-white text-[12px]">BRAND</Text>
                </TouchableOpacity>

                {/* SERVINGS */}
                <View className="flex flex-col border-l border-r-[1.5px] w-[290px]">
                  <TouchableOpacity 
                    activeOpacity={1}
                    onPress={() => {setFilterType(filterType === "unit" ? "ingredient" : "unit"); setFilterKey(filterType === "unit" ? "ingredientName" : "unit")}}
                    className={`p-2 w-[290px] h-[44.44%] justify-center border-b-[1px] border-b-zinc900 ${filterType === "unit" ? "bg-mauve950" : "bg-theme900"}`}
                  >
                    <Text className="text-center font-bold text-white text-[12px]">SERVINGS</Text>
                  </TouchableOpacity>
                  
                  <View className="flex flex-row h-[55.55%]">
                    {/* serving size */}
                    <TouchableOpacity 
                      activeOpacity={1}
                      onPress={() => {setFilterType(filterType === "serving size" ? "ingredient" : "serving size"); setFilterKey(filterType === "servingSize" ? "ingredientName" : "servingSize")}}
                      className={`p-2 border-r-0.5 w-[100px] justify-center ${filterType === "serving size" ? "bg-mauve900" : "bg-theme800"}`}
                    >
                      <Text className="text-center font-bold text-white text-[12px]"> {"SERVING\nSIZE"} </Text>
                    </TouchableOpacity>
                    {/* per container */}
                    <TouchableOpacity 
                      activeOpacity={1}
                      onPress={() => {setFilterType(filterType === "servings per container" ? "ingredient" : "servings per container"); setFilterKey(filterType === "servingContainer" ? "ingredientName" : "servingContainer")}}
                      className={`p-2 border-r-0.5 w-[90px] justify-center ${filterType === "servings per container" ? "bg-mauve900" : "bg-theme800"}`}
                    >
                      <Text className="text-center font-bold text-white text-[12px]"> {"PER\nCONTAINER"} </Text>
                    </TouchableOpacity>
                    {/* total yield */}
                    <TouchableOpacity 
                      activeOpacity={1}
                      onPress={() => {setFilterType(filterType === "total yield" ? "ingredient" : "total yield"); setFilterKey(filterType === "totalYield" ? "ingredientName" : "totalYield")}}
                      className={`p-2 w-[100px] justify-center ${filterType === "total yield" ? "bg-mauve900" : "bg-theme800"}`}
                    >
                      <Text className="text-center font-bold text-white text-[12px]"> {"TOTAL\nYIELD"} </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* CALORIES */}
                <View className="flex flex-col border-x-[1.5px] w-[180px]">
                  <View className="p-2 bg-theme900 border-b-[1px] border-b-zinc800 w-[180px] h-[44.44%] justify-center">
                    <Text className="text-center font-bold text-white text-[12px]">CALORIES</Text>
                  </View>

                  <View className="flex flex-row h-[55.55%] bg-theme800">
                    {/* per serving */}
                    <TouchableOpacity 
                      activeOpacity={1}
                      onPress={() => {setFilterType(filterType === "calories per serving" ? "ingredient" : "calories per serving"); setFilterKey(filterType === "calServing" ? "ingredientName" : "calServing")}}
                      className={`p-2 border-r-0.5 w-[90px] justify-center ${filterType === "calories per serving" ? "bg-mauve900" : "bg-theme800"}`}
                    >
                      <Text className="text-center font-bold text-white text-[12px]"> {"PER\nSERVING"} </Text>
                    </TouchableOpacity>
                    {/* per container */}
                    <TouchableOpacity 
                      activeOpacity={1}
                      onPress={() => {setFilterType(filterType === "calories per container" ? "ingredient" : "calories per container"); setFilterKey(filterType === "calContainer" ? "ingredientName" : "calContainer")}}
                      className={`p-1 w-[90px] justify-center ${filterType === "calories per container" ? "bg-mauve900" : "bg-theme800"}`}
                    >
                      <Text className="text-center font-bold text-white text-[12px]"> {"PER\nCONTAINER"} </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* PRICE */}
                <View className="flex flex-col border-l-[1.5px] w-[180px]">
                  <View className="p-2 bg-theme900 border-b-[1px] border-b-zinc800 w-[180px] h-[44.44%] justify-center">
                    <Text className="text-center font-bold text-white text-[12px]">PRICE</Text>
                  </View>

                  <View className="flex flex-row h-[55.55%]">
                    {/* per serving */}
                    <TouchableOpacity 
                      activeOpacity={1}
                      onPress={() => {setFilterType(filterType === "price per serving" ? "ingredient" : "price per serving"); setFilterKey(filterType === "priceServing" ? "ingredientName" : "priceServing")}}
                      className={`p-2 border-r-0.5 w-[90px] justify-center ${filterType === "price per serving" ? "bg-mauve900" : "bg-theme800"}`}
                    >
                      <Text className="text-center font-bold text-white text-[12px]"> {"PER\nSERVING"} </Text>
                    </TouchableOpacity>
                    {/* per container */}
                    <TouchableOpacity 
                      activeOpacity={1}
                      onPress={() => {setFilterType(filterType === "price per container" ? "ingredient" : "price per container"); setFilterKey(filterType === "priceContainer" ? "ingredientName" : "priceContainer")}}
                      className={`p-2 w-[90px] justify-center ${filterType === "price per container" ? "bg-mauve900" : "bg-theme800"}`}
                    >
                      <Text className="text-center font-bold text-white text-[12px]"> {"PER\nCONTAINER"} </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              {/* Scrollable Content */}
              {filteredData.length > 0 
              ?
                <ScrollView
                  className="mt-[100px] mb-[25px]"
                  ref={verticalScrollRef}
                  vertical
                  onScroll={syncVerticalScroll}
                  scrollEventThrottle={16}
                  contentContainerStyle={{ flexDirection: 'row' }}
                >
                  {/* Fixed First Column */}
                  <View className="w-[125px]">
                    {filteredData?.map((ingredient, index) => (
                      <View 
                        key={index} 
                        className={`border-b-0.5 border-b-theme600 border-r-2 h-[${ITEM_HEIGHT}px] ${currIngredientName === ingredient.ingredientName ? "border-r-zinc500" : "border-r-theme600"} ${index % 2 !== 0 ? (currIngredientName === ingredient.ingredientName ? 'bg-zinc450' : 'bg-theme400') : (currIngredientName === ingredient.ingredientName ? 'bg-zinc350' : 'bg-theme300')} w-[125px] flex justify-center items-center`}
                      >
                        {/* name */}
                        <Text
                          className={`text-center font-bold text-white text-[12px] px-2 ${ingredient.link && "underline"}`}
                          onPress={ ingredient.link ? () => Linking.openURL(ingredient.link) : undefined }
                        >
                          {ingredient.ingredientName}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Scrollable Columns */}
                  <ScrollView
                    ref={horizontalScrollRef}
                    horizontal
                    onScroll={syncHorizontalScroll}
                    scrollEventThrottle={16}
                  >
                    <View>
                    {filteredData?.map((ingredient, index) => (

                      <View key={index} className={`flex-row h-[${ITEM_HEIGHT}px] ${index % 2 !== 0 ? 'bg-gray200' : 'bg-white'}`}>

                        {/* Brand */}
                        <View className="w-[90px] flex justify-center items-center p-2 border-r-2 border-zinc500">
                          <Text className="text-[12px] -mx-1 text-center">{ingredient.brand}</Text>
                        </View>

                        {/* Serving size + unit */}
                        <View className="w-[100px] flex justify-center items-center p-2 border-r-0.5 border-zinc500">
                          <Text className="text-[12px] text-center">{`${ingredient.servingSize} ${ingredient.unit}`}</Text>
                        </View>

                        {/* Serving container */}
                        <View className="w-[90px] flex justify-center items-center p-2 border-r-0.5 border-zinc500">
                          <Text className="text-[12px] text-center">{ingredient.servingContainer}</Text>
                        </View>

                        {/* Total yield */}
                        <View className="w-[100px] flex justify-center items-center p-2 border-r-2 border-zinc500">
                          <Text className="text-[12px] text-center">{`${ingredient.totalYield} ${ingredient.unit}`}</Text>
                        </View>

                        {/* Calories per serving */}
                        <View className="w-[90px] flex justify-center items-center p-2 border-r-0.5 border-zinc500">
                          <Text className="text-[12px] text-center">{ingredient.calServing}</Text>
                        </View>

                        {/* Calories per container */}
                        <View className="w-[90px] flex justify-center items-center p-2 border-r-2 border-zinc500">
                          <Text className="text-[12px] text-center">{ingredient.calContainer}</Text>
                        </View>

                        {/* Price per serving */}
                        <View className="w-[90px] flex justify-center items-center p-2 border-r-0.5 border-zinc500">
                          <Text className="text-[12px] text-center">{`${ingredient.priceServing !== "" ? "$" : ""}${ingredient.priceServing}`}</Text>
                        </View>

                        {/* Price per container */}
                        <View className="w-[90px] flex justify-center items-center p-2">
                          <Text className="text-[12px] text-center">{`${ingredient.priceServing !== "" ? "$" : ""}${ingredient.priceContainer}`}</Text>
                        </View>
                      </View>
                    ))}
                    </View>
                  </ScrollView>
                </ScrollView>
              :
                // if there are no ingredients / filtering doesn't match any
                <View className="flex w-full h-full pt-[50px] justify-center items-center">
                  <Text className="text-theme200 italic font-bold">
                    NO INGREDIENTS AVAILABLE
                  </Text>
                </View>
              }


              {/* PAGES */}
              {(dataLength > 0) && (
                <View className="flex flex-row absolute bottom-1.5 justify-between px-2 w-full">
                    
                  <View className="flex flex-row space-x-2 justify-center items-center h-full">
                    {/* Clear Current */}
                    <Icon
                      name="reload"
                      size={14}
                      color={colors.zinc200}
                      onPress={() => filterIngredientData(ingredientsSnapshot, "", recipeIds, spotlightIds, 1)}
                    />

                    {/* Number of Ingredients */}
                    <Text className="text-center text-[13px] leading italic font-medium text-zinc300">
                      {dataLength}
                    </Text>
                  </View>

                  {/* Page Selection */}
                  <View className="flex flex-row space-x-1">
                    {/* Page Back */}
                    {(Number(dataPage) > 1 && Number(dataPage) <= (Math.ceil(dataLength / NUM_PER_PAGE))) && (
                      <View className="flex h-full justify-center">
                        <Icon
                          name="chevron-back"
                          size={16}
                          color={colors.zinc200}
                          onPress={ !isNaN(Number(dataPage)) ? () => 
                            filterIngredientData(ingredientsSnapshot, "", recipeIds, spotlightIds,
                              (Number(dataPage) - 1).toString() // dataPage
                            ) : undefined
                          }
                        />
                      </View>
                    )}
                    
                    {/* Page Number */}
                    <View className="flex flex-row justify-center items-center h-full">
                      <TextInput
                        className="text-center text-[13px] italic font-medium text-zinc200"
                        placeholderTextColor={colors.zinc400}
                        value={dataPage}
                        onChangeText={(value) => 
                          filterIngredientData(ingredientsSnapshot, "", recipeIds, spotlightIds,
                            // dataPage
                            value === "" ||
                            Number(value) >= 1 && Number(value) <= Math.ceil(dataLength / NUM_PER_PAGE) 
                            ? value : dataPage
                          )
                        }
                        onFocus={() => setKeyboardType("page")}
                        onBlur={() => {
                          setKeyboardType("");
                          filterIngredientData(ingredientsSnapshot, "", recipeIds, spotlightIds,
                            (dataPage === "" ? "1" : dataPage) // dataPage
                          )
                        }}
                      />
                      <Text className="text-center text-[13px] leading italic font-medium text-zinc200">
                        {` / ${Math.ceil(dataLength / NUM_PER_PAGE) === 0 ? "1" : Math.ceil(dataLength / NUM_PER_PAGE)}`}
                      </Text>
                    </View>
                    
                    {/* Page Forward */}
                    {(dataPage < Math.ceil(dataLength / NUM_PER_PAGE) && Math.ceil(dataLength / NUM_PER_PAGE) !== 0) && (
                      <View className="flex h-full justify-center mr-[-4px]">
                        <Icon
                          name="chevron-forward"
                          size={16}
                          color={colors.zinc200}
                          onPress={() => 
                            filterIngredientData(ingredientsSnapshot, "", recipeIds, spotlightIds,
                              (Number(dataPage) + 1).toString() // dataPage
                            )
                          }
                        />
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>


            {/* Included in recipe/spotlight filtering */}
            <TouchableOpacity
              className={`mt-2 h-[90px] absolute right-0 justify-center items-center z-50 ${(filteredData.length === 0) && "bg-zinc900 border-l-2"}`}
              onPress={() => setIncludedFiltering(includedFiltering === "remove" ? "link" : includedFiltering === "link" ? "unlink" : includedFiltering === "unlink" && "remove")}
            >
              <View className="rotate-90">
                <Icon
                  name={includedFiltering}
                  size={includedFiltering === "remove" ? 25 : 20}
                  color={filteredData.length === 0 ? colors.mauve200 : colors.theme800}
                />
              </View>
            </TouchableOpacity>

            {/* Fixed Edit/Delete Column */}
            <View className="flex pt-[120px] pb-4">
              <ScrollView
                className="right-[-1px] mb-[25px]"
                vertical
                ref={modScrollRef}
                scrollEnabled={false}
              >
                {filteredData?.map((ingredient, index) => (

                  <View 
                    key={index} 
                    className={`w-[25px] h-[${ITEM_HEIGHT}px] flex justify-center items-center`}
                  >
                    {/* Delete Button */}
                    <Icon
                      size={(new Set([...recipeIds, ...spotlightIds])).has(ingredient.id) ? 25 : 20}
                      color={(new Set([...recipeIds, ...spotlightIds])).has(ingredient.id) ? colors.mauve600 : "black"}
                      name={(new Set([...recipeIds, ...spotlightIds])).has(ingredient.id) ? "close-circle-outline" : "close"}
                      onPress={() => openDeleteModal(ingredient.id)}
                      className="mt-6"
                    />

                    {/* Edit Button */}
                    <Icon
                      size={20}
                      color="black"
                      name="ellipsis-horizontal-outline"
                      onPress={() => openEditModal(ingredient.id)}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>

        {/* Modal that appears to modify types / brands / units */}
        {detailsModalVisible && (
          <ModDetailsModal 
            modalVisible={detailsModalVisible} 
            setModalVisible={setDetailsModalVisible}
            closeModal={closeDetailsModal} 
            initialQuery={searchQuery}
            ingredientsSnapshot={ingredientsSnapshot}
            recipeSnapshot={recipeSnapshot}
            spotlightSnapshot={spotlightSnapshot}
            // type modal
            initialType={selectedType}
            initialTypeList={typeList}
            // brand modal
            initialBrandLists={brandLists}
          />
        )}

        {/* Modal that appears to add/edit an ingredient */}
        {modModalVisible && (
          <ModIngredientModal 
            modalVisible={modModalVisible} 
            closeModal={closeModModal} 
            cancelModal={cancelModModal}
            addingType={addingType}
            editingId={editingId}
            initialStore={selectedStore}
            initialTypeList={typeList}
            initialBrandLists={brandLists}
            snapshot={ingredientsSnapshot}
          />
        )}

        {/* Modal that appears to delete an ingredient */}
        {deleteModalVisible && (
          <DeleteIngredientModal
            id={deletingId}
            recipeSnapshot={recipeSnapshot}
            spotlightSnapshot={spotlightSnapshot}
            visible={deleteModalVisible}
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
          />
        )}
      </View>
      
      
      
      {/* KEYBOARD POPUP SECTION */}
      {(isKeyboardOpen && keyboardType === "page") && (
        <>
          <View className="w-full h-[250px] mt-2 bg-zinc400"></View>
        </>
      )}
    </View>
  );
}