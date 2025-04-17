///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

import ingredientAdd from '../../firebase/Ingredients/ingredientAdd';
import ingredientEdit from '../../firebase/Ingredients/ingredientEdit';

import capitalizeInput from '../Validation/capitalizeInput';
import validateFractionInput from '../Validation/validateFractionInput';
import validateDecimalInput from '../Validation/validateDecimalInput';
import validateWholeNumberInput from '../Validation/validateWholeNumberInput';

// initialize Firebase App
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const ModIngredientModal = ({ 
  modalVisible, closeModal, cancelModal, 
  editingId, initialStore, 
  initialTypeList, 
  aInitialBrandList, mbInitialBrandList, smInitialBrandList, ssInitialBrandList, tInitialBrandList, wInitialBrandList,
}) => {

  ///////////////////////////////// VARIABLES /////////////////////////////////

  // Ingredient Name
  const [ingredientName, setIngredientName] = useState('');

  // Data
  const [link, setLink] = useState({ a: "", mb: "", sm: "", ss: "", t: "",  w: "" });
  const [servingSize, setServingSize] = useState({ a: "", mb: "", sm: "", ss: "", t: "",  w: "" });
  const [unit, setUnit] = useState({ a: "", mb: "", sm: "", ss: "", t: "",  w: "" });
  const [servingContainer, setServingContainer] = useState({ a: "", mb: "", sm: "", ss: "", t: "",  w: "" });
  const [calServing, setCalServing] = useState({ a: "", mb: "", sm: "", ss: "", t: "",  w: "" });
  const [priceContainer, setPriceContainer] = useState({ a: "", mb: "", sm: "", ss: "", t: "",  w: "" });

  // Store Selection
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeList, setStoreList] = useState(['a', 'mb', 'sm', 'ss', 't', 'w']);
  const [nameList, setNameList] = useState(['ALDI', 'MARKET BASKET', 'STAR MARKET', 'STOP & SHOP', 'TARGET', 'WALMART']);

  // toggle store section visibility
  const toggleStoreSection = (store) => {
    
    // clears custom type
    if (selectedStore && getBrandData(selectedStore).brand === 'CUSTOM') { getBrandData(selectedStore).setBrand(""); }

    setSelectedStore(selectedStore === store ? null : store);
    
    // reorders the store list to put the selected one first
    let abrv = ['a', 'mb', 'sm', 'ss', 't', 'w'];
    let name = ['ALDI', 'MARKET BASKET', 'STAR MARKET', 'STOP & SHOP', 'TARGET', 'WALMART']
    
    // only does so if there is a dropdown open; if not, will reset instead
    if (selectedStore !== store) {

      // creates and reorderspairs of abbreviation and name
      let storePairs = abrv.map((abbr, index) => ({ abbr, name: name[index] }));
      storePairs = [storePairs.find(pair => pair.abbr === store), ...storePairs.filter(pair => pair.abbr !== store)];
    
      // extracts reordered arrays
      abrv = storePairs.map(pair => pair.abbr);
      name = storePairs.map(pair => pair.name);
    }

    setStoreList(abrv);
    setNameList(name);

    setCustomBrand("");
  };


  ///////////////////////////////// TYPE LIST /////////////////////////////////

  const [ingredientTypes, setIngredientTypes] = useState([]);

  // updates the tag list
  const toggleType = (type, currTypeList) => {

    setIngredientTypes((prev) => {
      const updatedIngredientTypes = prev.includes(type)
        ? prev.filter(value => value !== type)  // removes type
        : [...prev, type];                      // adds type
        
      alphabetizeTypes(updatedIngredientTypes, currTypeList); // alphabetizes updated state
      return updatedIngredientTypes;
    });
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
  


  ///////////////////////////////// CUSTOM TYPE /////////////////////////////////
  
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


  ///////////////////////////////// CUSTOM BRAND /////////////////////////////////

  const [aBrand, aSetBrand] = useState("");
  const [mbBrand, mbSetBrand] = useState("");
  const [smBrand, smSetBrand] = useState("");
  const [ssBrand, ssSetBrand] = useState("");
  const [tBrand, tSetBrand] = useState("");
  const [wBrand, wSetBrand] = useState("");

  const [customBrand, setCustomBrand] = useState("");
  const [brandDropdownOpen, setBrandDropdownOpen] = useState({ a: false, mb: false, sm: false, ss: false, t: false,  w: false });

  // helper function to get individual brand getters/setters
  const getBrandData = (store) => {
    const brandData = {
      a: { brand: aBrand, setBrand: aSetBrand, brandList: aBrandList, setBrandList: aSetBrandList },
      mb: { brand: mbBrand, setBrand: mbSetBrand, brandList: mbBrandList, setBrandList: mbSetBrandList },
      sm: { brand: smBrand, setBrand: smSetBrand, brandList: smBrandList, setBrandList: smSetBrandList },
      ss: { brand: ssBrand, setBrand: ssSetBrand, brandList: ssBrandList, setBrandList: ssSetBrandList },
      t: { brand: tBrand, setBrand: tSetBrand, brandList: tBrandList, setBrandList: tSetBrandList },
      w: { brand: wBrand, setBrand: wSetBrand, brandList: wBrandList, setBrandList: wSetBrandList },
    };
    
    return brandData[store];
  };  

  // when adding a custom brand
  const addCustomBrand = () => {

    if (customBrand !== "") {
      
      if (!getBrandData(selectedStore).brandList.some((brand) => brand.value === customBrand.toLowerCase())) {
        const updatedIngredientTypes = [
          ...getBrandData(selectedStore).brandList,
          { label: customBrand, value: customBrand },
        ];

        // sort, keeping "CUSTOM" at the top
        updatedIngredientTypes.sort((a, b) => {
          if (a.label === "CUSTOM") return -1;
          if (b.label === "CUSTOM") return 1;
          return a.label.localeCompare(b.label);
        });
        
        
        getBrandData(selectedStore).setBrandList(updatedIngredientTypes);     // updates the items list with the new custom type
        getBrandData(selectedStore).setBrand(customBrand);                    // sets the value to the newly added custom type   
        setCustomBrand("");                                                   // clears the custom type input field
      }
    }
  };


  ///////////////////////////////// OPENING MODAL /////////////////////////////////

  const [typeList, setTypeList] = useState([]);
  const [aBrandList, aSetBrandList] = useState([]);
  const [mbBrandList, mbSetBrandList] = useState([]);
  const [smBrandList, smSetBrandList] = useState([]);
  const [ssBrandList, ssSetBrandList] = useState([]);
  const [tBrandList, tSetBrandList] = useState([]);
  const [wBrandList, wSetBrandList] = useState([]);

  // setting initial types
  useEffect(() => {
    if (modalVisible) {
      setTypeList(initialTypeList);
      aSetBrandList(aInitialBrandList);
      mbSetBrandList(mbInitialBrandList);
      smSetBrandList(smInitialBrandList);
      ssSetBrandList(ssInitialBrandList);
      tSetBrandList(tInitialBrandList);
      wSetBrandList(wInitialBrandList);
    }
  }, [modalVisible])

  // if editing an ingredient 
  useEffect(() => {
    if (editingId) {
      const fetchIngredientData = async () => {
        try {
          const docRef = doc(db, 'ingredients', editingId);  // creates a reference to the document
          const docSnap = await getDoc(docRef);              // fetches the document

          if (docSnap.exists()) {
            const data = docSnap.data();                     // accesses the document data
            
            // sets the ingredient data
            setIngredientName(data.ingredientName || '');
            setIngredientTypes(data.ingredientType || []);
            
            setTimeout(() => alphabetizeTypes(data.ingredientType, initialTypeList), 1000);      // sorts types        

            aSetBrand(data.aBrand);
            mbSetBrand(data.mbBrand);
            smSetBrand(data.smBrand);
            ssSetBrand(data.ssBrand);
            tSetBrand(data.tBrand);
            wSetBrand(data.wBrand);
            
            setLink({ a: data.aLink || '', mb: data.mbLink || '', sm: data.smLink || '', ss: data.ssLink || '', t: data.tLink || '', w: data.wLink || '' });
            setServingSize({ a: data.aServingSize || '', mb: data.mbServingSize || '', sm: data.smServingSize || '', ss: data.ssServingSize || '', t: data.tServingSize || '', w: data.wServingSize || '' });
            setUnit({ a: data.aUnit || '', mb: data.mbUnit || '', sm: data.smUnit || '', ss: data.ssUnit || '', t: data.tUnit || '', w: data.wUnit || '' });
            setServingContainer({ a: data.aServingContainer || '', mb: data.mbServingContainer || '', sm: data.smServingContainer || '', ss: data.ssServingContainer || '', t: data.tServingContainer || '', w: data.wServingContainer || '' });
            setCalServing({ a: data.aCalServing || '', mb: data.mbCalServing || '', sm: data.smCalServing || '', ss: data.ssCalServing || '', t: data.tCalServing || '', w: data.wCalServing || '' });
            setPriceContainer({ a: data.aPriceContainer || '', mb: data.mbPriceContainer || '', sm: data.smPriceContainer || '', ss: data.ssPriceContainer || '', t: data.tPriceContainer || '', w: data.wPriceContainer || '' });
          }

        } catch (error) {
          console.error('Error fetching ingredient data:', error);
        }
      };

      fetchIngredientData();
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
    } else if (getBrandData('a').brand === "" && getBrandData('mb').brand === "" && getBrandData('sm').brand === "" && getBrandData('ss').brand === "" && getBrandData('t').brand === "" && getBrandData('w').brand === "") {
      setNameValid(true);
      setStoreValid(false);
      setBrandValid(true);
      setCustomValid(true);

    // if a required brand is empty
    } else if ((getBrandData('a').brand === "" && (servingSize.a !== "" || unit.a !== "" || servingContainer.a !== "" || calServing.a !== "" || priceContainer.a !== ""))
        || (getBrandData('mb').brand === "" && (servingSize.mb !== "" || unit.mb !== "" || servingContainer.mb !== "" || calServing.mb !== "" || priceContainer.mb !== ""))
        || (getBrandData('sm').brand === "" && (servingSize.sm !== "" || unit.sm !== "" || servingContainer.sm !== "" || calServing.sm !== "" || priceContainer.sm !== ""))
        || (getBrandData('ss').brand === "" && (servingSize.ss !== "" || unit.ss !== "" || servingContainer.ss !== "" || calServing.ss !== "" || priceContainer.ss !== ""))
        || (getBrandData('t').brand === "" && (servingSize.t !== "" || unit.t !== "" || servingContainer.t !== "" || calServing.t !== "" || priceContainer.t !== ""))
        || (getBrandData('w').brand === "" && (servingSize.w !== "" || unit.w !== "" || servingContainer.w !== "" || calServing.w !== "" || priceContainer.w !== ""))
      ) {
      setNameValid(true);
      setStoreValid(true);
      setBrandValid(false);
      setCustomValid(true);
    
    // if a CUSTOM is remaining
    } else if (showCustomType || getBrandData('a').brand === 'CUSTOM' || getBrandData('mb').brand === 'CUSTOM' || getBrandData('sm').brand === 'CUSTOM' || getBrandData('ss').brand === 'CUSTOM' || getBrandData('t').brand === 'CUSTOM' || getBrandData('w').brand === 'CUSTOM') {
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
      const types = ingredientTypes.includes("") && ingredientTypes.length > 1 ? ingredientTypes.filter((type) => type !== "") 
                    : ingredientTypes.length === 0 ? [""] : ingredientTypes;
      
      // collect the ingredient's data
      let ingredientData = {
        ingredientName, 
        ingredientType: types,
        aLink: link.a,                         mbLink: link.mb,                         smLink: link.sm,                         ssLink: link.ss,                         tLink: link.t,                         wLink: link.w, 
        aBrand: getBrandData('a').brand,       mbBrand: getBrandData('mb').brand,       smBrand: getBrandData('sm').brand,       ssBrand: getBrandData('ss').brand,       tBrand: getBrandData('t').brand,       wBrand: getBrandData('w').brand,
        aServingSize: servingSize.a,           mbServingSize: servingSize.mb,           smServingSize: servingSize.sm,           ssServingSize: servingSize.ss,           tServingSize: servingSize.t,           wServingSize: servingSize.w,
        aUnit: unit.a,                         mbUnit: unit.mb,                         smUnit: unit.sm,                         ssUnit: unit.ss,                         tUnit: unit.t,                         wUnit: unit.w,
        aServingContainer: servingContainer.a, mbServingContainer: servingContainer.mb, smServingContainer: servingContainer.sm, ssServingContainer: servingContainer.ss, tServingContainer: servingContainer.t, wServingContainer: servingContainer.w,
        aCalServing: calServing.a,             mbCalServing: calServing.mb,             smCalServing: calServing.sm,             ssCalServing: calServing.ss,             tCalServing: calServing.t,             wCalServing: calServing.w,
        aPriceContainer: priceContainer.a,     mbPriceContainer: priceContainer.mb,     smPriceContainer: priceContainer.sm,     ssPriceContainer: priceContainer.ss,     tPriceContainer: priceContainer.t,     wPriceContainer: priceContainer.w,
      };
      
      // if editing an ingredient
      if (editingId) {

        try {  

          // update the ingredient
          ingredientData = { editingId, ...ingredientData };
          ingredientEdit(ingredientData);
          
          // close the modal
          exitModal(true); 

        } catch (error) {
          console.error('Error updating ingredient:', error);
        }
      
      // if adding an ingredient
      } else {
        
        try {
          // call the ingredientAdd function
          ingredientAdd(ingredientData);
          exitModal(true);

        } catch(e) {
          console.error('Error adding ingredient:', e);
        }
      }
    }
  };

  // to close the modal
  const exitModal = (isConfirmed) => {
    
    if (isConfirmed) { closeModal(typeList, aBrandList, mbBrandList, smBrandList, ssBrandList, tBrandList, wBrandList); }
    else { cancelModal(); }

    setIngredientName("");
    setIngredientTypes([]);

    aSetBrand("");
    mbSetBrand("");
    smSetBrand("");
    ssSetBrand("");
    tSetBrand("");
    wSetBrand("");

    setLink({ a: "", mb: "", sm: "", ss: "", t: "",  w: "" });
    setServingSize({ a: "", mb: "", sm: "", ss: "", t: "",  w: "" });
    setUnit({ a: "", mb: "", sm: "", ss: "", t: "",  w: "" });
    setServingContainer({ a: "", mb: "", sm: "", ss: "", t: "",  w: "" });
    setCalServing({ a: "", mb: "", sm: "", ss: "", t: "",  w: "" });
    setPriceContainer({ a: "", mb: "", sm: "", ss: "", t: "",  w: "" });
  };

  
  ///////////////////////////////// CLEARING STORE DATA /////////////////////////////////

  // to specifically clear the current link
  const [linkStore, setLinkStore] = useState("");

  // to clear all data from the given store
  const clearStoreData = (store) => {

    // clear brand
    getBrandData(store).setBrand("");

    // clear serving size
    setServingSize((prev) => {
      const updated = { ...prev }; 
      updated[store] = "";
      return updated;
    });

    // clear unit
    setUnit((prev) => {
      const updated = { ...prev }; 
      updated[store] = "";
      return updated;
    });

    // clear servings per container
    setServingContainer((prev) => {
      const updated = { ...prev }; 
      updated[store] = "";
      return updated;
    });

    // clear calories per serving
    setCalServing((prev) => {
      const updated = { ...prev }; 
      updated[store] = "";
      return updated;
    });

    // clear price per container
    setPriceContainer((prev) => {
      const updated = { ...prev }; 
      updated[store] = "";
      return updated;
    });
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
            <View className="flex bg-white w-5/12 border border-zinc500 rounded-md p-2 justify-center items-center">
              <TextInput
                className="text-center pb-1 text-[14px] leading-[16px]"
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
                    scrollEventThrottle={16}
                    contentContainerStyle={{ flexDirection: 'col' }}
                  >
                  {typeList.map((type, index) => (
                    <View key={type.label}>
                    {/* maps each tag that isn't 'CUSTOM' */}
                    {type.label !== "CUSTOM" &&
                      <View className={`flex flex-row w-full items-center px-1 py-1 border-b space-x-1
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
                {getBrandData(store).brand !== "" &&
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
                  className={`text-[18px] font-semibold text-zinc600 flex text-center mr-2 ${getBrandData(store).brand !== "" ? "border-b-[1px]" : ""}`}
                  onPress={() => toggleStoreSection(store)}
                >
                    {nameList[index]}
                </Text>
                
                {/* link input */}
                <TextInput
                  className="absolute right-2 flex bg-zinc100 border border-zinc300 rounded-md px-2 w-[40px] h-[30px] ml-2 text-[14px] leading-[16px]"
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
                    <View className={`${getBrandData(store).brand !== 'CUSTOM' ? "flex justify-center mb-4" : "flex flex-row w-full justify-evenly mb-4"}`}>
                      {/* Dropdown Picker */}
                      <View className={`${getBrandData(store).brand === 'CUSTOM' ? "w-1/2" : "w-full"} z-40`}>
                        <DropDownPicker
                          open={brandDropdownOpen[store]}
                          setOpen={(open) => setBrandDropdownOpen((prev) => ({ ...prev, [store]: open }))}
                          value={getBrandData(store).brand}
                          setValue={getBrandData(store).setBrand}
                          items={getBrandData(store).brandList.length === 0 ? [{ label: "", value: "no_data", disabled: true }] : getBrandData(store).brandList}
                          setItems={getBrandData(store).setBrandList}
                          placeholder="Select Brand"
                          style={{ backgroundColor: colors.theme200, borderWidth: 1, borderColor: colors.zinc400}}
                          dropDownContainerStyle={{ backgroundColor: 'white', borderWidth: 0.5, borderColor: colors.zinc400}}
                          listItemContainerStyle={{ borderBottomWidth: 1, borderBottomColor: colors.zinc200, }}
                          textStyle={{ color: 'black', textAlign: 'center', }}
                          TickIconComponent={() => getBrandData(store).brand !== 'CUSTOM' && <Icon name="checkmark" size={18} color="black" /> }
                        />
                      </View>

                      {/* Frozen Custom Selection */}
                      {brandDropdownOpen[store] &&
                        <TouchableOpacity
                          className={`flex flex-row justify-center items-center absolute top-10 mt-[9.5px] border-x-[0.5px] border-x-zinc400 border-b-[1px] border-b-zinc200 ${getBrandData(store).brand !== 'CUSTOM' ? "w-full" : "w-1/2"} h-[40px] z-50 bg-zinc100`}
                          onPress={() => {
                            getBrandData(store).setBrand('CUSTOM')
                            setBrandDropdownOpen(false);
                          }}
                        >
                          <Text className="text-theme500 italic">
                            CUSTOM
                          </Text>
                        </TouchableOpacity>
                      }

                      {/* Custom Brand Input */}
                      {getBrandData(store).brand === 'CUSTOM' && (
                        <>
                          <View className="flex flex-row justify-between w-full h-[50px]">

                            {/* Inputing a new brand */}
                            <View className="flex bg-white border border-zinc500 rounded-md py-1 px-2 ml-2 w-2/5 h-full z-10 justify-center items-center">
                              <TextInput
                                className="text-center pb-1 text-[14px] leading-[16px]"
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
                                onPress={() => getBrandData(store).setBrand("")}
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

                        <View className="flex-1 flex-row border border-zinc500">
                          {/* Size */}
                          <TextInput
                            className="bg-theme100 p-1 flex-1 text-center text-[14px] leading-[16px]"
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
                            className="bg-theme100 p-1 flex-1 text-[14px] leading-[16px]"
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
                          className="flex-1 bg-theme100 border border-zinc500 p-1 text-center text-[14px] leading-[16px]"
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
                          className="flex-1 bg-theme100 border border-zinc500 p-1 text-center text-[14px] leading-[16px]"
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
                        <View className="flex-1 flex-row border border-zinc500 p-1 bg-theme100">

                          {/* Dummy $ */}
                          <TextInput
                            className="flex-1 text-right text-[14px] leading-[16px]"
                            placeholder="$"
                            placeholderTextColor={priceContainer[store] ? "black" : colors.zinc400}
                            editable={false}
                          />

                          {/* User Input */}
                          <TextInput
                            className="flex-1 bg-theme100 text-left text-[14px] leading-[16px]"
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
              <Text className="text-pink-600 italic">
                ingredient name is required
              </Text>
            }

            {/* Warning if no store is filled in */}
            {isStoreValid ? null : 
              <Text className="text-pink-600 italic">
                at least one store must have data
              </Text>
            }

            {/* Warning if no name or type is given */}
            {isBrandValid ? null : 
              <Text className="text-pink-600 italic">
                filled in stores must have a brand
              </Text>
            }

            {/* Warning if a custom is not filled out */}
            {isCustomValid ? null : 
              <Text className="text-pink-600 italic">
                submit all 'custom' values
              </Text>
            }
            
            {/* BUTTONS */}
            <View className="flex flex-row justify-center items-center ml-auto">

              {/* Check */}
              <Icon 
                size={24}
                color={'black'}
                name="checkmark"
                onPress={submitModal}
              />

              {/* X */}
              <Icon 
                size={24}
                color={'black'}
                name="close-outline"
                onPress={() => exitModal(false)}
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