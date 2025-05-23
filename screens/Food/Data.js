///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useRef, useState, useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';

// UI components
import { View, Text, ScrollView, TextInput, Linking, TouchableOpacity } from 'react-native';
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
import ModTypeModal from '../../components/Food-Data/ModTypeModal';
import ModIngredientModal from '../../components/Food-Data/ModIngredientModal';
import DeleteIngredientModal from '../../components/Food-Data/DeleteIngredientModal';

// initialize firebase app
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

export default function Data ({ isSelectedTab }) {
  

  ///////////////////////////////// NAVIGATION LOGIC /////////////////////////////////

  // when the tab is switched to recipes
  useEffect(() => {

    if (isSelectedTab) {   
      getIngredientSnapshot();
      getRecipeSnapshot();
      getSpotlightSnapshot();
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
  const [spotlightSnapshot, setSpotlightSnapshot] = useState(null);

  // gets the collection of ingredients
  const getIngredientSnapshot = async () => {
    
    // loads types and brands, which filters and gets snapshot
    loadUniqueLists(null);
  }

  // gets the collection of recipes
  const getRecipeSnapshot = async () => {
    const querySnapshot = await getDocs(collection(db, 'RECIPES'));
    setRecipeSnapshot(querySnapshot);
  }

  // gets the collection of recipes
  const getSpotlightSnapshot = async () => {
    const querySnapshot = await getDocs(collection(db, 'SPOTLIGHTS'));
    setSpotlightSnapshot(querySnapshot);
  }


  ///////////////////////////////// SORTING INGREDIENTS /////////////////////////////////

  // general
  const [currKey, setCurrKey] = useState("");
  const [currOrder, setCurrOrder] = useState('remove-outline');

  // specific
  const [ingredientSort, setIngredientSort] = useState('remove-outline');
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
  
  // for empty filtering
  const [isEmptyFiltering, setEmptyFiltering] = useState(false);   // if the filter button at the top is selected

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
        let unit = ingredient.ingredientData[storeKey]?.unit || '';
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
          servingSize: `${size} ${unit}`,
          servingContainer: container,
          totalYield: (size === "" || container === "") ? "" : `${(new Fractional(size)).multiply(new Fractional(container)).toString()} ${unit}`, 
          calServing: cal,
          calContainer: (cal === "" || container === "") ? "" : `${((new Fraction((new Fractional(cal)).multiply(new Fractional(container)).toString())) * 1).toFixed(0)}`,
          priceServing: (price === "" || container === "") ? "" : `$${((new Fraction((new Fractional(price)).divide(new Fractional(container)).toString())) * 1).toFixed(2)}`,
          priceContainer: `${price === "" ? "" : `$${parseFloat(price).toFixed(2)}`}`
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
  const filterIngredientData = async (snapshot, currIngredient, prevPage) => {
    
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
      dataToUse = dataToUse.filter(row => {
        const queryWords = searchQuery
          .toLowerCase()
          .split(' ')
          .filter(word => word.trim() !== '');  // splits into words and remove empty strings
      
        // checks if every word in the query matches part of the ingredientName
        return queryWords.every(word => row.ingredientName.toLowerCase().includes(word));
      });
    }

    // filters out empty brands
    if (isEmptyFiltering) {
      dataToUse = dataToUse.filter(row => row.brand !== "");
    }

    // applies sorting after filtering
    if (currKey && currOrder) {
      dataToUse = [...dataToUse].sort((a, b) => {
        const valA = (getValue(a, currKey) || '').toString().toLowerCase();
        const valB = (getValue(b, currKey) || '').toString().toLowerCase();
  
        // A->Z or Z->A
        if (currOrder === 'caret-down-outline') {
          return valA > valB ? 1 : valA < valB ? -1 : 0;
        } else if (currOrder === 'caret-up-outline') {
          return valA < valB ? 1 : valA > valB ? -1 : 0;
        }
        return 0;
      });
    }

    let newPage = 1;
    
    // recalculates the current page based on the index of the current ingredient
    if (currIngredient) {
      const idx = dataToUse.map(ingredient => ingredient.ingredientName).indexOf(currIngredient.ingredientName);
      newPage = (Math.floor(idx / NUM_PER_PAGE) + 1).toString();

      // scrolls to the correct y value
      const scrollY = (idx % NUM_PER_PAGE) * ITEM_HEIGHT;
      if (verticalScrollRef.current) { verticalScrollRef.current.scrollTo({ y: scrollY, animated: false }); }
      if (modScrollRef.current) {  modScrollRef.current.scrollTo({ y: scrollY, animated: false }); }

      // stores the current name to highlight
      setCurrIngredientName(currIngredient.ingredientName);

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
    dataToUse = dataToUse.filter((data, index) => 
      index >= (Number(newPage) - 1) * NUM_PER_PAGE && index < Number(newPage) * NUM_PER_PAGE
    );
    
    // sets the filtered data in the state
    setFilteredData(dataToUse);
  }
  
  // synchronize filtering and sorting whenever filters change
  useEffect(() => {
    if (ingredientsSnapshot) {
      filterIngredientData(ingredientsSnapshot, null, dataPage);
    }
  }, [isEmptyFiltering, searchQuery, selectedStore, selectedType, currKey, currOrder]);


  ///////////////////////////////// ADD/EDIT AN INGREDIENT /////////////////////////////////

  const [currIngredientName, setCurrIngredientName] = useState("");
  const [modModalVisible, setModModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [addingType, setAddingType] = useState(null);
  
  // when submitting the modal
  const closeModModal = (types, brands, modedData) => { 
    setTypeList(types);
    setBrandLists(brands);

    // reloads types and brands
    loadUniqueLists(modedData);

    // resets
    setEditingId(null);
    setModModalVisible(false);
      
    // fetches the new snapshots
    getRecipeSnapshot();
    getSpotlightSnapshot();
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

      // reloads types and brands
      loadUniqueLists(null);

      // resets the selected type if it's not in the typeList
      if (selectedType !== "-" && !typeList.some(item => item.label === selectedType || item.value === selectedType)) {
        setSelectedType("-"); 
      }

    // fetches the new snapshots
      getRecipeSnapshot();
      getSpotlightSnapshot();
    }
  };

  // when canceling the deletion of an ingredient
  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setDeletingId(null);
  };


  ///////////////////////////////// TYPE AND BRAND DROPDOWNS /////////////////////////////////

  const [typeList, setTypeList] = useState([]);
  const [brandLists, setBrandLists] = useState({});

  // loads the unique ingredient or brand types
  const loadUniqueLists = async (currIngredient) => {
    
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
    filterIngredientData(querySnapshot, currIngredient, dataPage);

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
      const sortedBrands = [
        { label: 'CUSTOM', value: 'CUSTOM', labelStyle: { color: 'white' } },
        ...brandValues.map(val => ({ label: val, value: val })).sort((a, b) => a.value.localeCompare(b.value))
      ];
      brandListsObj[storeKey] = sortedBrands;
    });
  
    // Set all brand lists in one go
    setBrandLists(brandListsObj);
  };


  ///////////////////////////////// SCROLLING / PAGES /////////////////////////////////
  
  // horizontal scroll syncing
  const sortScrollRef = useRef(null);
  const horizontalScrollRef = useRef(null);
  const headerScrollRef = useRef(null);
  const secondRowScrollRef = useRef(null);

  const syncHorizontalScroll = (e) => {
    
    const offsetX = e.nativeEvent.contentOffset.x;
    if (sortScrollRef.current) {
      sortScrollRef.current.scrollTo({ x: offsetX, animated: false });
    }
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollTo({ x: offsetX, animated: false });
    }
    if (secondRowScrollRef.current) {
      secondRowScrollRef.current.scrollTo({ x: offsetX, animated: false });
    }
  };

  // vertical scroll syncing
  const verticalScrollRef = useRef(null);
  const modScrollRef = useRef(null);

  const syncVerticalScroll = (e) => {
    
    const offsetY = e.nativeEvent.contentOffset.y;
    if (verticalScrollRef.current) {
      verticalScrollRef.current.scrollTo({ y: offsetY, animated: false });
    }
    if (modScrollRef.current) {
      modScrollRef.current.scrollTo({ y: offsetY, animated: false });
    }
  };

  // for pages
  const [dataPage, setDataPage] = useState("1");
  const [dataLength, setDataLength] = useState(0);
  const NUM_PER_PAGE = 50;
  const ITEM_HEIGHT = 50;


