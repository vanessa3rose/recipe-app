///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect, useRef } from 'react';

// UI components
import { Modal, View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// store lists
import storeKeys from '../../assets/storeKeys';
import storeLabels from '../../assets/storeLabels';

// validation
import capitalizeInput from '../Validation/capitalizeInput';
import validateFractionInput from '../Validation/validateFractionInput';
import validateDecimalInput from '../Validation/validateDecimalInput';
import validateWholeNumberInput from '../Validation/validateWholeNumberInput';

// firebase
import ingredientAdd from '../../firebase/Ingredients/ingredientAdd';
import ingredientEdit from '../../firebase/Ingredients/ingredientEdit';

// initialize firebase app
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const ModIngredientModal = ({ 
  modalVisible, closeModal, cancelModal, 
  addingType, editingId, initialStore, 
  initialTypeList, initialBrandLists,
}) => {

  ///////////////////////////////// VARIABLES /////////////////////////////////

  // Ingredient Name
  const [ingredientName, setIngredientName] = useState('');

  // Data - set up like {storeKeys[0]: "", storeKeys[1]: "", ...}
  const [link, setLink] = useState(Object.fromEntries(storeKeys.map(storeKey => [storeKey, ""])));
  const [servingSize, setServingSize] = useState(Object.fromEntries(storeKeys.map(storeKey => [storeKey, ""])));
  const [unit, setUnit] = useState(Object.fromEntries(storeKeys.map(storeKey => [storeKey, ""])));
  const [servingContainer, setServingContainer] = useState(Object.fromEntries(storeKeys.map(storeKey => [storeKey, ""])));
  const [calServing, setCalServing] = useState(Object.fromEntries(storeKeys.map(storeKey => [storeKey, ""])));
  const [priceContainer, setPriceContainer] = useState(Object.fromEntries(storeKeys.map(storeKey => [storeKey, ""])));


  // Store Selection
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeList, setStoreList] = useState(storeKeys);
  const [nameList, setNameList] = useState(storeLabels.map(label => label.toUpperCase()));

  // toggle store section visibility
  const toggleStoreSection = (store) => {
    
    // clears custom type
    if (selectedStore && brand[selectedStore] === 'CUSTOM') { setBrand(prev => ({ ...prev, [selectedStore]: "" })); }

    setSelectedStore(selectedStore === store ? null : store);
    
    // reorders the store list to put the selected one first
    let keys = [...storeKeys];
    let labels = [...storeLabels.map(label => label.toUpperCase())];
    
    // only does so if there is a dropdown open; if not, will reset instead
    if (selectedStore !== store) {

      // creates and reorderspairs of abbreviation and name
      let storePairs = keys.map((key, index) => ({ key, label: labels[index] }));
      storePairs = [storePairs.find(pair => pair.key === store), ...storePairs.filter(pair => pair.key !== store)];
    
      // extracts reordered arrays
      keys = storePairs.map(pair => pair.key);
      labels = storePairs.map(pair => pair.label);
    }

    setStoreList(keys);
    setNameList(labels);

    setCustomBrand("");
  };


  ///////////////////////////////// TYPE LIST /////////////////////////////////

  const [typeList, setTypeList] = useState([]);
  const [ingredientTypes, setIngredientTypes] = useState([]);

  // to reset scrolling
  const scrollRef = useRef(null);

  // updates the tag list
  const toggleType = (type, currTypeList) => {

    setIngredientTypes((prev) => {
      const updatedIngredientTypes = prev.includes(type)
        ? prev.filter(value => value !== type)  // removes type
        : [...prev, type];                      // adds type
        
      alphabetizeTypes(updatedIngredientTypes, currTypeList); // alphabetizes updated state
      return updatedIngredientTypes;
    });

    // resets tag scrolling
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // helper function to alphabetize the list of types based on selected ones
  const alphabetizeTypes = (updatedIngredientTypes, currTypeList) => {

    let updatedTypeList = currTypeList ? [...currTypeList] : initialTypeList;
    updatedTypeList.sort((a, b) => {
      const inA = updatedIngredientTypes.includes(a.label);
      const inB = updatedIngredientTypes.includes(b.label);
  
      // prioritizes items that are in `ingredientTypes`
      if (inA && !inB) return -1;
      if (!inA && inB) return 1;
  
      // ensures "CUSTOM" is always at the top
      if (a.label === "CUSTOM") return -1;
      if (b.label === "CUSTOM") return 1;
  
      // alphabetical sorting within each group
      return a.label.localeCompare(b.label);
    });
  
    // updates state
    setTypeList(updatedTypeList);
  };
  
  // for a custom type
  const [showCustomType, setShowCustomType] = useState(false);
  const [customType, setCustomType] = useState('');

  // to submit a new type
  const addCustomType = () => {
    
    if (customType !== "") {
      
      // capitalizes the first letter and make the rest lowercase if Type
      const formattedValue = capitalizeInput(customType);
      
      if (!typeList.some((type) => type.value === formattedValue.toLowerCase())) {
        const updatedTypeList = [
          ...typeList,
          { label: formattedValue, value: formattedValue },
        ];
        
        setTypeList(updatedTypeList);           // updates the items list with the new custom type
        setCustomType("");                      // clears the custom type input field

        // updates current ingredient's type list
        toggleType(formattedValue, updatedTypeList);

        // hides the custom section
        setShowCustomType(false);
      }
    }
  };


  ///////////////////////////////// BRAND LIST /////////////////////////////////

  const [brand, setBrand] = useState(Object.fromEntries(storeKeys.map(storeKey => [storeKey, ""])));
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(Object.fromEntries(storeKeys.map(storeKey => [storeKey, false])));
  const [brandLists, setBrandLists] = useState(Object.fromEntries(storeKeys.map(storeKey => [storeKey, []])));

  // for a custom brand
  const [customBrand, setCustomBrand] = useState("");

  // when adding a custom brand
  const addCustomBrand = () => {
    
    if (customBrand !== "") {
      if (!brandLists[selectedStore].some((brand) => brand.value.toLowerCase() === customBrand.toLowerCase())) {

        // new brand list
        const updatedBrandList = [
          ...brandLists[selectedStore],
          { label: customBrand, value: customBrand },
        ];

        // sort, keeping "CUSTOM" at the top
        updatedBrandList.sort((a, b) => {
          if (a.label === "CUSTOM") return -1;
          if (b.label === "CUSTOM") return 1;
          return a.label.localeCompare(b.label);
        });
        
        
        setBrandLists(prev => ({ ...prev, [selectedStore]: updatedBrandList }));    // updates the items list with the new custom type
        setBrand(prev => ({ ...prev, [selectedStore]: customBrand }));              // sets the value to the newly added custom type   
        setCustomBrand("");                                                         // clears the custom type input field
      }
    }
  };


  ///////////////////////////////// OPENING MODAL /////////////////////////////////

  // setting initial lists
  useEffect(() => {
    
    if (modalVisible) {
      
      // sets initial types
      setTypeList(initialTypeList);
  
      // dynamically sets initial brand lists
      storeKeys.forEach((storeKey) => setBrandLists(prev => ({ ...prev, [storeKey]: initialBrandLists[storeKey] })));
    }
  }, [modalVisible]);

  // if editing an ingredient 
  useEffect(() => {
    
    if (editingId) {
      const fetchIngredientData = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'INGREDIENTS', editingId));

          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // sets the ingredient data
            setIngredientName(data.ingredientName || '');
            setIngredientTypes(data.ingredientTypes || []);
            
            // sorts types
            setTimeout(() => alphabetizeTypes(data.ingredientTypes, initialTypeList), 1000);      // sorts types        

            // sets store lists
            storeKeys.forEach((storeKey) => {
              
              // sets lists
              setBrand(prev => ({ ...prev, [storeKey]: (data.ingredientData[storeKey]?.brand || '') }));
              setLink(prev => ({ ...prev, [storeKey]: data.ingredientData[storeKey]?.link || '' }));
              setServingSize(prev => ({ ...prev, [storeKey]: data.ingredientData[storeKey]?.servingSize || '' }));
              setUnit(prev => ({ ...prev, [storeKey]: data.ingredientData[storeKey]?.unit || '' }));
              setServingContainer(prev => ({ ...prev, [storeKey]: data.ingredientData[storeKey]?.servingContainer || '' }));
              setCalServing(prev => ({ ...prev, [storeKey]: data.ingredientData[storeKey]?.calServing || '' }));
              setPriceContainer(prev => ({ ...prev, [storeKey]: data.ingredientData[storeKey]?.priceContainer || '' }));
            });
          }

        } catch (error) {
          console.error('Error fetching ingredient data:', error);
        }
      };

      fetchIngredientData();

    // otherwise, just stores the initial type and sorts
    } else { 
      // if the current type is 'all types'
      if (addingType !== "-") {
        setIngredientTypes([addingType]); 
        setTimeout(() => alphabetizeTypes([addingType], initialTypeList), 1000);
      // if it is a type
      } else {
        setTimeout(() => alphabetizeTypes(initialTypeList), 1000);
      }
    }

  }, [editingId]);

  // when the initial store is populated
  useEffect(() => {
    toggleStoreSection(initialStore);
  }, [initialStore]);


  ///////////////////////////////// CLOSING MODAL /////////////////////////////////
  
  // if the submission is valid
  const [isNameValid, setNameValid] = useState(true);
  const [isStoreValid, setStoreValid] = useState(true);
  const [isBrandValid, setBrandValid] = useState(true);
  const [isCustomValid, setCustomValid] = useState(true);

  // to submit the modal
  const submitModal = () => {
    
    // if the name is empty
    if (ingredientName === "") { 
      setNameValid(false); 
      setStoreValid(true); 
      setBrandValid(true);
      setCustomValid(true);
    
    // if all stores are empty
    } else if (storeKeys.every(storeKey => brand[storeKey] === "")) {
      setNameValid(true);
      setStoreValid(false);
      setBrandValid(true);
      setCustomValid(true);

    // if a required brand is empty
    } else if (storeKeys.some(storeKey => 
      brand[storeKey] === "" && 
      (servingSize[storeKey] !== "" || unit[storeKey] !== "" || servingContainer[storeKey] !== "" || calServing[storeKey] !== "" || priceContainer[storeKey] !== "")
    )) {
      setNameValid(true);
      setStoreValid(true);
      setBrandValid(false);
      setCustomValid(true);
    
    // if a CUSTOM is remaining
    } else if (showCustomType || storeKeys.some(storeKey => brand[storeKey] === 'CUSTOM')) {
      setNameValid(true);
      setStoreValid(true);
      setBrandValid(true);
      setCustomValid(false);
    }

    // if the name, at least one store, and brand have been filled in 
    else {
      setNameValid(true);
      setStoreValid(true);
      setBrandValid(true);
      setCustomValid(true);

      // determines type list -- factors in empty
      const types = ingredientTypes.includes("") && ingredientTypes.length > 1 ? 
        ingredientTypes.filter((type) => type !== "") : 
        ingredientTypes.length === 0 ? [""] : ingredientTypes;

      // reformats store list
      const ingredientStores = ['-', ...storeKeys];
          
      // collect the ingredient's data
      const ingredientData = {};
      for (let i = 0; i < ingredientStores.length; i++) {
        ingredientData[ingredientStores[i]] = {
          brand: brand[ingredientStores[i]] || "",
          calServing: calServing?.[ingredientStores[i]] || "",
          link: link?.[ingredientStores[i]] || "",
          priceContainer: priceContainer?.[ingredientStores[i]] || "",
          servingContainer: servingContainer?.[ingredientStores[i]] || "",
          servingSize: servingSize?.[ingredientStores[i]] || "",
          unit: unit?.[ingredientStores[i]] || ""
        };
      }

      // the overall data
      let docData = {
        ingredientName,
        ingredientTypes: types,
        ingredientData
      };
      
      // submission
      try {

        // if editing an ingredient
        if (editingId) { ingredientEdit({ editingId: editingId, updatedIngredient: docData }); } 
        // if adding an ingredient
        else { ingredientAdd({ newIngredient: docData }); }

        exitModal(true, docData);

      } catch (e) {
        console.error('Error saving ingredient:', e);
      }
    }
  };

  // to close the modal
  const exitModal = (isConfirmed, data) => {
    if (isConfirmed) { closeModal(typeList, brandLists, data); }
    else { cancelModal(); }

    setIngredientName("");
    setIngredientTypes([]);
  };

  
  ///////////////////////////////// CLEARING STORE DATA /////////////////////////////////

  // to specifically clear the current link
  const [linkStore, setLinkStore] = useState("");

  // to clear all data from the given store
  const clearStoreData = (store) => {
    
    // clears data
    setBrand(prev => ({ ...prev, [store]: "" }))
    setLink((prev) => ({ ...prev, [store]: "" }));
    setServingSize((prev) => ({ ...prev, [store]: "" }));
    setUnit((prev) => ({ ...prev, [store]: "" }));
    setServingContainer((prev) => ({ ...prev, [store]: "" }));
    setCalServing((prev) => ({ ...prev, [store]: "" }));
    setPriceContainer((prev) => ({ ...prev, [store]: "" }));
  }


  ///////////////////////////////// HTML /////////////////////////////////
  
  return (

    <Modal
      transparent={true}
      animationType="slide"
      visible={modalVisible}
      onRequestClose={exitModal}
    >
      <View className="flex-1 justify-center items-center">

        {/* Background Overlay */}
        <View className="absolute bg-black opacity-50 w-full h-full"/>

        {/* Modal Content */}
        <View className="flex w-4/5 bg-zinc200 px-7 py-5 rounded-2xl">
        
          {/* Title */}
          <Text className="text-[20px] font-bold">{editingId ? "EDIT INGREDIENT" : "ADD INGREDIENT"}</Text>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>

          <View className="flex flex-row justify-evenly content-center mb-4 h-[100px]">

            {/* Ingredient Name */}
            <View className="flex bg-white w-5/12 border-0.5 border-zinc500 rounded-md p-2 justify-center items-center">
              <TextInput
                className="text-center pb-1 text-[14px] leading-[17px]"
                placeholder="Ingredient Name"
                placeholderTextColor={colors.zinc400}
                multiline={true}
                blurOnSubmit={true}
                value={ingredientName}
                onChangeText={setIngredientName}
              />
            </View>

            {/* TYPE DROPDOWN */}
            <View className="flex flex-col justify-center items-center h-full w-1/2 z-50">
              <View className="flex bg-zinc600 h-[85%] w-11/12 rounded-lg">

              {/* Custom Section Header */}
                <View className="flex flex-row justify-between items-center px-2 py-1 h-1/3">
                  {/* text */}
                  <Text className="text-white font-medium text-[12px]">
                    {showCustomType ? "CUSTOM" : "TYPE LIST"}
                  </Text>
                  {/* button */}
                  <Icon
                    name={showCustomType ? "close-circle" : "add-circle"}
                    color="white"
                    size={18}
                    onPress={() => setShowCustomType(!showCustomType)}
                  />
                </View>
                
                {showCustomType
                ? // adding custom type
                  <View className="flex flex-row justify-center items-center bg-theme200 w-full h-2/3 border-2 border-zinc600">
                    {/* Inputing a new type */}
                    <View className="flex justify-center w-full pl-2 pr-6">
                      <TextInput
                        placeholder="Custom Type"
                        placeholderTextColor={colors.zinc500}
                        className="text-[12px] leading-[14px] text-center pb-1"
                        value={customType}
                        onChangeText={setCustomType}
                        multiline={true}
                        blurOnSubmit={true}
                      />
                    </View>

                    {/* Submitting it with a + Button */}
                    <View className="absolute right-1 flex h-full mt-[5px] justify-center items-center">
                      <Icon
                        size={18}
                        name={'add'}
                        color={colors.zinc700}
                        onPress={addCustomType}
                      />
                    </View>
                  </View>

                : // normal list of tags
                  <ScrollView
                    className="border-2 border-zinc600"
                    vertical
                    ref={scrollRef}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ flexDirection: 'col' }}
                  >
                  {typeList.map((type, index) => (
                    <View key={type.label}>
                    {/* maps each tag that isn't 'CUSTOM' */}
                    {type.label !== "CUSTOM" &&
                      <View className={`flex flex-row w-full items-center px-1 py-1 border-b-0.5 space-x-1
                        ${index % 2 === 0 && ingredientTypes.includes(type.label) ? "bg-theme400" : ingredientTypes.includes(type.label) ? "bg-theme300" : index % 2 !== 0 ? "bg-zinc350" : "bg-zinc400"}`}
                      >
                        {/* add or remove button */}
                        <Icon
                          name={ingredientTypes.includes(type.label) ? "close-outline" : "add"}
                          color="black"
                          size={14}
                          onPress={() => toggleType(type.label, typeList)}
                        />
                        {/* name */}
                        <Text className="text-black w-full font-medium text-[12px] pr-4">
                          {type.label}
                        </Text>
                      </View>
                    }
                    </View>
                  ))}
                  </ScrollView>
                }
              </View>
            </View>
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>

          {/* Store Sections */}
          {storeList.map((store, index) => (
            <View key={store}>
              <View className="flex flex-row h-[30px] w-full justify-center items-center mb-3">

                {/* clear button for filled in stores */}
                {(brand[store] !== "" || link[store] !== "" || servingSize[store] !== "" || unit[store] !== "" || servingContainer[store] !== "" || calServing[store] !== "" || priceContainer[store] !== "") &&
                  <View className="absolute left-3 flex justify-center items-center border-2 border-theme100 rounded-full">
                    <Icon
                      name="ban"
                      size={20}
                      color={colors.theme300}
                      onPress={() => clearStoreData(store)}
                    />
                  </View>
                }

                {/* store name */}
                <Text
                  className={`text-[18px] font-semibold text-zinc600 flex text-center mr-2 ${brand[store] !== "" ? "border-b-[0.75px] border-theme900" : ""}`}
                  onPress={() => toggleStoreSection(store)}
                >
                  {nameList[index]}
                </Text>
                
                {/* link input */}
                <TextInput
                  className="absolute right-2 flex bg-zinc100 border-[1px] border-zinc300 rounded-md px-2 w-[40px] h-[30px] ml-2 text-[14px] leading-[17px]"
                  placeholder="link"
                  placeholderTextColor={colors.zinc400}
                  value={link[store]}
                  multiline={false}
                  onChangeText={(value) => {
                    setLink((prev) => {
                      const updated = { ...prev }; 
                      updated[store] = value.replace("Check out this product from ALDI. ", "");
                      return updated;
                    })
                  }}
                  onFocus={() => setLinkStore(store)}
                  onBlur={() => setLinkStore("")}
                />

                {/* Button to clear the current store's link */}
                {linkStore === store &&
                <View className="absolute -right-2.5">
                  <Icon
                    name="close"
                    size={15}
                    color={colors.zinc450}
                    onPress={() => {
                      setLink((prev) => {
                        const updated = { ...prev }; 
                        updated[store] = "";
                        return updated;
                      })
                    }}
                  />
                </View>
                }
              </View>
              
              {/* details */}
              <View className="z-40">
                {selectedStore === store && (
                  <>
                    {/* BRAND DROPDOWN */}
                    <View className={`${brand[store] !== 'CUSTOM' ? "flex justify-center mb-4" : "flex flex-row w-full justify-evenly mb-4"}`}>
                      {/* Dropdown Picker */}
                      <View className={`${brand[store] === 'CUSTOM' ? "w-1/2" : "w-full"} z-40`}>
                        <DropDownPicker
                          open={brandDropdownOpen[store]}
                          setOpen={(open) => setBrandDropdownOpen((prev) => ({ ...prev, [store]: open }))}
                          value={brand[store]}
                          setValue={(valueOrFn) => {
                            const value = typeof valueOrFn === 'function' ? valueOrFn(brand[store]) : valueOrFn;
                            setBrand(prev => ({ ...prev, [store]: value }));
                          }}
                          items={brandLists[store].length === 0 ? [{ label: "", value: "no_data", disabled: true }] : brandLists[store]}
                          setItems={(items) => setBrandLists(prev => ({ ...prev, [store]: items }))}
                          placeholder="Select Brand"
                          style={{ backgroundColor: colors.theme200, borderWidth: 1, borderColor: colors.zinc400}}
                          dropDownContainerStyle={{ backgroundColor: 'white', borderWidth: 0.5, borderColor: colors.zinc400}}
                          listItemContainerStyle={{ borderBottomWidth: 1, borderBottomColor: colors.zinc200, }}
                          textStyle={{ color: 'black', textAlign: 'center', }}
                          TickIconComponent={() => brand[store] !== 'CUSTOM' && <Icon name="checkmark" size={18} color="black" /> }
                        />
                        
                        {/* Button to clear the current store's brand */}
                        {brandDropdownOpen[store] &&
                        <View className="absolute -right-4 justify-center h-full">
                          <Icon
                            name="close"
                            size={15}
                            color={colors.zinc450}
                            onPress={() => setBrand(prev => ({ ...prev, [store]: "" })) }
                          />
                        </View>
                        }
                      </View>

                      {/* Frozen Custom Selection */}
                      {brandDropdownOpen[store] &&
                        <TouchableOpacity
                          className={`flex flex-row justify-center items-center absolute top-10 mt-[9.5px] border-x-[0.5px] border-x-zinc400 border-b-[1px] border-b-zinc200 ${brand[store] !== 'CUSTOM' ? "w-full" : "w-1/2"} h-[40px] z-50 bg-zinc100`}
                          onPress={() => {
                            setBrand(prev => ({ ...prev, [store]: 'CUSTOM' }));
                            setBrandDropdownOpen(false);
                          }}
                        >
                          <Text className="text-theme500 italic">
                            CUSTOM
                          </Text>
                        </TouchableOpacity>
                      }

                      {/* Custom Brand Input */}
                      {brand[store] === 'CUSTOM' && (
                        <>
                          <View className="flex flex-row justify-between w-full h-[50px]">

                            {/* Inputing a new brand */}
                            <View className="flex bg-white border-0.5 border-zinc500 rounded-md py-1 px-2 ml-2 w-2/5 h-full z-10 justify-center items-center">
                              <TextInput
                                className="text-center pb-1 text-[14px] leading-[17px]"
                                placeholder="Custom Brand"
                                placeholderTextColor={colors.zinc400}
                                value={customBrand}
                                onChangeText={setCustomBrand}
                                multiline={true}
                                blurOnSubmit={true}
                              />
                            </View>

                            {/* Buttons*/}
                            <View className="w-1/2 absolute left-0 flex h-full justify-center items-end z-0">
                              {/* submit custom */}
                              <Icon
                                size={18}
                                name={'add'}
                                color={colors.zinc700}
                                onPress={addCustomBrand}
                              />
                              {/* cancel custom */}
                              <Icon
                                size={18}
                                name={'close-outline'}
                                color={colors.zinc700}
                                onPress={() => setBrand(prev => ({ ...prev, [store]: "" }))}
                              />
                            </View>
                          </View>
                        </>
                      )}
                    </View>


                    {/* SERVING SECTION */}
                    <View>

                      {/* Serving Size */}
                      <View className="flex flex-row justify-between items-center mb-4">

                        {/* Label */}
                        <Text className="text-theme700 mr-4">
                          Serving Size
                        </Text>

                        <View className="flex-1 flex-row justify-center items-center bg-theme100 border-0.5 border-zinc500 px-2">
                          {/* Size */}
                          <TextInput
                            className="p-1 flex text-center text-[14px] leading-[17px]"
                            placeholder="0 0/0"
                            placeholderTextColor={colors.zinc400}
                            value={servingSize[store]}
                            onChangeText={(value) => {
                              setServingSize((prev) => {
                                const updated = { ...prev }; 
                                updated[store] = validateFractionInput(value);
                                return updated;
                              })
                            }}
                          />

                          {/* Units */}
                          <TextInput
                            className="p-1 flex text-center text-[14px] leading-[17px]"
                            placeholder="unit(s)"
                            placeholderTextColor={colors.zinc400}
                            value={unit[store]}
                            onChangeText={(value) => {
                              setUnit((prev) => {
                                const updated = { ...prev }; 
                                updated[store] = value;
                                return updated;
                              })
                            }}
                          />
                        </View>
                      </View>

                      {/* Servings / Container */}
                      <View className="flex flex-row justify-between items-center mb-4">

                        {/* Label */}
                        <Text className="text-theme700 mr-4">
                          Servings Per Container
                        </Text>
                        

                        {/* Input */}
                        <TextInput
                          className="flex-1 bg-theme100 border-0.5 border-zinc500 p-1 text-center text-[14px] leading-[17px] px-2"
                          placeholder="0 0/0"
                          placeholderTextColor={colors.zinc400}
                          value={servingContainer[store]}
                          onChangeText={(value) => {
                            setServingContainer((prev) => {
                              const updated = { ...prev }; 
                              updated[store] = validateFractionInput(value);
                              return updated;
                            })
                          }}
                        />
                      </View>

                      {/* Calories / Serving */}
                      <View className="flex flex-row justify-between items-center mb-4">

                        {/* Label */}
                        <Text className="text-theme700 mr-4">
                          Calories Per Serving
                        </Text>

                        {/* Input */}
                        <TextInput
                          className="flex-1 bg-theme100 border-0.5 border-zinc500 p-1 text-center text-[14px] leading-[17px] px-2"
                          placeholder="0"
                          placeholderTextColor={colors.zinc400}
                          value={calServing[store]}
                          onChangeText={ (value) => {
                            setCalServing((prev) => {
                              const updated = { ...prev }; 
                              updated[store] = validateWholeNumberInput(value);
                              return updated;
                            })
                          }}
                        />
                      </View>

                      {/* Price / Container */}
                      <View className="flex flex-row justify-between items-center mb-4">

                        {/* Label */}
                        <Text className="text-theme700 mr-4">
                          Price Per Container
                        </Text>

                        {/* Input */}
                        <View className="flex-1 flex-row justify-center items-center border-0.5 border-zinc500 p-1 bg-theme100 px-2">

                          {/* Dummy $ */}
                          <TextInput
                            className="flex text-right text-[14px] leading-[17px]"
                            placeholder="$"
                            placeholderTextColor={priceContainer[store] ? "black" : colors.zinc400}
                            editable={false}
                          />

                          {/* User Input */}
                          <TextInput
                            className="flex text-left text-[14px] leading-[17px]"
                            placeholder="0.00"
                            placeholderTextColor={colors.zinc400}
                            value={priceContainer[store]}
                            onChangeText={(value) => {
                              setPriceContainer((prev) => {
                                const updated = { ...prev }; 
                                updated[store] = validateDecimalInput(value);
                                return updated;
                              })
                            }}
                          />
                        </View>
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* Divider */}
              <View className="h-[1px] bg-zinc400 mb-4"/>

            </View>
          ))}

          {/* BOTTOM ROW */}
          <View className="flex flex-row items-center justify-between">
            {/* Warning if no name is given */}
            {isNameValid ? null : 
              <Text className="text-mauve600 italic">
                ingredient name is required
              </Text>
            }

            {/* Warning if no store is filled in */}
            {isStoreValid ? null : 
              <Text className="text-mauve600 italic">
                at least one store must have data
              </Text>
            }

            {/* Warning if no name or type is given */}
            {isBrandValid ? null : 
              <Text className="text-mauve600 italic">
                filled in stores must have a brand
              </Text>
            }

            {/* Warning if a custom is not filled out */}
            {isCustomValid ? null : 
              <Text className="text-mauve600 italic">
                submit all 'custom' values
              </Text>
            }
            
            {/* BUTTONS */}
            <View className="flex flex-row justify-center items-center ml-auto">

              {/* Check */}
              <Icon 
                size={24}
                color="black"
                name="checkmark"
                onPress={submitModal}
              />

              {/* X */}
              <Icon 
                size={24}
                color="black"
                name="close-outline"
                onPress={() => exitModal(false, null)}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ModIngredientModal;