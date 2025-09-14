///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect, useRef } from 'react';

// UI components
import { Modal, View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// initialize firebase app
import { getFirestore, doc, writeBatch } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const ModNameModal = ({ 
  modalVisible, setModalVisible, closeModal, 
  initialType, initialTypeList, initialQuery, 
  ingredientsSnapshot, recipeSnapshot, spotlightSnapshot
}) => {


  ///////////////////////////////// ON OPEN /////////////////////////////////

  const [typeList, setTypeList] = useState([]);

  // stores given data on open
  useEffect(() => {
    if (modalVisible) {
      storeData();

      // stores intial type in both spots
      if (initialType !== "-" && initialType !== "") {
        setFilterType(initialType);
      }
    }
  }, [modalVisible]);  

  const [ingredients, setIngredients] = useState(null);
  const [oldIngredients, setOldIngredients] = useState(null);

  // to put the initial (provided) data in states
  const storeData = () => {
 
    // stores the ingredient snapshot as a map of data
    let ingredients = ingredientsSnapshot.docs.map((ingredient) => {
      return {
        id: ingredient.id,    
        ...ingredient.data(),  
      };
    });

    setIngredients(ingredients);
    setOldIngredients(ingredients);

    // stores the initial data
    setTypeList([{"label": "all types", "value": ""}, ...initialTypeList]);
    setSearchQuery(initialQuery);

    // initial filter
    filterIngredientData(ingredients, initialQuery, "", false);
  }
  
  
  ///////////////////////////////// FILTERING /////////////////////////////////
    
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');     

  const [filterType, setFilterType] = useState("all types");
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  const [showModOnly, setShowModOnly] = useState(false);

    // filters data based on query
  const filterIngredientData = async (dataToUse, queryToUse, typeToUse, filterChanged) => {
    
    // filters by changed data only
    if (filterChanged) {
    
      // filters by changed
      dataToUse = dataToUse.filter((oldIngredient) => {
        return oldIngredients.some((newIngredient) => 
          newIngredient.id === oldIngredient.id &&
          oldIngredient.ingredientName !== newIngredient.ingredientName
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
    if (typeToUse !== "all types") {
      dataToUse = dataToUse.filter((ingredient) =>
        ingredient.ingredientTypes.includes(typeToUse)
      )
    }
    
    // sets the filtered data in the state
    setFilteredData(dataToUse);
  }

  // refilters when certain aspects change
  useEffect(() => {
    filterIngredientData(ingredients, searchQuery, filterType, showModOnly);
  }, [ingredients, filterType, searchQuery, showModOnly])

  // for the checkbox under types
  const [filterMatch, setFilterMatch] = useState(false);

  // when changing the filter match
  useEffect(() => {
    if (filterMatch) {
      setSearchQuery(oldValue);
    }
  }, [filterMatch])

  
  ///////////////////////////////// CHANGING TEXT /////////////////////////////////

  const [oldValue, setOldValue] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  // when submitting an edit
  const submitEdit = () => {
    let newIngredients = ingredients;
  
    // adds the new type to the ingredient with the given id
    newIngredients = newIngredients.map((ingredient) => {
      if (ingredient.id === editingId) {
        return {
          ...ingredient,
          ingredientName: editingValue,
        };
      }
      return ingredient;
    });

    // stores the new data
    setIngredients(newIngredients);

    // skips to the new value
    setChangedIds([editingId]);
    setEditingId(null);
    setEditingValue("");
  }

  // when a type is to be added to an ingredient
  const swapOne = (id) => {
    let newIngredients = ingredients;
  
    // adds the new type to the ingredient with the given id
    newIngredients = newIngredients.map((ingredient) => {
      if (ingredient.id === id) {
        return {
          ...ingredient,
          ingredientName: ingredient.ingredientName.replace(oldValue, newValue),
        };
      }
      return ingredient;
    });

    // stores the new data
    setIngredients(newIngredients);

    // skips to the new value
    setChangedIds([id]);
  }

  // when a type is to be added to all ingredients under the current filter
  const swapAll = () => {
    let newIngredients = ingredients;
    let ids = [];

    // loops over all filtered data
    filteredData.map((data) => {
  
      // adds the new type to the ingredient with the given id
      newIngredients = newIngredients.map((ingredient) => {
        if (ingredient.id === data.id && ingredient.ingredientName.includes(oldValue)) {
          ids.push(ingredient.id);

          return {
            ...ingredient,
            ingredientName: ingredient.ingredientName.replace(new RegExp(oldValue, 'g'), newValue),
          };
        }
        return ingredient;
      });
    })

    // stores the new data
    setIngredients(newIngredients);

    // skips to the new value
    setChangedIds(ids);
  }
  

  ///////////////////////////////// SCROLLING /////////////////////////////////
  
  // vertical scroll syncing
  const verticalScrollRef = useRef(null);

  // marking changed ids
  const [changedIds, setChangedIds] = useState(null);

  // jumps to the correct index
  useEffect(() => {
    if (changedIds?.length > 0) {
      const scrollY = filteredData.findIndex(item => item.id === changedIds[0]) * 45;
      if (verticalScrollRef.current) { verticalScrollRef.current.scrollTo({ y: scrollY, animated: false }); }
    }
  }, [filteredData, changedIds])


  ///////////////////////////////// SUBMITTING MODAL /////////////////////////////////
  
  // when the checkmark is clicked to submit changes
  const submitModal = async () => { 
    setModalVisible(false);

    // creates a batch to update ingredients, recipes, and spotlights
    const batch = writeBatch(db);

    // to collect the ids that change and their corresponding names
    const changedIds = [];
    const changedNames = [];

    // recollects the initial ingredients
    const oldIngredientsMap = new Map(ingredientsSnapshot.docs.map(doc => [doc.id, doc.data()]));

    // loops over the current ingredients
    ingredients.forEach((newIngredient) => {

      // if the current ingredient is found
      const oldIngredient = oldIngredientsMap.get(newIngredient.id);
      if (oldIngredient) {

        // compares their names
        const oldName = oldIngredient.ingredientName;
        const newName = newIngredient.ingredientName;
        
        // if they don't match, update the ingredient in the db and store the changes in the arrays
        if (oldName !== newName) {
          batch.update(doc(db, 'INGREDIENTS', newIngredient.id), { ingredientName: newName });
          changedIds.push(newIngredient.id);
          changedNames.push(newName);
        }
      }
    });

    // updates recipes with the new ingredient types
    recipeSnapshot.docs.forEach((recipe) => {
          
      // store the old data
      let recipeData = recipe.data();
      let changedRecipe = false;

      // if the current recipe's current ingredient has been changed, update it
      for (let i = 0; i < 12; i++) {
        if (changedIds.includes(recipe.data().ingredientIds[i])) {
          changedRecipe = true;
          recipeData.ingredientNames[i] = changedNames[changedIds.indexOf(recipe.data().ingredientIds[i])];
        }
      } 
          
      // change it in the db
      if (changedRecipe) { batch.update(doc(db, 'RECIPES', recipe.id), recipeData); }
    })

    // updates spotlights with the new ingredient types
    spotlightSnapshot.docs.forEach((spotlight) => {
          
      // store the old data
      let spotlightData = spotlight.data();
          let changedSpotlight = false;

      // if the current spotlight's current ingredient has been changed, update it
      for (let i = 0; i < 12; i++) {
        if (changedIds.includes(spotlight.data().ingredientIds[i])) {
          changedSpotlight = true;
          spotlightData.ingredientNames[i] = changedNames[changedIds.indexOf(spotlight.data().ingredientIds[i])];
        }
      }
          
      // change it in the db
      if (changedSpotlight) { batch.update(doc(db, 'SPOTLIGHTS', spotlight.id), spotlightData); }
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
              INGREDIENT NAMES
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
                  className="w-full mb-1 text-center text-[14px] leading-[17px]"
                  value={searchQuery}
                  onChangeText={(value) => {
                    if (value !== oldValue) { setFilterMatch(false); }
                    setSearchQuery(value);
                    setEditingId(null);
                  }}
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
                  onPress={() => {
                    if ("" !== oldValue) { setFilterMatch(false); }
                    setSearchQuery("");
                    setEditingId(null);
                  }}
                />
              </View>
            </View>
            
            {/* Filter Type Picker */}
            <View className="flex flex-col justify-center items-center h-full w-[55%] z-50 mt-0.5">
              <View className="flex bg-zinc600 w-11/12 pb-1 rounded-lg">
                <View className="flex flex-row justify-between items-center pl-2 pr-1 py-1">

                  {/* text */}
                  <Text className="text-white font-semibold text-[13px] pt-0.5">
                    TYPE
                  </Text>
                </View>

                {/* DETAILS */}
                <View className="flex flex-row w-full h-[25px] justify-center items-center border-2 border-zinc600 rounded-b-lg">
                  <View className="flex w-full z-50 items-center">

                    {/* current selection part */}
                    <TouchableOpacity 
                      className="flex flex-row w-full h-[25px] rounded-b-md bg-theme200 border-0.5 border-theme400 justify-center items-center bottom-[-1.5px] px-2"
                      onPress={() => setTypeDropdownOpen(!typeDropdownOpen)}
                    >
                      {/* text */}
                      <Text className="text-zinc800 font-semibold text-[11px] text-center pr-3">
                        {filterType === "" ? "no type" : filterType}
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
                              className={`border-b-0.5 ${(item.label === filterType) && "bg-zinc100"} border-zinc350 px-4 py-2`}
                              onPress={() => {
                                setFilterType(item.value === "CUSTOM" ? "" : item.value);
                                setTypeDropdownOpen(false);
                              }}
                            >
                              {/* label */}
                              <Text className={`text-[11px] font-semibold ${item.label === "all types" ? "italic text-theme800" : item.label === "CUSTOM" ? "text-theme600 italic" : "text-zinc800"}`}>
                                {item.label === "CUSTOM" ? "no type" : item.label}
                              </Text>

                              {/* selected indicator */}
                              {(item.label === filterType) && (
                                <View className="absolute flex justify-center items-center h-[30px] right-1">
                                  <Icon
                                    name="checkmark"
                                    color="black"
                                    size={18}
                                  />
                                </View>
                              )}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>
              </View>
                            
              {/* BUTTONS */}
              <View className="pt-1 flex flex-row justify-center w-5/6 items-center">

                {/* Filter By Match */}
                <View className="flex flex-row space-x-1 justify-center">
                  {/* checkbox */}
                  <Icon
                    name={filterMatch ? "checkbox" : "square-outline"}
                    color={colors.zinc500}
                    size={14}
                    onPress={() => setFilterMatch(!filterMatch)}
                  />
                  {/* text */}
                  <Text className="text-zinc800 italic text-[11.5px]">
                    filter by text match
                  </Text>
                </View>
              </View>
            </View>
          </View>
            

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mx-3 my-4"/>

          {/* KEYWORD CHANGE */}
          <View className="flex flex-row w-full justify-center items-center space-x-2 px-5 pb-4">

            {/* old value input */}
            <TextInput 
              value={oldValue}
              onChangeText={(value) => {
                if (filterMatch) { setSearchQuery(value); }
                setOldValue(value);
              }}
              placeholder="original"
              placeholderTextColor={colors.zinc450}
              className={`text-[13px] w-5/12 bg-zinc300 text-center py-2 px-1 rounded-md border border-zinc100 ${(oldValue === "") && "italic"}`}
              multiline={true}
              blurOnSubmit={true}
            />
            
            {/* change all button */}
            <Icon
              name="shuffle"
              size={20}
              color={colors.zinc900}
              onPress={() => swapAll()}
            />

            {/* new value input */}
            <TextInput 
              value={newValue}
              onChangeText={setNewValue}
              placeholder="new"
              placeholderTextColor={colors.zinc450}
              className={`text-[13px] w-5/12 bg-zinc300 text-center py-2 px-1 rounded-md border border-zinc100 ${(oldValue === "") && "italic"}`}
              multiline={true}
              blurOnSubmit={true}
            />
          </View>


          {/* MAP OF INGREDIENTS */}
          <ScrollView
            vertical
            ref={verticalScrollRef}
            scrollEventThrottle={16}
            contentContainerStyle={{ flexDirection: 'column' }}
            className="flex border-4 border-zinc300 bg-zinc300 mx-4 mb-2 h-1/2"
          >
            {filteredData.map((ingredient, index) => (
              <View key={index} className="flex flex-col">
                <View className={`flex flex-row w-full mb-2 min-h-[35px] ${editingId === ingredient.id ? "bg-zinc500" : index % 2 === 0 ? (changedIds?.includes(ingredient.id) ? "bg-mauve400 border-b-zinc600" : "bg-theme300 border-b-zinc600") : (changedIds?.includes(ingredient.id) ? "bg-mauve300 border-b-zinc600" : "bg-theme400 border-b-zinc700")}`}>
                    
                  {/* current */}
                  <View className="flex-1 py-1 px-2 justify-center">
                    {editingId === ingredient.id 
                    ? // editing
                      <TextInput
                        value={editingValue}
                        onChangeText={setEditingValue}
                        className="text-left text-[12.5px] leading-[14px] font-medium text-white italic"
                        multiline={true}
                        blurOnSubmit={true}
                      />
                    : // viewing
                      <Text className="text-left text-[12.5px] font-medium text-black">
                        {ingredient.ingredientName}
                      </Text>
                    }
                  </View>

                  {/* BUTTONS */}
                  <View className={`flex flex-row py-2 px-2 space-x-1 justify-center items-center ${index % 2 === 0 ? "bg-zinc400 border-b-zinc600" : "bg-zinc450 border-b-zinc700"}`}>

                    {/* apply above change */}
                    {((oldValue !== "" && ingredient.ingredientName.includes(oldValue)) && editingId === null) && (
                      <Icon
                        name="shuffle"
                        color={colors.zinc900}
                        size={18}
                        onPress={() => swapOne(ingredient.id)}
                      />
                    )}

                    {/* edit name change */}
                    { (editingId === null)
                    ? // if no ingredient is selected
                      <Icon
                        name="pencil"
                        color={colors.zinc800}
                        size={16}
                        onPress={() => {setEditingId(ingredient.id); setEditingValue(ingredient.ingredientName)}}
                      />
                    : // if ingredient is selected 
                      (editingId === ingredient.id) && (
                        <View className="flex flex-row space-x-1 justify-center items-center">
                          {/* submit */}
                          <Icon
                            name="checkmark-done"
                            color={colors.zinc900}
                            size={20}
                            onPress={() => submitEdit()}
                          />
                          {/* close */}
                          <Icon
                            name="chevron-collapse-outline"
                            color={colors.zinc900}
                            size={20}
                            onPress={() => {setEditingId(null); setEditingValue("")}}
                          />
                        </View>
                      )
                    }
                  </View>
                </View>
                
                {(showModOnly || editingId === ingredient.id)
                ? // when showing the modified version 
                  <View className={`flex flex-row mt-[-8px] mb-[12px] py-1 px-2 ${editingId === ingredient.id ? "bg-mauve800" : index % 2 === 0 ? "bg-zinc450" : "bg-zinc500"}`}>
                    <Text className="text-[11px] text-white italic font-semibold">
                      {oldIngredients.find(old => old.id === ingredient.id)?.ingredientName}
                    </Text>
                  </View>
                : (ingredient.ingredientName.includes(oldValue) && oldValue !== "") && (
                  // when showing what oldValue would replace to
                  <View className={`flex flex-row mt-[-8px] mb-[12px] py-1 px-2 ${index % 2 === 0 ? "bg-zinc450" : "bg-zinc500"}`}>
                    <Text className="text-[11px] text-white italic font-semibold">
                      {ingredient.ingredientName.replace(new RegExp(oldValue, 'g'), newValue)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>


          {/* TO VIEW CHANGED INGREDIENTS */}
          <View className="flex flex-row mt-3 justify-center items-center mx-3 space-x-4">
            
            {/* filtering for modified */}
            <View className="flex-1 flex-row justify-center space-x-2 px-3 bg-zinc100 border-[1px] border-zinc300 py-1">
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

            {/* number of ingredients shown */}
            <Text className="w-[50px] text-[12px] text-center font-semibold text-theme700">
              {filteredData.length}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ModNameModal;