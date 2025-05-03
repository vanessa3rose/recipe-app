///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useRef, useState, useEffect } from 'react';
import { useNavigationState } from '@react-navigation/native';

import { View, Text, ScrollView, TextInput, Linking, } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Picker } from '@react-native-picker/picker';

import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

import ModTypeModal from '../../components/Food-Data/ModTypeModal';
import ModIngredientModal from '../../components/Food-Data/ModIngredientModal';

import { storeIngredientFetch } from '../../firebase/Ingredients/storeIngredientFetch';
import DeleteIngredientModal from '../../components/Food-Data/DeleteIngredientModal';

// Initialize Firebase App
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

  const [ingredientSnapshot, setIngredientSnapshot] = useState(null);
  const [recipeSnapshot, setRecipeSnapshot] = useState(null);
  const [spotlightSnapshot, setSpotlightSnapshot] = useState(null);

  // gets the collection of ingredients
  const getIngredientSnapshot = async () => {
    
    // loads types and brands, which filters and gets snapshot
    const fields = ['ingredientType', 'aBrand', 'mbBrand', 'smBrand', 'ssBrand', 'tBrand', 'wBrand'];
    const setters = [setTypeList, aSetBrandList, mbSetBrandList, smSetBrandList, ssSetBrandList, tSetBrandList, wSetBrandList];
    loadUniqueLists(fields, setters);
  }

  // gets the collection of recipes
  const getRecipeSnapshot = async () => {
    const querySnapshot = await getDocs(collection(db, 'recipes'));
    setRecipeSnapshot(querySnapshot);
  }

  // gets the collection of recipes
  const getSpotlightSnapshot = async () => {
    const querySnapshot = await getDocs(collection(db, 'spotlights'));
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
  const [selectedStore, setSelectedStore] = useState("a"); 

  // for type dropdown
  const [selectedType, setSelectedType] = useState(""); 
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);   // the ingredient search textinput at the top
  
  // for empty filtering
  const [isEmptyFiltering, setEmptyFiltering] = useState(false);   // if the filter button at the top is selected

  // helper function
  const getValue = (obj, key) => key.split('.').reduce((o, i) => (o ? o[i] : ''), obj);

  // Remove empty brands and maintain sorting
  const filterIngredientData = async (snapshot, queryToUse, emptyToUse, keyToUse, orderToUse) => {
    
    let dataToUse = await storeIngredientFetch(selectedStore, selectedType, snapshot);
    
    // refilters based on ingredient
    if (queryToUse !== "") {
      dataToUse = dataToUse.filter(row => {
        const queryWords = queryToUse
          .toLowerCase()
          .split(' ')
          .filter(word => word.trim() !== '');  // splits into words and remove empty strings
      
        // checks if every word in the query matches part of the ingredientName
        return queryWords.every(word => row.ingredientName.text.toLowerCase().includes(word));
      });
    }

    // filters out empty brands
    if (emptyToUse) {
      dataToUse = dataToUse.filter(row => row.brand !== "");
    }

    // applies sorting after filtering
    if (keyToUse && orderToUse) {
      dataToUse = [...dataToUse].sort((a, b) => {
        const valA = (getValue(a, keyToUse) || '').toString().toLowerCase();
        const valB = (getValue(b, keyToUse) || '').toString().toLowerCase();
  
        // A->Z or Z->A
        if (orderToUse === 'caret-down-outline') {
          return valA > valB ? 1 : valA < valB ? -1 : 0;
        } else if (orderToUse === 'caret-up-outline') {
          return valA < valB ? 1 : valA > valB ? -1 : 0;
        }
        return 0;
      });
    }
    
    // sets the filtered data in the state
    setFilteredData(dataToUse);
  }
  
  // synchronize filtering and sorting whenever filters change
  useEffect(() => {
    if (ingredientSnapshot) {
      filterIngredientData(ingredientSnapshot, searchQuery, isEmptyFiltering, currKey, currOrder);
    }
  }, [isEmptyFiltering, searchQuery, selectedStore, selectedType, currKey, currOrder]);


  ///////////////////////////////// ADD/EDIT AN INGREDIENT /////////////////////////////////

  const [modModalVisible, setModModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // when submitting the modal
  const closeModModal = (types, aBrands, mbBrands, smBrands, ssBrands, tBrands, wBrands) => { 

    setTypeList(types);
    aSetBrandList(aBrands);
    mbSetBrandList(mbBrands);
    smSetBrandList(smBrands);
    ssSetBrandList(ssBrands);
    tSetBrandList(tBrands);
    wSetBrandList(wBrands);

    // reloads types and brands
    const fields = ['ingredientType', 'aBrand', 'mbBrand', 'smBrand', 'ssBrand', 'tBrand', 'wBrand'];
    const setters = [setTypeList, aSetBrandList, mbSetBrandList, smSetBrandList, ssSetBrandList, tSetBrandList, wSetBrandList];
    loadUniqueLists(fields, setters);

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
    if (!typeList.some(item => item.label === selectedType || item.value === selectedType)) {
      setSelectedType(""); 
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
      const fields = ['ingredientType', 'aBrand', 'mbBrand', 'smBrand', 'ssBrand', 'tBrand', 'wBrand'];
      const setters = [setTypeList, aSetBrandList, mbSetBrandList, smSetBrandList, ssSetBrandList, tSetBrandList, wSetBrandList];
      loadUniqueLists(fields, setters);

      // resets the selected type if it's not in the typeList
      if (!typeList.some(item => item.label === selectedType || item.value === selectedType)) {
        setSelectedType(""); 
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
  const [aBrandList, aSetBrandList] = useState([]);
  const [mbBrandList, mbSetBrandList] = useState([]);
  const [smBrandList, smSetBrandList] = useState([]);
  const [ssBrandList, ssSetBrandList] = useState([]);
  const [tBrandList, tSetBrandList] = useState([]);
  const [wBrandList, wSetBrandList] = useState([]);

  // loads the unique ingredient or brand types
  const loadUniqueLists = async (fields, setters) => {
    const valuesMap = new Map();
    
    // initialized each field in the Map to store unique values
    fields.forEach(field => valuesMap.set(field, new Set()));

    // queries the db to populate the sets
    const querySnapshot = await getDocs(collection(db, 'ingredients'));
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      fields.forEach(field => {
        
        const fieldValue = data[field];
        if (fieldValue) {

          if (field === 'ingredientType' && Array.isArray(fieldValue)) {
            // flattens the array by adding each individual type
            fieldValue.forEach(type => { if (type !== "") { valuesMap.get(field).add(type)} });
          } else {
            valuesMap.get(field).add(fieldValue);
          }
        }
      });
    });

    // sets and refilters data
    setIngredientSnapshot(querySnapshot);
    filterIngredientData(querySnapshot, searchQuery, isEmptyFiltering, currKey, currOrder);

    // Process each field and update its respective state
    fields.forEach((field, index) => {
      const valuesSet = valuesMap.get(field);

      // converts Set to array and ensure 'CUSTOM' is always included
      const filteredValues = [...valuesSet].filter(value => value !== 'CUSTOM');
      const sortedValues = [
        { label: 'CUSTOM', value: 'CUSTOM', labelStyle: { color: "white" } },
        ...filteredValues.map(value => ({ label: value, value: value })).sort((a, b) => a.value.localeCompare(b.value)),
      ];
      
      // Update the state using the corresponding setter
      setters[index](sortedValues);
    });
  };


  ///////////////////////////////// SCROLLING /////////////////////////////////
  
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


///////////////////////////////// TYPES SEARCH /////////////////////////////////

const [typeModalVisible, setTypeModalVisible] = useState(false);

// to submit the ingredient type modal
const closeTypeModal = () => {
  setTypeModalVisible(false);

  // reloads types and brands
  const fields = ['ingredientType', 'aBrand', 'mbBrand', 'smBrand', 'ssBrand', 'tBrand', 'wBrand'];
  const setters = [setTypeList, aSetBrandList, mbSetBrandList, smSetBrandList, ssSetBrandList, tSetBrandList, wSetBrandList];
  loadUniqueLists(fields, setters);

  // resets the selected type if it's not in the typeList
  if (!typeList.some(item => item.label === selectedType || item.value === selectedType)) {
    setSelectedType(""); 
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
              {ingredientSnapshot?.docs?.length > 0 &&
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
                color={'black'}
                name="close-outline"
                onPress={() => setSearchQuery("")}
              />
            </View>
          </View>

          {/* Add Button */}
          <View className="flex w-1/12 justify-center items-end">
            <Icon 
              size={24}
              color={'black'}
              name="add-circle"
              onPress={() => setModModalVisible(true)}
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
            onPress={() => changeSortCol(ingredientSort, setIngredientSort, 'ingredientName.text')}
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
              <Picker.Item label="ALDI" value="a" />
              <Picker.Item label="MARKET BASKET" value="mb" />
              <Picker.Item label="STAR MARKET" value="sm" />
              <Picker.Item label="STOP & SHOP" value="ss" />
              <Picker.Item label="TARGET" value="t" />
              <Picker.Item label="WALMART" value="w" />
            </Picker>
          </View>

          {/* Type Dropdown */}
          <View className="absolute mt-[50px] w-[125px] h-[50px] bg-zinc800 border-r-2 border-b-2 border-black z-10">
            <DropDownPicker
              open={typeDropdownOpen}
              setOpen={setTypeDropdownOpen}
              value={selectedType}
              setValue={setSelectedType}
              items={typeList.length > 1 
                ? typeList.map(item => ({
                  label: item.value === 'CUSTOM' ? "no type" : item.label,
                  value: item.value === 'CUSTOM' ? "" : item.label,
                  labelStyle: item.value === 'CUSTOM' ? { color: colors.theme500 } : { color: 'black' },
                }))
                : [{ label: 'no types available', value: 'none', labelStyle: { color: 'black' }, disabled: true }]
              }
              listItemContainerStyle={{ borderBottomWidth: 1, borderBottomColor: colors.zinc200, }}
              placeholder="no type"
              placeholderStyle={{ fontWeight: 'bold' }}
              style={{ height: 50, backgroundColor: colors.zinc800, borderWidth: 0, borderBottomWidth: 2, justifyContent: 'center', }}
              dropDownContainerStyle={{ backgroundColor: 'white', }}
              textStyle={{ color: colors.theme100, fontWeight: 'bold', textAlign: 'center', fontSize: 12, }}
              listItemLabelStyle={{ textAlign: 'left', paddingLeft: 5, fontSize: 12, color: colors.zinc800, }}
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
            <View className="p-2 border-r-2 bg-theme900 w-[270px] h-[50px] border-b-[1px] border-b-zinc800 flex justify-center items-center">
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
            <View className="p-2 border-r-0.5 w-[90px] h-[50px] flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]">SERVING SIZE</Text>
            </View>
            <View className="p-2 border-r-0.5 w-[90px] h-[50px] flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]">PER CONTAINER</Text>
            </View>
            <View className="p-2 border-r-2 w-[90px] h-[50px] flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]">TOTAL YIELD</Text>
            </View>
            <View className="p-2 border-r-0.5 w-[90px] h-[50px] flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]">PER SERVING</Text>
            </View>
            <View className="p-1 border-r-2 w-[90px] h-[50px] flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]">PER CONTAINER</Text>
            </View>
            <View className="p-2 border-r-0.5 w-[90px] h-[50px] flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]">PER SERVING</Text>
            </View>
            <View className="p-2 w-[90px] h-[50px] flex justify-center items-center">
              <Text className="text-center font-bold text-white text-[12px]">PER CONTAINER</Text>
            </View>
          </ScrollView>

          {/* Scrollable Content */}
          <ScrollView
            className="mt-[100px]"
            ref={verticalScrollRef}
            vertical
            onScroll={syncVerticalScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{ flexDirection: 'row' }}
          >

            {/* Fixed First Column */}
            <View className="w-[125px] h-[65px]">
              {filteredData?.map((row, rowIndex) => (
                <View 
                  key={rowIndex} 
                  className={`border-b-0.5 border-b-theme600 border-r-2 border-r-theme600 ${rowIndex % 2 !== 0 ? 'bg-theme400' : 'bg-theme300'} w-[125px] h-[65px] flex justify-center items-center`}
                >
                  <Text
                    className={`text-center font-bold text-white text-[12px] px-2 ${row.ingredientName.link && "underline"}`}
                    onPress={ row.ingredientName.link ? () => Linking.openURL(row.ingredientName.link) : undefined }
                  >
                    {row.ingredientName.text}
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
              contentContainerStyle={{ flexDirection: 'column', width: 718 }}
            >
              <View>
              {filteredData?.map((row, rowIndex) => (

                <View key={rowIndex} className={`flex-row ${rowIndex % 2 !== 0 ? 'bg-gray-200' : 'bg-white'}`}>

                  {/* Brand */}
                  <View className="w-[90px] h-[65px] flex justify-center items-center p-2 border-r-2 border-zinc500">
                    <Text className="text-[12px] text-center">{row.brand}</Text>
                  </View>

                  {/* Serving size + unit */}
                  <View className="w-[90px] h-[65px] flex justify-center items-center p-2 border-r-0.5 border-zinc500">
                    <Text className="text-[12px] text-center">{row.servingSize}</Text>
                  </View>

                  {/* Serving container */}
                  <View className="w-[90px] h-[65px] flex justify-center items-center p-2 border-r-0.5 border-zinc500">
                    <Text className="text-[12px] text-center">{row.servingContainer}</Text>
                  </View>

                  {/* Total yield */}
                  <View className="w-[90px] h-[65px] flex justify-center items-center p-2 border-r-2 border-zinc500">
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
        </View>

        {/* Fixed Edit/Delete Column */}
        <View className="flex pt-[120px] pb-4">
          <ScrollView
            className="right-[-1px]"
            vertical
            ref={modScrollRef}
            scrollEnabled={false}
          >
            {filteredData?.map((row, rowIndex) => (
              <View 
                key={rowIndex} 
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
          ingredientSnapshot={ingredientSnapshot}
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
          editingId={editingId}
          initialStore={selectedStore}
          initialTypeList={typeList}
          aInitialBrandList={aBrandList}
          mbInitialBrandList={mbBrandList}
          smInitialBrandList={smBrandList}
          ssInitialBrandList={ssBrandList}
          tInitialBrandList={tBrandList}
          wInitialBrandList={wBrandList}
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