///////////////////////////////// TYPES SEARCH /////////////////////////////////

const [typeModalVisible, setTypeModalVisible] = useState(false);

// to submit the ingredient type modal
const closeTypeModal = () => {
  
  setTypeModalVisible(false);

  // reloads types and brands
  loadUniqueLists(null);

  // resets the selected type if it's not in the typeList
  if (selectedType !== "-" && !typeList.some(item => item.label === selectedType || item.value === selectedType)) {
    setSelectedType("-"); 
  }

  // fetches the new snapshots
  getRecipeSnapshot();
  getSpotlightSnapshot();
}


///////////////////////////////// HTML /////////////////////////////////

  return (
    <View className={`flex-1 bg-zinc300 border-0.5 py-4 pl-4 ${filteredData?.length === 0 ? 'pr-4' : 'pr-2'} overflow-x-auto`}>

      <View className="flex-row justify-center items-center px-2 w-full">
        {/* BLANK FILTERING */}
        <View className="w-1/12 justify-center items-center">
          <Icon
            name={isEmptyFiltering ? "filter-circle" : "filter-circle-outline"}
            color={isEmptyFiltering ? colors.theme600 : 'black'}
            size={24}
            onPress={() => setEmptyFiltering(!isEmptyFiltering)}
          />
        </View>

        {/* INGREDIENT FILTERING */}
        <View className="flex flex-row py-2 pr-2 items-center justify-center">

          {/* Filter Input */}
          <View className="flex h-[40px] justify-center w-11/12">
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={`search for ingredient`}
              placeholderTextColor={colors.zinc400}
              className="flex-1 bg-white rounded-[5px] border-[1px] border-zinc350 p-2.5 text-[16px] leading-[18px] ml-2.5"
            />

            <View className="absolute right-1 flex flex-row">

              {/* Type Search Button */}
              {ingredientsSnapshot?.docs?.length > 0 &&
              <Icon 
                size={24}
                color={colors.theme400}
                name="list-circle"
                onPress={() => setTypeModalVisible(true)}
              />
              }

              {/* Clear Button */}
              <Icon 
                size={24}
                color="black"
                name="close-outline"
                onPress={() => setSearchQuery("")}
              />
            </View>
          </View>

          {/* Add Button */}
          <View className="flex w-1/12 justify-center items-end">
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
      </View>

      {/* SORTING */}
      <View className="relative w-full pt-2">

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
          <View className="w-[90px] flex items-center">
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
          <View className="w-[90px] flex items-center">
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


      <View className="flex-1 flex-row h-5/6">

        {/* MAIN CONTAINER */}
        <View className="flex-1 mt-2 mb-1 border-2 border-black bg-zinc600 py-2 w-full">

          {/* Store Dropdown */}
          <View className="absolute w-[125px] h-[50px] bg-zinc-800 border-r-2 border-b-2 border-zinc900 z-20">
            <Picker
              selectedValue={selectedStore}
              onValueChange={(itemValue) => setSelectedStore(itemValue)}
              style={{ height: 50, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -20, }}
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
          <View className="absolute mt-[50px] w-[125px] h-[50px] bg-zinc800 border-r-2 border-b-2 border-black">
            
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
                        ? { color: colors.zinc450, padding: 12.5, paddingLeft: 15, marginHorizontal: -10, backgroundColor: colors.zinc100 } 
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
            {typeDropdownOpen &&
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
                {selectedType === "-" &&
                  <View className="absolute right-2">
                    <Icon 
                      name="checkmark" 
                      size={18} 
                      color="black" 
                    />
                  </View>
                }
              </TouchableOpacity>
            }
          </View>

          {/* Frozen First Header Row */}
          <ScrollView
            ref={headerScrollRef}
            horizontal
            className="absolute ml-[125px] z-20"
            scrollEnabled={false}
          >
            <View className="p-2 border-r-2 bg-theme900 w-[90px] h-[100px] border-b-2 border-black flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]">BRAND</Text>
            </View>
            <View className="p-2 border-r-2 bg-theme900 w-[290px] h-[50px] border-b-[1px] border-b-zinc800 flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]">SERVINGS</Text>
            </View>
            <View className="p-2 border-r-2 bg-theme900 w-[180px] h-[50px] border-b-[1px] border-b-zinc800 flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]">CALORIES</Text>
            </View>
            <View className="p-2 bg-theme900 w-[180px] h-[50px] border-b-[1px] border-b-zinc800 flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]">PRICE</Text>
            </View>
          </ScrollView>

          {/* Frozen Second Header Row */}
          <ScrollView
            ref={secondRowScrollRef}
            horizontal
            className="absolute mt-[48px] ml-[125px] bg-theme800 border-b-2 border-black z-10"
            scrollEnabled={false}
          >
            <View className="p-2 border-r-2 w-[90px] h-[50px] flex justify-center items-center"/>
            <View className="p-2 border-r-0.5 w-[100px] h-[50px] flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]"> {"SERVING\nSIZE"} </Text>
            </View>
            <View className="p-2 border-r-0.5 w-[90px] h-[50px] flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]"> {"PER\nCONTAINER"} </Text>
            </View>
            <View className="p-2 border-r-2 w-[100px] h-[50px] flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]"> {"TOTAL\nYIELD"} </Text>
            </View>
            <View className="p-2 border-r-0.5 w-[90px] h-[50px] flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]"> {"PER\nSERVING"} </Text>
            </View>
            <View className="p-1 border-r-2 w-[90px] h-[50px] flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]"> {"PER\nCONTAINER"} </Text>
            </View>
            <View className="p-2 border-r-0.5 w-[90px] h-[50px] flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]"> {"PER\nSERVING"} </Text>
            </View>
            <View className="p-2 w-[90px] h-[50px] flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]"> {"PER\nCONTAINER"} </Text>
            </View>
          </ScrollView>

          {/* Scrollable Content */}
          <ScrollView
            className="mt-[100px] mb-[25px]"
            ref={verticalScrollRef}
            vertical
            onScroll={syncVerticalScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ flexDirection: 'row' }}
          >

            {/* Fixed First Column */}
            <View className="w-[125px] h-[65px]">
              {filteredData?.map((row, index) => (
                <View 
                  key={index} 
                  className={`border-b-0.5 border-b-theme600 border-r-2 ${currIngredientName === row.ingredientName ? "border-r-zinc500" : "border-r-theme600"} ${index % 2 !== 0 ? (currIngredientName === row.ingredientName ? 'bg-zinc450' : 'bg-theme400') : (currIngredientName === row.ingredientName ? 'bg-zinc350' : 'bg-theme300')} w-[125px] h-[65px] flex justify-center items-center`}
                >
                  <Text
                    className={`text-center font-bold text-white text-[12px] px-2 ${row.link && "underline"}`}
                    onPress={ row.link ? () => Linking.openURL(row.link) : undefined }
                  >
                    {row.ingredientName}
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
              contentContainerStyle={{ flexDirection: 'column', width: 738 }}
            >
              <View>
              {filteredData?.map((row, index) => (

                <View key={index} className={`flex-row ${index % 2 !== 0 ? 'bg-gray200' : 'bg-white'}`}>

                  {/* Brand */}
                  <View className="w-[90px] h-[65px] flex justify-center items-center p-2 border-r-2 border-zinc500">
                    <Text className="text-[12px] text-center">{row.brand}</Text>
                  </View>

                  {/* Serving size + unit */}
                  <View className="w-[100px] h-[65px] flex justify-center items-center p-2 border-r-0.5 border-zinc500">
                    <Text className="text-[12px] text-center">{row.servingSize}</Text>
                  </View>

                  {/* Serving container */}
                  <View className="w-[90px] h-[65px] flex justify-center items-center p-2 border-r-0.5 border-zinc500">
                    <Text className="text-[12px] text-center">{row.servingContainer}</Text>
                  </View>

                  {/* Total yield */}
                  <View className="w-[100px] h-[65px] flex justify-center items-center p-2 border-r-2 border-zinc500">
                    <Text className="text-[12px] text-center">{row.totalYield}</Text>
                  </View>

                  {/* Calories per serving */}
                  <View className="w-[90px] h-[65px] flex justify-center items-center p-2 border-r-0.5 border-zinc500">
                    <Text className="text-[12px] text-center">{row.calServing}</Text>
                  </View>

                  {/* Calories per container */}
                  <View className="w-[90px] h-[65px] flex justify-center items-center p-2 border-r-2 border-zinc500">
                    <Text className="text-[12px] text-center">{row.calContainer}</Text>
                  </View>

                  {/* Price per serving */}
                  <View className="w-[90px] h-[65px] flex justify-center items-center p-2 border-r-0.5 border-zinc500">
                    <Text className="text-[12px] text-center">{row.priceServing}</Text>
                  </View>

                  {/* Price per container */}
                  <View className="w-[90px] h-[65px] flex justify-center items-center p-2">
                    <Text className="text-[12px] text-center">{row.priceContainer}</Text>
                  </View>
                </View>
              ))}
              </View>
            </ScrollView>
          
          </ScrollView>


          {/* PAGES */}
          {dataLength > 0 &&
          <View className="flex flex-row absolute bottom-1.5 justify-between px-2 w-full">
              
            {/* Number of Ingredients */}
            <View className="flex flex-row justify-center items-center h-full">
              <Text className="text-center text-[13px] leading italic font-medium text-zinc300">
                {dataLength}
              </Text>
            </View>

            {/* Page Selection */}
            <View className="flex flex-row space-x-1">
              {/* Page Back */}
              {Number(dataPage) > 1 && Number(dataPage) <= (Math.ceil(dataLength / NUM_PER_PAGE)) &&
                <View className="flex h-full justify-center">
                  <Icon
                    name="chevron-back"
                    size={16}
                    color={colors.zinc200}
                    onPress={ !isNaN(Number(dataPage)) ? () => 
                      filterIngredientData(ingredientsSnapshot, null,
                        (Number(dataPage) - 1).toString() // dataPage
                      ) : undefined
                    }
                  />
                </View>
              }
              
              {/* Page Number */}
              <View className="flex flex-row justify-center items-center h-full">
                <TextInput
                  className="text-center text-[13px] italic font-medium text-zinc200"
                  placeholderTextColor={colors.zinc400}
                  value={dataPage}
                  onChangeText={(value) => 
                    filterIngredientData(ingredientsSnapshot, null,
                      // dataPage
                      value === "" ||
                      Number(value) >= 1 && Number(value) <= Math.ceil(dataLength / NUM_PER_PAGE) 
                      ? value : dataPage
                    )
                  }
                  onBlur={() => 
                    filterIngredientData(ingredientsSnapshot, null,
                      (dataPage === "" ? "1" : dataPage) // dataPage
                    )
                  }
                />
                <Text className="text-center text-[13px] leading italic font-medium text-zinc200">
                  {` / ${Math.ceil(dataLength / NUM_PER_PAGE) === 0 ? "1" : Math.ceil(dataLength / NUM_PER_PAGE)}`}
                </Text>
              </View>
              
              {/* Page Forward */}
              {(dataPage < Math.ceil(dataLength / NUM_PER_PAGE) && Math.ceil(dataLength / NUM_PER_PAGE) !== 0) &&
                <View className="flex h-full justify-center mr-[-4px]">
                  <Icon
                    name="chevron-forward"
                    size={16}
                    color={colors.zinc200}
                    onPress={() => 
                      filterIngredientData(ingredientsSnapshot, null,
                        (Number(dataPage) + 1).toString() // dataPage
                      )
                    }
                  />
                </View>
              }
            </View>
          </View>
          }
        </View>

        {/* Fixed Edit/Delete Column */}
        <View className="flex pt-[120px] pb-4">
          <ScrollView
            className="right-[-1px] mb-[25px]"
            vertical
            ref={modScrollRef}
            scrollEnabled={false}
          >
            {filteredData?.map((row, index) => (

              <View 
                key={index} 
                className="w-[25px] h-[65px] flex justify-center items-center"
              >
                {/* Delete Button */}
                <Icon
                  size={20}
                  color="black"
                  name="close"
                  onPress={() => openDeleteModal(row.id)}
                  className="mt-6"
                />

                {/* Edit Button */}
                <Icon
                  size={20}
                  color="black"
                  name="ellipsis-horizontal-outline"
                  onPress={() => openEditModal(row.id)}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </View>


      {/* Modal that appears to modify types */}
      {typeModalVisible && (
        <ModTypeModal 
          modalVisible={typeModalVisible} 
          setModalVisible={setTypeModalVisible}
          closeModal={closeTypeModal} 
          initialTypeList={typeList}
          initialQuery={searchQuery}
          ingredientsSnapshot={ingredientsSnapshot}
          recipeSnapshot={recipeSnapshot}
          spotlightSnapshot={spotlightSnapshot}
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
  );
}