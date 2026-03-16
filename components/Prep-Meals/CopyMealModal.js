///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect, useRef } from 'react';

// UI components
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, FlatList } from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// validation
import extractUnit from '../../components/Validation/extractUnit';
import { deepPrepIndexOf } from '../Validation/deepPrepSearch';


///////////////////////////////// SIGNATURE /////////////////////////////////

const CopyMealModal = ({ 
  type, snapshot, modalVisible, setModalVisible, closeModal,
}) => {


  ///////////////////////////////// ON OPEN /////////////////////////////////

  // loads data on open
  useEffect(() => {
    if (modalVisible) {
      loadPreps( snapshot?.docs.map(doc => ({ id: doc.id, data: doc.data()})), "" );
    }
  }, [modalVisible]);

  // getting DB data
  const [uniquePrepIds, setUniquePrepIds] = useState(null);
  const [uniquePrepNames, setUniquePrepNames] = useState(null);
  const [uniquePrepData, setUniquePrepData] = useState(null);


  // gets the collection of meal preps
  const loadPreps = async (currSnapshot, name) => {

    // to get the unique list of preps
    let prepNames = [];
    let prepIds = [];
    let prepData = [];


    // loops through all the plans
    currSnapshot.map((plan) => {
      

      // LUNCH PREPS
      if (plan.data.meals.lunch.prepData) {
        const lunchNameIndex = prepNames.indexOf(plan.data.meals.lunch.prepData.prepName);

        // completely new
        if (lunchNameIndex === -1) {
          prepNames.push(plan.data.meals.lunch.prepData.prepName); 
          prepIds.push([plan.data.meals.lunch.prepId]);
          prepData.push([plan.data.meals.lunch.prepData]); 

        // otherwise - exact match or alternate found
        } else {
          const lunchDataIndex = deepPrepIndexOf(prepData[lunchNameIndex], plan.data.meals.lunch.prepData);

          // alternative found
          if (lunchDataIndex === -1) {
            prepIds[lunchNameIndex].push(plan.data.meals.lunch.prepId);
            prepData[lunchNameIndex].push(plan.data.meals.lunch.prepData);
          }
        }
      }

      // DINNER PREPS
      if (plan.data.meals.dinner.prepData) {
        const dinnerNameIndex = prepNames.indexOf(plan.data.meals.dinner.prepData.prepName);

        // completely new
        if (dinnerNameIndex === -1) {
          prepNames.push(plan.data.meals.dinner.prepData.prepName); 
          prepIds.push([plan.data.meals.dinner.prepId]);
          prepData.push([plan.data.meals.dinner.prepData]); 

        // otherwise - exact match or alternate found
        } else {
          const dinnerDataIndex = deepPrepIndexOf(prepData[dinnerNameIndex], plan.data.meals.dinner.prepData);

          // alternative found
          if (dinnerDataIndex === -1) {
            prepIds[dinnerNameIndex].push(plan.data.meals.dinner.prepId);
            prepData[dinnerNameIndex].push(plan.data.meals.dinner.prepData);
          }
        }
      }
    })
    
    // combined data to sort
    let combined = prepNames.map((name, index) => ({
      name: name,
      id: prepIds[index],
      data: prepData[index],
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(prep => {
      const filtered = prep.id
        .map((id, i) => ({ id, data: prep.data[i],  match: matchesTypeFilter(type, true, id), }))
        .filter(item => item.match);
      return { ...prep, id: filtered.map(f => f.id), data: filtered.map(f => f.data), };
    })
    .filter(prep => prep.id.length > 0);
    
    // stores extracted, sorted values
    setUniquePrepNames(combined.map(item => item.name));
    setUniquePrepIds(combined.map(item => item.id));
    setUniquePrepData(combined.map(item => item.data));
    
    setFilteredPrepNames(combined.map(item => item.name));
    setFilteredPrepIds(combined.map(item => item.id));
    setFilteredPrepData(combined.map(item => item.data));
    
    // filters based on given argument
    const filtered = filterPreps(keywordType, prepKeywordQuery, "", prepRestaurantFilter,
      combined.map(item => item.name), combined.map(item => item.id), combined.map(item => item.data)
    );

    // scrolls to change if applicable
    const idx = filtered.indexOf(name);
    if (idx !== -1) { 
      setTimeout(() => {
        verticalScrollRef.current?.scrollToIndex({ index: idx, animated: false }); 
      }, 1000);
    }
  }


  ///////////////////////////////// DETAILS /////////////////////////////////

  const [openPrepIndex, setOpenPrepIndex] = useState(-1);
  const [openSimpleIndex, setOpenSimpleIndex] = useState(-1);
  const [openComplexIndex, setOpenComplexIndex] = useState(-1);

  const [copyName, setCopyName] = useState(false);


  ///////////////////////////////// SEARCH SECTION /////////////////////////////////

  const [currIndex, setCurrIndex] = useState(0);
  const [prepKeywordQuery, setPrepKeywordQuery] = useState("");
  const [prepTypeFilter, setPrepTypeFilter] = useState("");
  const [keywordType, setKeywordType] = useState("meal prep");
  const [prepRestaurantFilter, setPrepRestaurantFilter] = useState("bag-outline");

  const [filteredPrepNames, setFilteredPrepNames] = useState(null);
  const [filteredPrepIds, setFilteredPrepIds] = useState(null);
  const [filteredPrepData, setFilteredPrepData] = useState(null);

  // helper function for type filtering
  const matchesTypeFilter = (typeFilter, initial, id) => {
    return (
      typeFilter === "" ||
      (typeFilter === "currents" && !(id.includes("LUNCH") || id.includes("DINNER") || id.includes("."))) ||
      (typeFilter === "complex" && (initial ? !(id.includes("LUNCH") || id.includes("DINNER")) : id.includes("."))) ||
      (typeFilter === "simple" && (id.includes("LUNCH") || id.includes("DINNER")))
    );
  };
  
  // to filter the list of preps in the search section
  const filterPreps = (keyword, searchQuery, typeFilter, restaurantFilter, uniqueNames, uniqueIds, uniqueData) => {
    setPrepKeywordQuery(searchQuery);
    setPrepTypeFilter(typeFilter);
    setPrepRestaurantFilter(restaurantFilter);
    setOpenPrepIndex(-1);
    setOpenSimpleIndex(-1);
    setOpenComplexIndex(-1);
    setCurrIndex(0);

    // to get the unique list of preps
    let prepNames = [];
    let prepIds = [];
    let prepData = [];

    // helper function for keyword & restaurant filtering
    const matchesKeywordFilter = (i, index) => {
      // meal prep keyword - checks the meal prep name
      if (keyword === "meal prep") {
        return (
          // restaurant
          (restaurantFilter === "bag-add" ? uniquePrepNames[index].includes(":") 
            : restaurantFilter === "bag-remove" ? !uniquePrepNames[index].includes(":") : true
          // keyword
          ) && searchQuery.split(" ").every(word => uniquePrepNames[index].toLowerCase().includes(word.toLowerCase()))
        );
      }
      // ingredient keyword - checks each ingredient's name
      if (keyword === "ingredient") {
        return (
          // restaurant
          (restaurantFilter === "bag-add" ? uniquePrepNames[index].includes(":") 
            : restaurantFilter === "bag-remove" ? !uniquePrepNames[index].includes(":") : true
          // keyword
          ) && uniquePrepData[index][i]?.currentData?.some(current =>
                searchQuery.split(" ").every(word => current?.ingredientName?.toLowerCase().includes(word.toLowerCase())))
        );
      }
      // otherwise
      return false;
    };

    // adds the data to the prep lists that matches the filtering
    uniqueNames.map((name, index) => {
      
      // if the type and keywords match
      if (uniqueIds[index].some((id, i) => matchesTypeFilter(typeFilter, false, id) && matchesKeywordFilter(i, index))) {
        // adds the name to the filtered names
        prepNames.push(name); 

        // uses type and keyword filtering for specific indices
        const keepIndices = uniqueIds[index]
          .map((id, i) => (matchesTypeFilter(typeFilter, false, id) && matchesKeywordFilter(i, index)) ? i : -1)
          .filter(i => i !== -1);

        // adds the data after filtering
        prepIds.push(keepIndices.map((i) => uniqueIds[index][i]));
        prepData.push(keepIndices.map((i) => uniqueData[index][i]));
      }
    })

    // stores the data
    setFilteredPrepNames(prepNames);
    setFilteredPrepIds(prepIds);
    setFilteredPrepData(prepData);

    return prepNames;
  }
      
    
  ///////////////////////////////// SCROLLING /////////////////////////////////
  
  // vertical scroll syncing
  const verticalScrollRef = useRef(null);


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
        <TouchableOpacity onPress={() => setModalVisible(false)} className="absolute bg-black opacity-50 w-full h-full"/>
        
        {/* Modal Content */}
        <View className="flex w-5/6 py-5 px-5 bg-zinc200 rounded-2xl z-50">

          {/* TITLE */}
          <View className="flex flex-row justify-between items-center px-2">
            <Text className="text-[20px] font-bold">
              MEAL PREP COPY
            </Text>
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>

          <View className="flex flex-col items-center justify-center">

            {/* RECIPE FILTERING SECTION */}
            <View className="flex flex-row w-full px-3 justify-between items-center mb-[20px]">
              <View className="flex flex-row w-[85%] justify-center items-center">

                {/* Keyword Type Selector */}
                {(type !== "simple") && (
                  <View className="bg-zinc300 px-1 py-1 rounded-l-md h-[30px] items-center justify-center">
                    <Icon
                      name={keywordType === "meal prep" ? "code-working" : keywordType === "ingredient" && "list"}
                      color={colors.zinc900}
                      size={20}
                      onPress={() => {
                        const keyword = keywordType === "meal prep" ? "ingredient" : "meal prep";
                        setKeywordType(keyword)
                        filterPreps(keyword, "", prepTypeFilter, prepRestaurantFilter, uniquePrepNames, uniquePrepIds, uniquePrepData)
                      }}
                    />
                  </View>
                )}

                {/* text input */}
                <TextInput
                  value={prepKeywordQuery}
                  onChangeText={(value) => filterPreps(keywordType, value, prepTypeFilter, prepRestaurantFilter, uniquePrepNames, uniquePrepIds, uniquePrepData)}
                  placeholder={`${keywordType} keyword(s)`}
                  placeholderTextColor={colors.zinc400}
                  className={`flex-1 w-5/6 bg-white ${(type === "simple") ? "rounded-md" : "rounded-r-md"} border-[1px] border-zinc300 pl-2.5 pr-10 py-1.5 text-[14px] leading-[17px]`}
                />
    
                {/* BUTTONS */}
                <View className="flex flex-row absolute right-1 h-[30px] items-center justify-center">

                  {/* type filtering */}
                  {(type !== "simple") && (
                    <Icon
                      name={prepTypeFilter === "currents" ? "information-circle" : prepTypeFilter === "complex" ? "stop-circle" : prepTypeFilter === "simple" ? "ellipse" : "ellipse-outline"}
                      color={colors.zinc700}
                      size={18}
                      onPress={() => filterPreps(keywordType, prepKeywordQuery, 
                        prepTypeFilter === "currents" ? "complex" : prepTypeFilter === "complex" ? "" : "currents", 
                        prepRestaurantFilter, uniquePrepNames, uniquePrepIds, uniquePrepData
                      )}
                    />
                  )}

                  {/* clear */}
                  <Icon
                    name="close-outline"
                    size={20}
                    color="black"
                    onPress={() => {
                      setPrepKeywordQuery("");
                      setOpenPrepIndex(-1);
                      setOpenComplexIndex(-1);
                      setOpenSimpleIndex(-1);
                      filterPreps(keywordType, "", prepTypeFilter, prepRestaurantFilter, uniquePrepNames, uniquePrepIds, uniquePrepData);
                    }}
                  />
                </View>
              </View>

              {/* Restaurant Indicator */}
              <View className="p-1 absolute right-2">
                <Icon
                  name={prepRestaurantFilter}
                  size={20}
                  color={colors.theme800}
                  onPress={() => filterPreps(keywordType, prepKeywordQuery, prepTypeFilter, 
                    prepRestaurantFilter === "bag-outline" ? "bag-add" : prepRestaurantFilter === "bag-add" ? "bag-remove" : prepRestaurantFilter === "bag-remove" && "bag-outline", 
                    uniquePrepNames, uniquePrepIds, uniquePrepData
                  )}
                />
              </View>
            </View>

            {/* Filtered List of Preps */}
            {(filteredPrepData?.length > 0)
            ?
              <FlatList
                className="max-h-[200px] bg-zinc500 border-2 border-zinc600 mb-3"
                ref={verticalScrollRef}
                data={filteredPrepData}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item: prep, index }) => (
                  <View className="flex flex-col items-center justify-center pb-2">
                    {/* GENERAL DETAILS */}
                    <View className="flex flex-row border-y-[1px] border-zinc600 w-full">

                      {/* info */}
                      {(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) && (
                        <View className="flex flex-col w-1/12 py-2 justify-center items-center bg-theme400">
                          <Icon
                            name="caret-back"
                            size={20}
                            color={colors.zinc800}
                            onPress={() => closeModal(prep[currIndex], copyName ? prep[currIndex].prepName : null)}
                          />
                        </View>
                      )}
                      
                      {/* Overall Name Display */}
                      <View className={`flex flex-row bg-theme300 p-2 space-x-2 h-full items-center justify-between ${(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? "w-2/3" : "w-11/12"}`}>
                        
                        {/* name */}
                        <View className="flex-1">
                          <Text className="text-left text-[13px] italic">
                            {filteredPrepNames[index]}
                          </Text>
                        </View>

                        {/* indicator of selected option */}
                        <TouchableOpacity 
                          onPress={() => {
                            setCurrIndex((openPrepIndex === index || openSimpleIndex === index || openComplexIndex === index) ? (currIndex + 1) % prep.length : currIndex); 
                            if ((openPrepIndex === index || openSimpleIndex === index || openComplexIndex === index)) {
                              setOpenSimpleIndex(
                                filteredPrepIds[index]?.[(currIndex + 1) % prep.length]?.includes("LUNCH") || filteredPrepIds[index]?.[(currIndex + 1) % prep.length]?.includes("DINNER") ? index : -1);
                              setOpenPrepIndex(
                                (filteredPrepIds[index]?.[(currIndex + 1) % prep.length]?.includes(".")) ? index : -1); 
                              setOpenComplexIndex(
                                !(filteredPrepIds[index]?.[(currIndex + 1) % prep.length]?.includes("LUNCH") || filteredPrepIds[index]?.[(currIndex + 1) % prep.length]?.includes("DINNER"))
                                  && !(filteredPrepIds[index]?.[(currIndex + 1) % prep.length]?.includes("."))
                                ? index : -1
                              );
                            }
                          }}
                          activeOpacity={!(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) && 1}
                        >
                          <Text className="text-[12px] font-semibold text-theme900">
                            {(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index)
                            ? `${currIndex + 1}/${prep.length}`
                            : `(${prep.length})`}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Cal & Price */}
                      {(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) && (
                        <View className="flex flex-col w-1/6 py-2 justify-center items-center bg-theme400">
                          <Text className="text-[10px] italic">
                            {`${prep?.[(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0].prepCal} cal`}
                          </Text>
                          <Text className="text-[10px] italic">
                            {`$${prep?.[(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0].prepPrice}`}
                          </Text>
                        </View>
                      )}

                      {/* open ingredients button */}
                      {(filteredPrepIds[index]?.[(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0]?.includes("LUNCH") 
                        || filteredPrepIds[index]?.[(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0]?.includes("DINNER")) 
                      ? // if simple custom
                        <View className="flex w-1/12 py-2 justify-center items-center bg-zinc350">
                          <Icon
                            name="ellipse"
                            color={colors.zinc400}
                            size={18}
                            onPress={() => {
                              setCurrIndex((openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0)
                              setOpenSimpleIndex(openSimpleIndex === index ? -1 : index)
                              setOpenComplexIndex(-1)
                              setOpenPrepIndex(-1)
                            }}
                          />
                        </View>
                      : (filteredPrepIds[index]?.[(openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0]?.includes("."))
                      ? // if complex custom
                        <View className="flex w-1/12 py-2 justify-center items-center bg-zinc350">
                          <Icon
                            name="stop-circle"
                            color={colors.zinc450}
                            size={20}
                            onPress={() => {
                              setCurrIndex((openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0)
                              setOpenComplexIndex(openComplexIndex === index ? -1 : index)
                              setOpenSimpleIndex(-1)
                              setOpenPrepIndex(-1)
                            }}
                          />
                        </View>
                      : // if original
                        <View className="flex w-1/12 py-2 justify-center items-center bg-zinc350">
                          <Icon
                            name="information-circle"
                            color={colors.zinc800}
                            size={20}
                            onPress={() => {
                              setCurrIndex((openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0)
                              setOpenPrepIndex(openPrepIndex === index ? -1 : index)
                              setOpenComplexIndex(-1)
                              setOpenSimpleIndex(-1)
                            }}
                          />
                        </View>
                      }
                    </View>

                    {/* COMPLEX DETAILS */}
                    {(openPrepIndex === index || openComplexIndex === index) && (
                      <View className="flex flex-row w-full">
                      {/* Ingredient List */}
                        <ScrollView className="flex w-full max-h-[110px] bg-zinc350">
                          {prep[currIndex].currentData.map((current, i) => 
                            current !== null && (
                              <View key={i} className="flex flex-row justify-center items-center border-b border-zinc400">

                                {/* INGREDIENT NAME */}
                                <View className="flex flex-1 justify-center items-center w-2/3 px-2 py-1 bg-zinc300">
                                  <Text className="text-zinc800 text-[11px] text-right pr-2 w-full py-1">
                                    {`${current.ingredientName}`}
                                  </Text>
                                </View>

                                {/* INGREDIENT DETAILS */}
                                <View className={`${(i === 0) && "pt-1"} ${(i === prep[currIndex].currentData.filter(curr => curr !== null).length - 1) && "pb-1"} py-1 px-2 flex flex-col w-1/3 justify-center items-center bg-zinc350`}>
                                  <Text className="text-theme900 font-medium text-[9px] text-center">
                                    {`${prep[currIndex].currentAmounts[i]} ${extractUnit(current.ingredientData[current.ingredientStore].unit, prep[currIndex].currentAmounts[i])}`}
                                  </Text>
                                  <View className="flex flex-row w-full justify-evenly items-center">
                                    <Text className="text-theme900 font-medium text-[9px] text-center">
                                      {`${(prep?.[currIndex]?.currentCals?.[i] || 0)?.toFixed(0)} cal`}
                                    </Text>
                                    {(prep[currIndex].currentPrices[i] !== "") && (
                                      <Text className="text-theme900 font-medium text-[9px] text-center">
                                        {`$${(prep?.[currIndex]?.currentPrices?.[i] || 0)?.toFixed(2)}`}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              </View>
                            )
                          )}
                        </ScrollView>
                      </View>
                    )}

                    {/* SIMPLE DETAILS */}
                    {(openSimpleIndex === index) && (
                      <View className={`flex flex-row w-full justify-center ${prep[currIndex]?.prepNote !== "" ? "bg-zinc200" : "bg-zinc300"}`}>

                        {/* Notes, if available */}
                        {(prep[currIndex]?.prepNote !== "") && (
                          <View className="flex w-2/3 px-1 py-1 bg-zinc200">
                            <Text className="text-zinc800 font-medium text-[11px] text-center">
                              {prep[currIndex]?.prepNote}
                            </Text>
                          </View>
                        )}
                        
                        {/* Details, if not empty */}
                        {(prep[currIndex]?.prepCal !== "0" || prep[currIndex]?.prepPrice !== "0.00") && (
                          <View className={`flex flex-row py-1 bg-zinc300 items-center ${prep[currIndex]?.prepNote !== "" ? "w-1/3 justify-evenly" : "space-x-5"}`}>
                            {/* total calories */}
                            <Text className="text-theme900 font-medium text-[11px] text-center">
                              {prep[currIndex]?.prepCal} {"cal"}
                            </Text>
                            {/* total price */}
                            <Text className="text-theme900 font-medium text-[11px] text-center">
                              {"$"}{prep[currIndex]?.prepPrice}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}
              />
            : 
              <View className="py-1 px-3 bg-zinc500 border-2 border-zinc600">
                <Text className="italic text-center text-white font-medium">
                  no meal preps match the current filter
                </Text>
              </View>
            }
          </View>

          {/* COPY NAME */}
          <View className="w-full flex flex-row justify-center bg-zinc300 py-1 border border-zinc350 mt-2 -mb-1 items-end space-x-1">
            <Icon
              name={copyName ? "checkbox" : "square-outline"}
              color={colors.zinc700}
              size={18}
              onPress={() => setCopyName(!copyName)}
            />
            <Text className="font-bold italic text-zinc900">
              COPY OVER NAME
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default CopyMealModal;