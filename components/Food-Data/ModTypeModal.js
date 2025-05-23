///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect } from 'react';

// UI components
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// validation
import capitalizeInput from '../Validation/capitalizeInput';

// initialize firebase app
import { getFirestore, doc, writeBatch } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const ModTypeModal = ({ 
  modalVisible, setModalVisible, closeModal, 
  initialTypeList, initialQuery, 
  ingredientSnapshot, recipeSnapshot, spotlightSnapshot
}) => {


  ///////////////////////////////// ON OPEN /////////////////////////////////

  const [typeList, setTypeList] = useState([]);

  // stores given data on open
  useEffect(() => {
    if (modalVisible) {
      storeData();
    }
  }, [modalVisible]);  

  const [ingredients, setIngredients] = useState(null);

  // to put the initial (provided) data in states
  const storeData = () => {
 
    // stores the ingredient snapshot as a map of data
    let ingredients = ingredientSnapshot.docs.map((ingredient) => {
      return {
        id: ingredient.id,    
        ...ingredient.data(),  
      };
    });

    setIngredients(ingredients);

    // stores the initial data
    setTypeList(initialTypeList);
    setSearchQuery(initialQuery);

    // initial filter
    filterIngredientData(ingredients, initialQuery, false, "", false);
  }
  
  
  ///////////////////////////////// SEARCH QUERY /////////////////////////////////
    
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');     

    // filters data based on query
  const filterIngredientData = async (dataToUse, queryToUse, filterOn, typeToUse, filterChanged) => {
    
    // filters by changed data only
    if (filterChanged) {

      // original data
      let oldIngredients = ingredientSnapshot.docs.map((ingredient) => {
        return {
          id: ingredient.id,    
          ...ingredient.data(),  
        };
      });
    
      // filters by changed
      dataToUse = dataToUse.filter((oldIngredient) => {
        return oldIngredients.some((newIngredient) => 
          newIngredient.id === oldIngredient.id &&
          oldIngredient.ingredientTypes.sort().join(",") !== newIngredient.ingredientTypes.sort().join(",")
        );
      });
    }

    // filters by search query
    const queryWords = queryToUse
      .toLowerCase()
      .split(" ")
      .filter((word) => word.trim() !== "");
  
    dataToUse = dataToUse.filter((ingredient) =>
      queryWords.every((word) =>
        ingredient.ingredientName.toLowerCase().includes(word)
      )
    );


    // alphabetizes by ingredient name
    dataToUse.sort((a, b) => 
      a.ingredientName.localeCompare(b.ingredientName)
    );

    // if type filtering
    if (filterOn) {
      dataToUse = dataToUse.filter((ingredient) =>
        ingredient.ingredientTypes.includes(typeToUse)
      )
    }
    
    // sets the filtered data in the state
    setFilteredData(dataToUse);
  }

  // refilters when search query changes
  useEffect(() => {
    filterIngredientData(ingredients, searchQuery, filterByType, filterType, showModOnly);
  }, [searchQuery])

  
  ///////////////////////////////// TYPE SELECTION /////////////////////////////////

  const [showCustomType, setShowCustomType] = useState(false);
  const [customType, setCustomType] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterByType, setFilterByType] = useState(false);

  // to submit a new type
  const addCustomType = () => {
    
    if (customType !== "") {
      
      // capitalizes the first letter and make the rest lowercase if Type
      const formattedValue = capitalizeInput(customType);
      if (!typeList.some((type) => type.value === formattedValue.toLowerCase())) {

        // the new list, sorted with CUSTOM at the top
        const updatedTypeList = [
          ...typeList,
          { label: formattedValue, value: formattedValue },
        ].sort((a, b) => {
          if (a.label === "CUSTOM") return -1; // keeps "CUSTOM" first
          if (b.label === "CUSTOM") return 1;
          return a.label.localeCompare(b.label); // sorts alphabetically
        });
        
        
        setTypeList(updatedTypeList);         // updates the items list with the new custom type
        setFilterType(formattedValue);        // stores the new type as the selected type
        setCustomType("");                    // clears the custom type input field
        
        // hides the custom section
        setShowCustomType(false);
      }
    }
  };

  // refilters when filterType changes
  useEffect(() => {
    filterIngredientData(ingredients, searchQuery, filterByType, filterType, showModOnly);
  }, [filterByType, filterType])

  
  ///////////////////////////////// EDITING TYPES /////////////////////////////////

  const [showEditType, setShowEditType] = useState(false);
  const [editType, setEditType] = useState("");

  // when a type is to be edited
  const openEditType = () => {

    // if edit type portion will be shown
    if (!showEditType) {
      setShowEditType(true);
      setShowCustomType(false);
      setEditType(filterType);
    
    // if it will be hidden
    } else {
      setShowEditType(false);
      setEditType("");
    }
  }

  // submitting an edited type's name
  const editFilteredType = () => {

    // capitalizes the first letter and make the rest lowercase
    const formattedValue = capitalizeInput(editType);
    
    // the new list including the new type, sorted with CUSTOM at the top
    const updatedTypeList = typeList
    .map((item) =>
      item.label === filterType
        ? { label: formattedValue, value: formattedValue }
        : item
    )
    .sort((a, b) => {
      if (a.label === "CUSTOM") return -1; // Keeps "CUSTOM" first
      if (b.label === "CUSTOM") return 1;
      return a.label.localeCompare(b.label); // Sorts alphabetically
    });
    
    setShowEditType(false);
    setEditType("");                      // clears the edited type input field

    setTypeList(updatedTypeList);         // updates the items list with the new edited type
    setFilterType(formattedValue);        // stores the edited type as the selected type


    // renames the types in the ingredient data
    let newIngredients = ingredients;
  
    newIngredients = newIngredients.map((ingredient) => {
      if (ingredient.ingredientTypes.includes(filterType)) {
        return {
          ...ingredient,
          ingredientTypes: ingredient.ingredientTypes.map((type) =>
            type === filterType ? editType : type
          ),
        };
      }
      return ingredient;
    });

    // stores the new ingredients
    setIngredients(newIngredients);
  };

  // refilters when the ingredients change
  useEffect(() => {
    filterIngredientData(ingredients, searchQuery, filterByType, filterType, showModOnly);
  }, [ingredients])

  
  ///////////////////////////////// TYPE DROPDOWN /////////////////////////////////

  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("");

  // when a type is to be added to an ingredient
  const addIngredientType = (id) => {

    // adds the new type to the ingredient with the given id
    let newIngredients = ingredients;
  
    newIngredients = newIngredients.map((ingredient) => {
      if (ingredient.id === id) {
        if (!ingredient.ingredientTypes.includes(selectedType)) {
          const newTypes = [...ingredient.ingredientTypes.filter((type) => type !== ""), selectedType];

          return {
            ...ingredient,
            ingredientTypes: newTypes,
          };
        }
      }
      return ingredient;
    });

    // stores the new data
    setIngredients(newIngredients);
  }

  // when a type is to be removed from an ingredient
  const removeIngredientType = (id) => {

    // removes the type from the ingredient of the given id
    let newIngredients = ingredients;
  
    newIngredients = newIngredients.map((ingredient) => {
      if (ingredient.id === id) {
        const newTypes = ingredient.ingredientTypes.length === 1 && ingredient.ingredientTypes.includes(selectedType)
          ? [""]
          : ingredient.ingredientTypes.filter((type) => type !== selectedType);

        return {
          ...ingredient,
          ingredientTypes: newTypes,
        };
      }
      return ingredient;
    });

    // stores the new data
    setIngredients(newIngredients);
  }
  

  ///////////////////////////////// SHOWING MODIFIED INGREDIENTS /////////////////////////////////

  const [showModOnly, setShowModOnly] = useState(false);

  // refilters when only showing modified ingredients
  useEffect(() => {
    filterIngredientData(ingredients, searchQuery, filterByType, filterType, showModOnly);
  }, [showModOnly])
  

  ///////////////////////////////// SUBMITTING MODAL /////////////////////////////////
  
  // when the checkmark is clicked to submit changes
  const submitModal = async () => { 

    // creates a batch to update ingredients, recipes, and spotlights
    const batch = writeBatch(db);

    // to collect the ids that change and their corresponding types
    const changedIds = [];
    const changedTypes = [];

    // recollects the initial ingredients
    const oldIngredientsMap = new Map(ingredientSnapshot.docs.map(doc => [doc.id, doc.data()]));

    // loops over the current ingredients
    ingredients.forEach((newIngredient) => {

      // if the current ingredient is found
      const oldIngredient = oldIngredientsMap.get(newIngredient.id);
      if (oldIngredient) {

        // compares their type lists
        const oldTypes = oldIngredient.ingredientTypes.sort((a, b) => a.localeCompare(b)).join(",");
        const newTypes = newIngredient.ingredientTypes.sort((a, b) => a.localeCompare(b)).join(",");
        
        if (oldTypes !== newTypes) {

          // if they don't match, update the ingredient in the db and store the changes in the arrays
          batch.update(doc(db, 'INGREDIENTS', newIngredient.id), { ingredientTypes: newIngredient.ingredientTypes });
          changedIds.push(newIngredient.id);
          changedTypes.push(newIngredient.ingredientTypes);
        }
      }
    });

    // updates recipes with the new ingredient types
    recipeSnapshot.docs.forEach((recipe) => {
          
      // store the old data
      let recipeData = recipe.data();

      // if the current recipe's current ingredient has been changed, update it
      for (let i = 0; i < 12; i++) {
        if (changedIds.includes(recipe.data().ingredientIds[i])) {
          recipeData.ingredientTypes[i] = changedTypes[changedIds.indexOf(recipe.data().ingredientIds[i])];
        }
      } 
          
      // change it in the db
      batch.update(doc(db, 'RECIPES', recipe.id), recipeData);
    })

    // updates spotlights with the new ingredient types
    spotlightSnapshot.docs.forEach((spotlight) => {
          
      // store the old data
      let spotlightData = spotlight.data();

      // if the current spotlight's current ingredient has been changed, update it
      for (let i = 0; i < 12; i++) {
        if (changedIds.includes(spotlight.data().ingredientIds[i])) {
          spotlightData.ingredientTypes[i] = changedTypes[changedIds.indexOf(spotlight.data().ingredientIds[i])];
        }
      }
          
      // change it in the db
      batch.update(doc(db, 'SPOTLIGHTS', spotlight.id), spotlightData);
    })

    // batches the changes and closes the modal
    await batch.commit();
    closeModal();
  }

  
  ///////////////////////////////// HTML /////////////////////////////////
  
  return (

    <Modal
      transparent={true}
      animationType="slide"
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View className="flex-1 justify-center items-center">

        {/* Background Overlay */}
        <View className="absolute bg-black opacity-50 w-full h-full"/>
        
        {/* Modal Content */}
        <View className="flex w-4/5 py-5 px-2 bg-zinc200 rounded-xl border-[1px] border-zinc-400">
          
          {/* HEADER */}
          <View className="flex flex-row justify-between px-4">

            {/* title */}
            <Text className="font-bold text-[16px] text-center text-black">
              INGREDIENT TYPES
            </Text>

            
            {/* Buttons */}
            <View className="flex flex-row justify-center items-center ml-auto">

              {/* check (submit) */}
              <Icon 
                size={24}
                color="black"
                name="checkmark"
                onPress={submitModal}
              />

              {/* X (close) */}
              <Icon 
                size={24}
                color="black"
                name="close-outline"
                onPress={() => setModalVisible(false)}
              />
            </View>
          </View>

            
          {/* Divider */}
          <View className="h-[1px] bg-zinc400 m-2 mb-4"/>


          {/* FILTERING SECTION */}
          <View className="flex flex-row h-[12%] px-5 space-x-2 justify-center items-center">
          
            {/* Ingredient Filtering */}
            <View className="flex flex-row w-[45%] h-full items-center">
    
              {/* filter input */}
              <View className="flex bg-white w-full border-0.5 h-full border-zinc500 rounded-md p-2 justify-center items-center">
                <TextInput
                  className="mb-1 text-center text-[14px] leading-[17px]"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="search for ingredient"
                  placeholderTextColor={colors.zinc400}
                  multiline={true}
                  blurOnSubmit={true}
                />
              </View>
    
              {/* clear button */}
              <View className="absolute right-0.5 bottom-0.5 flex flex-row">
                <Icon 
                  size={20}
                  color="black"
                  name="close-outline"
                  onPress={() => setSearchQuery("")}
                />
              </View>
            </View>
            
            {/* Filter Type Picker */}
            <View className="flex flex-col justify-center items-center h-full w-[55%] z-50 mt-0.5">
              <View className="flex bg-zinc600 w-11/12 pb-1 rounded-lg">

                {/* Custom Section Header */}
                <View className="flex flex-row justify-between items-center pl-2 pr-1 py-1">

                  {/* text */}
                  <Text className="text-white font-semibold text-[13px] pt-0.5">
                    {showCustomType ? "CUSTOM" : showEditType ? filterType : "TYPE LIST"}
                  </Text>

                  {/* button */}
                  {!showEditType &&
                    <Icon
                      name={showCustomType ? "close-circle" : "add-circle"}
                      color="white"
                      size={18}
                      onPress={() => setShowCustomType(!showCustomType)}
                    />
                  }
                </View>

                {/* DETAILS -- three choices */}
                <View className="flex flex-row w-full h-[25px] justify-center items-center border-2 border-zinc600 rounded-b-lg">
                { showCustomType
                ? // adding custom type
                  <>
                    {/* inputting a new type */}
                    <View className="flex justify-center w-full h-[25px] mt-0.5 pl-2 pr-6 pb-1 bg-theme200 rounded-b-md">
                      <TextInput
                        placeholder="Custom Type"
                        placeholderTextColor={colors.zinc500}
                        className="text-[12px] leading-[14px] text-center"
                        value={customType}
                        onChangeText={setCustomType}
                        multiline={true}
                        blurOnSubmit={true}
                      />
                    </View>

                    {/* submitting it with a + Button */}
                    <View className="absolute right-1 flex h-full pt-0.5 justify-center items-center">
                      <Icon
                        size={18}
                        name={'add'}
                        color={colors.zinc700}
                        onPress={addCustomType}
                      />
                    </View>
                  </>

                : showEditType
                ? // editing a type
                  <>
                    {/* inputting a change */}
                    <View className="flex justify-center w-full h-[25px] mt-0.5 pl-2 pr-6 pb-1 bg-theme200 rounded-b-md">
                      <TextInput
                        placeholder="Edit Type"
                        placeholderTextColor={colors.zinc500}
                        className="text-[12px] leading-[14px] text-center"
                        value={editType}
                        onChangeText={setEditType}
                        multiline={true}
                        blurOnSubmit={true}
                      />
                    </View>

                    {/* submitting it with a check Button */}
                    {editType !== "" 
                    ? // if it is not empty, can submit
                      <View className="absolute right-1 flex h-full pt-0.5 justify-center items-center">
                        <Icon
                          size={18}
                          name="checkmark"
                          color={colors.zinc700}
                          onPress={editFilteredType}
                        />
                      </View>
                    : // if it is empty, cannot
                      <View className="absolute right-1 flex h-full pt-0.5 justify-center items-center">
                        <Icon
                          size={18}
                          name="remove"
                          color={colors.zinc700}
                        />
                      </View>
                    }
                  </>

                : // normal list (picker) of types 
                  <View className="flex w-full z-50 items-center">

                    {/* current selection part */}
                    <TouchableOpacity 
                      className="flex flex-row w-full h-[25px] rounded-b-md bg-theme200 border-0.5 border-theme400 justify-center items-center bottom-[-1.5px] px-2"
                      onPress={() => setTypeDropdownOpen(!typeDropdownOpen)}
                    >
                      {/* text */}
                      <Text className="text-zinc800 font-semibold text-[11px] text-center pr-3">
                        {filterType}
                      </Text>

                      {/* arrow */}
                      <View className="absolute flex right-2">
                        <Icon 
                          size={14} 
                          color="black" 
                          name={typeDropdownOpen ? "chevron-up" : "chevron-down"} 
                        />
                      </View>
                    </TouchableOpacity>
                    
                    {/* mock DropDownPicker */}
                    {typeDropdownOpen && (
                      <View className="absolute z-50 max-h-[175px] w-full bg-white mt-[25px] border-[1px] border-zinc600 rounded-b-md">
                        <ScrollView>
                          {typeList.map((item, index) => (
                            <TouchableOpacity
                              key={index}
                              className={`border-b-0.5 ${item.label === filterType && "bg-zinc100"} border-zinc350 px-4 py-2`}
                              onPress={() => {
                                setFilterType(item.value === "CUSTOM" ? "" : item.value);
                                setTypeDropdownOpen(false);
                              }}
                            >
                              {/* label */}
                              <Text className={`text-[11px] font-semibold ${item.label === "CUSTOM" ? "text-theme600 italic" : "text-zinc800"}`}>
                                {item.label === "CUSTOM" ? "no type" : item.label}
                              </Text>

                              {/* selected indicator */}
                              {item.label === filterType &&
                              <View className="absolute flex justify-center items-center h-[30px] right-1">
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
                  </View>
                }
                </View>
              </View>
              
              {/* BUTTONS */}
              <View className="pt-1 flex flex-row justify-center w-5/6 items-center">

                {/* Filter By Type */}
                <View className="flex flex-row space-x-1 justify-center">
                  {/* checkbox */}
                  <Icon
                    name={filterByType ? "checkbox" : "square-outline"}
                    color={colors.zinc500}
                    size={14}
                    onPress={() => setFilterByType(!filterByType)}
                  />
                  {/* text */}
                  <Text className="text-zinc800 italic text-[11.5px]">
                    filter by type
                  </Text>
                </View>

                {/* Edit Type */}
                <View className="pl-4">
                  <Icon
                    name={showEditType ? "backspace" : "create"}
                    color={colors.theme700}
                    size={showEditType ? 18 : 16}
                    onPress={() => openEditType()}
                  />
                </View>
              </View>
            </View>
          </View>
            

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mx-3 my-4"/>

            
          {/* TYPE SELECTION */}
          <View className="flex-row w-full px-5 mb-2 h-[30px]">

            {/* Text */}
            <View className="flex w-[45%] h-[30px] bg-zinc100 items-center justify-center border-l-[1.5px] border-y-[1.5px] border-zinc350">
              <Text className="text-[11px] text-center font-bold text-theme600">
                TYPE TO TOGGLE:
              </Text>
            </View>

            {/* Type Picker */}
            <View className="flex w-[55%] bg-zinc300 h-[30px]">
              <Picker
                selectedValue={selectedType}
                onValueChange={setSelectedType}
                style={{ height: 30, justifyContent: 'center', overflow: 'hidden', marginHorizontal: -10, }}
                itemStyle={{ textAlign: 'center', fontSize: 12, fontStyle: "italic", fontWeight: "bold", }}
              >
                {typeList.map((item) => (
                  <Picker.Item
                    key={item.value}
                    label={item.label === "CUSTOM" ? "no type selected" : item.label}
                    value={item.value}
                    color={item.label === "CUSTOM" ? colors.theme800 : "black"}
                  />
                ))}
              </Picker>
            </View>
          </View>


          {/* MAP OF INGREDIENTS */}
          <ScrollView
            vertical
            scrollEventThrottle={16}
            contentContainerStyle={{ flexDirection: 'column' }}
            className="flex border-4 border-zinc300 bg-zinc300 mx-4 my-2 h-1/2"
          >
            {filteredData.map((ingredient, index) => (
              <View key={index} className="flex mb-2">

                {/* ingredient name */}
                <View className={`flex py-1 px-2 border-b-0.5 ${index % 2 === 0 ? "bg-theme300 border-b-zinc600" : "bg-theme400 border-b-zinc700"}`}>
                  <Text className="text-[12.5px] text-black font-medium">
                    {ingredient.ingredientName}
                  </Text>
                </View>

                {/* ingredient types */}
                <View className={`flex flex-row py-1 px-2 ${index % 2 === 0 ? "bg-zinc450" : "bg-zinc500"}`}>
                  <Text className="text-[9px] text-white italic font-semibold">
                    {ingredient.ingredientTypes.sort((a, b) => a.localeCompare(b)).join(", ").toUpperCase()}
                  </Text>

                  {/* BUTTONS */}
                  {selectedType !== "" && selectedType !== "CUSTOM" &&
                    <View className="flex flex-row absolute right-0.5 py-0.5">

                      {/* add (if not already included) */}
                      {!ingredient.ingredientTypes.includes(selectedType) &&
                        <Icon
                          name="add"
                          color="white"
                          size={14}
                          onPress={() => addIngredientType(ingredient.id)}
                        />
                      }

                      {/* remove (if already included) */}
                      {ingredient.ingredientTypes.includes(selectedType) &&
                        <Icon
                          name="close-outline"
                          color="white"
                          size={14}
                          onPress={() => removeIngredientType(ingredient.id)}
                        />
                      }
                    </View>
                  }
                </View>
              </View>
            ))}
          </ScrollView>


          {/* TO VIEW CHANGED INGREDIENTS */}
          <View className="flex flex-row mt-3 justify-center items-center space-x-2 bg-zinc100 border-[1px] border-zinc300 py-1 mx-10">
            
            {/* Text Prompt */}
            <Text className="italic text-zinc500 text-[12px]">
              only show modified ingredients
            </Text>

            {/* Checkbox Button */}
            <Icon
              name={showModOnly ? "checkbox" : "square-outline"}
              color={colors.zinc450}
              size={16}
              onPress={() => setShowModOnly(!showModOnly)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ModTypeModal;