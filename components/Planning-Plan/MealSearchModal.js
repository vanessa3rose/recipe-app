///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';

import colors from '../../assets/colors';
import Icon from 'react-native-vector-icons/Ionicons';


///////////////////////////////// SIGNATURE /////////////////////////////////

const MealSearchModal = ({ 
  snapshot, modalVisible, setModalVisible, closeModal,
}) => {


  ///////////////////////////////// DEEP SEARCH /////////////////////////////////

  // recursively sorts the array by keys alphabetically
  const sortObjectKeys = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
    } else if (obj !== null && typeof obj === "object") {
        const sortedObj = {};
        Object.keys(obj).sort().forEach((key) => {
            sortedObj[key] = sortObjectKeys(obj[key]);
        });
        return sortedObj;
    }
    return obj;
  };

  // to get the index of the object from the array of arrays
  function deepIndexOf(arr, obj) {

    // loops over all objects in the array of arrays
    for (let i = 0; i < arr.length; i++) {
      if (JSON.stringify(sortObjectKeys(arr[i])) === JSON.stringify(sortObjectKeys(obj))) {
        return i;
      }
    }

    // returns -1 if the value isn't found
    return -1;
  }


  ///////////////////////////////// ON OPEN /////////////////////////////////

  // stores whether a prep is being edited on open
  useEffect(() => {
    if (modalVisible) {
      loadPreps();
    }
  }, [modalVisible]);

  // getting DB data
  const [uniquePrepIds, setUniquePrepIds] = useState(null);
  const [uniquePrepData, setUniquePrepData] = useState(null);
  const [uniquePrepDates, setUniquePrepDates] = useState(null);
  const [uniquePrepMeals, setUniquePrepMeals] = useState(null);


  // gets the collection of meal preps
  const loadPreps = async () => {

    // to get the unique list of preps
    let prepIds = [];
    let prepData = [];
    let prepDates = [];
    let prepMeals = [];
    
    // loops through all the plans
    snapshot.docs.map((plan) => {

      // LUNCH PREPS
      const lunchIndex = deepIndexOf(prepData, plan.data().meals?.lunch?.prepData);
      if (plan.data().meals.lunch.prepData !== null) {

        // new
        if ((!plan.data().meals.lunch.prepId.includes("LUNCH") && !prepIds.includes(plan.data().meals.lunch.prepId))
          || (plan.data().meals.lunch.prepId.includes("LUNCH") && lunchIndex === -1)
          || (!plan.data().meals.lunch.prepId.includes("LUNCH") && plan.data().meals.lunch.prepData.prepName !== prepData[prepIds.indexOf(plan.data().meals.lunch.prepId)].prepName)
        ) {
          prepIds.push(plan.data().meals.lunch.prepId); 
          prepData.push(plan.data().meals.lunch.prepData); 
          prepDates.push([plan.id]);
          prepMeals.push(["LUNCH"]);
        
        // existing meal prep
        } else if (!plan.data().meals.lunch.prepId.includes("LUNCH") && prepIds.includes(plan.data().meals.lunch.prepId)) {
          const index = prepIds.indexOf(plan.data().meals.lunch.prepId);
          prepDates[index] = [...prepDates[index], plan.id].flat();
          prepMeals[index] = [...prepMeals[index], "LUNCH"].flat();
        
        // existing custom prep
        } else if (plan.data().meals.lunch.prepId.includes("LUNCH") && lunchIndex !== -1) {
          prepDates[lunchIndex] = [...prepDates[lunchIndex], plan.id].flat();
          prepMeals[lunchIndex] = [...prepMeals[lunchIndex], "LUNCH"].flat();
        }
      }


      // DINNER PREPS
      const dinnerIndex = deepIndexOf(prepData, plan.data().meals.dinner.prepData);
      if (plan.data().meals.dinner.prepData !== null) {

        // new
        if ((!plan.data().meals.dinner.prepId.includes("DINNER") && !prepIds.includes(plan.data().meals.dinner.prepId))
          || (plan.data().meals.dinner.prepId.includes("DINNER") && dinnerIndex === -1)
          || (!plan.data().meals.dinner.prepId.includes("DINNER") && plan.data().meals.dinner.prepData.prepName !== prepData[prepIds.indexOf(plan.data().meals.dinner.prepId)].prepName)
        ) {
          prepIds.push(plan.data().meals.dinner.prepId); 
          prepData.push(plan.data().meals.dinner.prepData); 
          prepDates.push([plan.id]);
          prepMeals.push(["DINNER"]);
        
        // existing meal prep
        } else if (!plan.data().meals.dinner.prepId.includes("DINNER") && prepIds.includes(plan.data().meals.dinner.prepId)) {
          const index = prepIds.indexOf(plan.data().meals.dinner.prepId);
          prepDates[index] = [...prepDates[index], plan.id].flat();
          prepMeals[index] = [...prepMeals[index], "DINNER"].flat();

        // existing custom prep
        } else if (plan.data().meals.dinner.prepId.includes("DINNER") && dinnerIndex !== -1) {
          prepDates[dinnerIndex] = [...prepDates[dinnerIndex], plan.id].flat();
          prepMeals[dinnerIndex] = [...prepMeals[dinnerIndex], "DINNER"].flat();
        }
      }
    })
    
    // combined data to sort
    let combined = prepIds.map((id, index) => ({
      prepId: id,
      prepData: prepData[index],
      prepDate: prepDates[index],
      prepMeal: prepMeals[index],
    }));
    
    // sorts based on prepData.prepName
    combined.sort((a, b) => a.prepData.prepName.localeCompare(b.prepData.prepName));
    
    // stores extracted, sorted values
    setUniquePrepIds(combined.map(item => item.prepId));
    setUniquePrepData(combined.map(item => item.prepData));
    setUniquePrepDates(combined.map(item => item.prepDate));
    setUniquePrepMeals(combined.map(item => item.prepMeal));

    setFilteredPrepData(combined.map(item => item.prepData));
    setFilteredPrepDates(combined.map(item => item.prepDate));
    setFilteredPrepMeals(combined.map(item => item.prepMeal));
  }


  ///////////////////////////////// SHOWING DETAILS /////////////////////////////////

  const [openPrepIndex, setOpenPrepIndex] = useState(-1);
  const [openCustomIndex, setOpenCustomIndex] = useState(-1);
  const [openDatesIndex, setOpenDatesIndex] = useState(-1);

  // to format the given date as "mm/dd/yy"
  const formatDateShort = (currDate) => {
    currDate = new Date(currDate + "T00:00:00");
    
    const mm = currDate.getMonth() + 1; // Months are 0-based
    const dd = currDate.getDate();
    const yy = currDate.getFullYear() % 100;
    
    return `${mm}/${dd}/${yy}`;
  };


  ///////////////////////////////// SEARCH SECTION /////////////////////////////////

  const [prepKeywordQuery, setPrepKeywordQuery] = useState("");
  const [prepTypeFilter, setPrepTypeFilter] = useState("");

  const [filteredPrepData, setFilteredPrepData] = useState(null);
  const [filteredPrepDates, setFilteredPrepDates] = useState(null);
  const [filteredPrepMeals, setFilteredPrepMeals] = useState(null);
  
  // to filter the list of preps in the search section
  const filterPreps = (searchQuery, typeFilter) => {
    setPrepKeywordQuery(searchQuery);
    setPrepTypeFilter(typeFilter);
    setOpenPrepIndex(-1);
    setOpenCustomIndex(-1);

    // to get the unique list of preps
    let prepIds = [];
    let prepData = [];
    let prepDates = [];
    let prepMeals = [];

    // adds the data to the prep lists that matches the filtering
    uniquePrepData.map((prep, index) => {
      if (searchQuery.split(' ').every(keyword => prep.prepName.toLowerCase().includes(keyword.toLowerCase()))
        && (typeFilter === "" 
           || (typeFilter === "prep" && !(uniquePrepIds[index].includes("LUNCH") || uniquePrepIds[index].includes("DINNER")))
           || (typeFilter === "custom" && (uniquePrepIds[index].includes("LUNCH") || uniquePrepIds[index].includes("DINNER"))))
      ) {
        prepIds.push(uniquePrepIds[index]);
        prepData.push(prep);
        prepDates.push(uniquePrepDates[index]);
        prepMeals.push(uniquePrepMeals[index]);
      }
    })

    // stores the data
    setFilteredPrepData(prepData);
    setFilteredPrepDates(prepDates);
    setFilteredPrepMeals(prepMeals);
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
        <TouchableOpacity onPress={() => setModalVisible(false)} className="absolute bg-black opacity-50 w-full h-full"/>
        
        {/* Modal Content */}
        <View className="flex w-5/6 py-5 px-5 bg-zinc200 rounded-2xl z-50">

          {/* TITLE */}
          <View className="flex flex-row justify-between items-center px-2">
            <Text className="text-[20px] font-bold">
              MEAL PREP SEARCH
            </Text>
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>

          <View className="flex flex-col items-center justify-center">

            {/* RECIPE FILTERING SECTION */}
            <View className="flex flex-row w-full px-5 justify-center items-center mb-[20px] space-x-2">

              {/* text input */}
              <TextInput
                value={prepKeywordQuery}
                onChangeText={(value) => filterPreps(value, prepTypeFilter)}
                placeholder="recipe keyword(s)"
                placeholderTextColor={colors.zinc400}
                className="flex-1 w-5/6 bg-white radius-[5px] border-[1px] border-zinc300 pl-2.5 pr-10 py-1.5 rounded-md text-[14px] leading-[16px]"
              />
  
              {/* BUTTONS */}
              <View className="flex flex-row absolute right-6 h-[30px] items-center justify-center">

                {/* type filtering */}
                <Icon
                  name={prepTypeFilter === "prep" ? "information-circle" : prepTypeFilter === "custom" ? "ellipse" : "ellipse-outline"}
                  color={colors.zinc700}
                  size={18}
                  onPress={() => filterPreps(prepKeywordQuery, prepTypeFilter === "prep" ? "custom" : prepTypeFilter === "custom" ? "" : "prep")}
                />

                {/* clear */}
                <Icon
                  name="close-outline"
                  size={20}
                  color="black"
                  onPress={() => {
                    setPrepKeywordQuery("");
                    filterPreps("", prepTypeFilter);
                  }}
                />
              </View>
            </View>
            
            {/* Filtered List of Preps */}
            <ScrollView
              vertical
              scrollEventThrottle={16}
              contentContainerStyle={{ flexDirection: 'column' }}
              className="max-h-[200px] bg-zinc500 border-2 border-zinc600 space-y-2 mb-3"
            >
              {filteredPrepData?.map((prep, index) =>
                <View
                  key={index}
                  className="flex flex-col items-center justify-center"
                >
                  {/* GENERAL DETAILS */}
                  <View className="flex flex-row border-y-[1px] border-zinc600">
                    
                    {/* name */}
                    <View className="flex flex-wrap w-3/4 bg-theme300 py-2 justify-center items-center px-2">
                      <Text className="text-[13px] italic">
                        {prep.prepName}
                      </Text>
                    </View>

                    {/* dates */}
                    <View className="flex flex-col w-1/6 bg-theme400 py-2 justify-center items-center">
                      <Icon
                        name="calendar"
                        size={18}
                        color={colors.zinc700}
                        onPress={() => {
                          setOpenDatesIndex(openDatesIndex === index ? -1 : index)
                          setOpenPrepIndex(-1)
                          setOpenCustomIndex(-1)
                        }}
                      />
                    </View>

                    {/* open ingredients button */}
                    {!(Array.isArray(prep.currentData) && prep.currentData.length === 12 && prep.currentData.every((item) => item === null)) 
                    ?
                      <View className="flex w-1/12 py-2 justify-center items-center bg-zinc350">
                        <Icon
                          name="information-circle"
                          color={colors.zinc800}
                          size={20}
                          onPress={() => {
                            setOpenPrepIndex(openPrepIndex === index ? -1 : index)
                            setOpenCustomIndex(-1)
                            setOpenDatesIndex(-1)
                          }}
                        />
                      </View>
                    : // if custom
                    <View className="flex w-1/12 py-2 justify-center items-center bg-zinc350">
                      <Icon
                        name="ellipse"
                        color={colors.zinc400}
                        size={18}
                        onPress={() => {
                          setOpenCustomIndex(openCustomIndex === index ? -1 : index)
                          setOpenPrepIndex(-1)
                          setOpenDatesIndex(-1)
                        }}
                      />
                    </View>
                    }
                  </View>

                  {/* PREP DATES */}
                  {openDatesIndex === index && (
                    <View className="flex flex-row max-h-[50px] overflow-hidden justify-center items-center bg-zinc300 px-2">

                      {/* Lunch Dates */}
                      <View className="flex w-1/5 pr-1">
                        <Text className="text-[12px] text-right font-medium">
                          LUNCH
                        </Text>
                      </View>

                      {/* list */}
                      <ScrollView
                        vertical
                        scrollEventThrottle={16}
                        contentContainerStyle={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                        className="flex flex-col w-[27.5%] py-1"
                      >
                        {filteredPrepMeals[index].indexOf("LUNCH") !== -1
                        ?
                        <>
                          {filteredPrepMeals[index].map((meal, i) => 
                            <View key={i}>
                              {meal === "LUNCH" &&
                                <View className={`flex flex-row ${i !== filteredPrepMeals[index].indexOf("LUNCH") && "border-t-0.5 border-theme500"} justify-center items-center space-x-2 py-0.5`}>
                                  {/* current date */}
                                  <View className="flex">
                                    <Text className="text-zinc800 text-[12px] text-center">
                                      {formatDateShort(filteredPrepDates[index][i])}
                                    </Text>
                                  </View>

                                  {/* goto arrow */}
                                  <Icon
                                    name="arrow-forward"
                                    size={14}
                                    color={colors.theme700}
                                    onPress={() => {
                                      const [year, month, day] = filteredPrepDates[index][i].split("-");
                                      closeModal("LUNCH", {
                                        dateString: filteredPrepDates[index][i],
                                        day: parseInt(day, 10).toString(),
                                        month: parseInt(month, 10).toString(),
                                        year: parseInt(year, 10).toString(),
                                        timestamp: new Date(year, month, day).getTime(),
                                      });
                                    }}
                                  />
                                </View>
                              }
                            </View>
                          )}
                        </>
                        : // if empty list
                          <Text className="font-medium text-theme800 w-full text-left pl-5">X</Text>
                        }
                      </ScrollView>


                      {/* separator */}
                      <View className="flex w-[5%] bg-zinc300 z-20"/>
                      

                      {/* Dinner Dates */}
                      <View className="flex w-1/5 pr-1">
                        <Text className="text-[12px] text-right font-medium">
                          DINNER
                        </Text>
                      </View>

                      {/* list */}
                      <ScrollView
                        vertical
                        scrollEventThrottle={16}
                        contentContainerStyle={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                        className="flex flex-col w-[27.5%] py-1"
                      >
                        {filteredPrepMeals[index].indexOf("DINNER") !== -1
                        ?
                        <>
                          {filteredPrepMeals[index].map((meal, i) => 
                            <View key={i}>
                              {meal === "DINNER" &&
                                <View className={`flex flex-row ${i !== filteredPrepMeals[index].indexOf("DINNER") && "border-t-0.5 border-theme500"} justify-center items-center space-x-2 py-0.5`}>
                                  {/* current date */}
                                  <View className="flex">
                                    <Text className="text-zinc800 text-[12px] text-center">
                                      {formatDateShort(filteredPrepDates[index][i])}
                                    </Text>
                                  </View>

                                  {/* goto arrow */}
                                  <Icon
                                    name="arrow-forward"
                                    size={14}
                                    color={colors.theme700}
                                    onPress={() => {
                                      const [year, month, day] = filteredPrepDates[index][i].split("-");
                                      closeModal("DINNER", {
                                        dateString: filteredPrepDates[index][i],
                                        day: parseInt(day, 10).toString(),
                                        month: parseInt(month, 10).toString(),
                                        year: parseInt(year, 10).toString(),
                                        timestamp: new Date(year, month, day).getTime(),
                                      });
                                    }}
                                  />
                                </View>
                              }
                            </View>
                          )}
                        </>
                        : // if empty list
                          <Text className="font-medium text-theme800 w-full text-left pl-5">X</Text>
                        }
                      </ScrollView>
                    </View>
                  )}

                  {/* INGREDIENT DETAILS */}
                  {openPrepIndex === index && (
                    <View className="flex flex-row w-full">
                      {/* Ingredient List */}
                      <View className="flex flex-col w-3/4 bg-zinc300 py-1 items-start justify-center">
                        {prep.currentData.slice()
                        .sort((a, b) => a?.ingredientData?.ingredientName?.localeCompare(b?.ingredientData?.ingredientName)).map((current, i) => 
                          current !== null && (
                            <View key={i} className="flex flex-row w-full pl-2 pr-5 space-x-1">
                              {/* current ingredient name */}
                              <Text className="text-zinc800 text-[11px] text-center">
                                {"-"}
                              </Text>
                              <Text className="text-zinc800 text-[11px] text-left">
                                {current.ingredientData.ingredientName}
                              </Text>
                            </View>
                          )
                        )}
                      </View>
                      
                      {/* Details */}
                      <View className="flex flex-col w-1/4 bg-zinc350 justify-center space-y-0.5 py-1">
                        {/* total calories */}
                        <Text className="text-theme900 font-medium text-[11px] text-center">
                          {prep.prepCal} {"cal"}
                        </Text>
                        {/* total price */}
                        <Text className="text-theme900 font-medium text-[11px] text-center">
                          {"$"}{prep.prepPrice}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* CUSTOM DETAILS */}
                  {openCustomIndex === index && (
                    <View className="flex flex-row w-full bg-zinc300 justify-center items-center space-x-5 py-1">
                      {/* total calories */}
                      <Text className="text-theme900 font-medium text-[11px] text-center">
                        {prep.prepCal} {"cal"}
                      </Text>
                      {/* total price */}
                      <Text className="text-theme900 font-medium text-[11px] text-center">
                        {"$"}{prep.prepPrice}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default MealSearchModal;