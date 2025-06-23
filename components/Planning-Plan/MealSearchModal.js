///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect } from 'react';

// UI components
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// validation
import extractUnit from '../../components/Validation/extractUnit';
import { deepPrepIndexOf } from '../Validation/deepPrepSearch';


///////////////////////////////// SIGNATURE /////////////////////////////////

const MealSearchModal = ({ 
  snapshot, modalVisible, setModalVisible, closeModal,
}) => {


  ///////////////////////////////// ON OPEN /////////////////////////////////

  // loads data on open
  useEffect(() => {
    if (modalVisible) {
      loadPreps();
    }
  }, [modalVisible]);

  // getting DB data
  const [uniquePrepIds, setUniquePrepIds] = useState(null);
  const [uniquePrepNames, setUniquePrepNames] = useState(null);
  const [uniquePrepData, setUniquePrepData] = useState(null);
  const [uniquePrepDates, setUniquePrepDates] = useState(null);
  const [uniquePrepMeals, setUniquePrepMeals] = useState(null);


  // gets the collection of meal preps
  const loadPreps = async () => {

    // to get the unique list of preps
    let prepNames = [];
    let prepIds = [];
    let prepData = [];
    let prepDates = [];
    let prepMeals = [];


    // loops through all the plans
    snapshot.docs.map((plan) => {
      

      // LUNCH PREPS
      if (plan.data().meals.lunch.prepData) {
        const lunchNameIndex = prepNames.indexOf(plan.data().meals.lunch.prepData.prepName);

        // completely new
        if (lunchNameIndex === -1) {
          prepNames.push(plan.data().meals.lunch.prepData.prepName); 
          prepIds.push([plan.data().meals.lunch.prepId]);
          prepData.push([plan.data().meals.lunch.prepData]); 
          prepDates.push([[plan.id]]);
          prepMeals.push([["LUNCH"]]);

        // otherwise - exact match or alternate found
        } else {
          
          const lunchDataIndex = deepPrepIndexOf(prepData[lunchNameIndex], plan.data().meals.lunch.prepData);

          // alternative found
          if (lunchDataIndex === -1) {
            prepIds[lunchNameIndex].push(plan.data().meals.lunch.prepId);
            prepData[lunchNameIndex].push(plan.data().meals.lunch.prepData);
            prepDates[lunchNameIndex].push([plan.id]);
            prepMeals[lunchNameIndex].push(["LUNCH"]);
          
          // exact match found
          } else {
            prepDates[lunchNameIndex][lunchDataIndex].push(plan.id);
            prepMeals[lunchNameIndex][lunchDataIndex].push("LUNCH");
          }
        }
      }

      // DINNER PREPS
      if (plan.data().meals.dinner.prepData) {
        const dinnerNameIndex = prepNames.indexOf(plan.data().meals.dinner.prepData.prepName);

        // completely new
        if (dinnerNameIndex === -1) {
          prepNames.push(plan.data().meals.dinner.prepData.prepName); 
          prepIds.push([plan.data().meals.dinner.prepId]);
          prepData.push([plan.data().meals.dinner.prepData]); 
          prepDates.push([[plan.id]]);
          prepMeals.push([["DINNER"]]);

        // otherwise - exact match or alternate found
        } else {
          const dinnerDataIndex = deepPrepIndexOf(prepData[dinnerNameIndex], plan.data().meals.dinner.prepData);

          // alternative found
          if (dinnerDataIndex === -1) {
            prepIds[dinnerNameIndex].push(plan.data().meals.dinner.prepId);
            prepData[dinnerNameIndex].push(plan.data().meals.dinner.prepData);
            prepDates[dinnerNameIndex].push([plan.id]);
            prepMeals[dinnerNameIndex].push(["DINNER"]);
          
          // exact match found
          } else {
            prepDates[dinnerNameIndex][dinnerDataIndex].push(plan.id);
            prepMeals[dinnerNameIndex][dinnerDataIndex].push("DINNER");
          }
        }
      }
    })
    
    // combined data to sort
    let combined = prepNames.map((name, index) => ({
      name: name,
      id: prepIds[index],
      data: prepData[index],
      date: prepDates[index],
      meal: prepMeals[index],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
    
    // stores extracted, sorted values
    setUniquePrepNames(combined.map(item => item.name));
    setUniquePrepIds(combined.map(item => item.id));
    setUniquePrepData(combined.map(item => item.data));
    setUniquePrepDates(combined.map(item => item.date));
    setUniquePrepMeals(combined.map(item => item.meal));
    
    setFilteredPrepNames(combined.map(item => item.name));
    setFilteredPrepIds(combined.map(item => item.id));
    setFilteredPrepData(combined.map(item => item.data));
    setFilteredPrepDates(combined.map(item => item.date));
    setFilteredPrepMeals(combined.map(item => item.meal));
  }


  ///////////////////////////////// SHOWING DETAILS /////////////////////////////////

  const [openPrepIndex, setOpenPrepIndex] = useState(-1);
  const [openSimpleIndex, setOpenSimpleIndex] = useState(-1);
  const [openComplexIndex, setOpenComplexIndex] = useState(-1);
  const [openDatesIndex, setOpenDatesIndex] = useState(-1);
  const [showSpecifics, setShowSpecifics] = useState(false);

  // to format the given date as "mm/dd/yy"
  const formatDateShort = (currDate) => {
    currDate = new Date(currDate + "T00:00:00");
    
    const mm = currDate.getMonth() + 1; // Months are 0-based
    const dd = currDate.getDate();
    const yy = currDate.getFullYear() % 100;
    
    return `${mm}/${dd}/${yy}`;
  };


  ///////////////////////////////// SEARCH SECTION /////////////////////////////////

  const [currIndex, setCurrIndex] = useState(0);
  const [prepKeywordQuery, setPrepKeywordQuery] = useState("");
  const [prepTypeFilter, setPrepTypeFilter] = useState("");
  const [keywordType, setKeywordType] = useState("meal prep");

  const [filteredPrepNames, setFilteredPrepNames] = useState(null);
  const [filteredPrepIds, setFilteredPrepIds] = useState(null);
  const [filteredPrepData, setFilteredPrepData] = useState(null);
  const [filteredPrepDates, setFilteredPrepDates] = useState(null);
  const [filteredPrepMeals, setFilteredPrepMeals] = useState(null);
  
  // to filter the list of preps in the search section
  const filterPreps = (keyword, searchQuery, typeFilter) => {
    setPrepKeywordQuery(searchQuery);
    setPrepTypeFilter(typeFilter);
    setOpenPrepIndex(-1);
    setOpenSimpleIndex(-1);
    setOpenComplexIndex(-1);
    setShowSpecifics(false);
    setCurrIndex(0);

    // to get the unique list of preps
    let prepNames = [];
    let prepIds = [];
    let prepData = [];
    let prepDates = [];
    let prepMeals = [];

    // helper function for keyword filtering
    const matchesKeywordFilter = (i, index) => {
      // meal prep keyword - checks the meal prep name
      if (keyword === "meal prep") {
        return searchQuery.split(" ").every((word) => 
          uniquePrepNames[index].toLowerCase().includes(word.toLowerCase()
        ));
      }
      // ingredient keyword - checks each ingredient's name
      if (keyword === "ingredient") {
        return uniquePrepData[index][i]?.currentData?.some(current =>
          searchQuery.split(" ").every(word =>
            current?.ingredientName?.toLowerCase().includes(word.toLowerCase())
          )
        );
      }
      // otherwise
      return false;
    };

    // helper function for type filtering
    const matchesTypeFilter = (id) => {
      return (
        typeFilter === "" ||
        (typeFilter === "prep" && !(id.includes("LUNCH") || id.includes("DINNER") || id.includes("."))) ||
        (typeFilter === "complex" && id.includes(".")) ||
        (typeFilter === "simple" && (id.includes("LUNCH") || id.includes("DINNER")))
      );
    };

    // adds the data to the prep lists that matches the filtering
    uniquePrepNames.map((name, index) => {
      
      // if the type and keywords match
      if (uniquePrepIds[index].some((id, i) => matchesTypeFilter(id) && matchesKeywordFilter(i, index))) {
        // adds the name to the filtered names
        prepNames.push(name); 

        // uses type and keyword filtering for specific indices
        const keepIndices = uniquePrepIds[index]
          .map((id, i) => (matchesTypeFilter(id) && matchesKeywordFilter(i, index)) ? i : -1)
          .filter(i => i !== -1);

        // adds the data after filtering
        prepIds.push(keepIndices.map((i) => uniquePrepIds[index][i]));
        prepData.push(keepIndices.map((i) => uniquePrepData[index][i]));
        prepDates.push(keepIndices.map((i) => uniquePrepDates[index][i]));
        prepMeals.push(keepIndices.map((i) => uniquePrepMeals[index][i]));
      }
    })

    // stores the data
    setFilteredPrepNames(prepNames);
    setFilteredPrepIds(prepIds);
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
            <View className="flex flex-row w-full px-3 justify-center items-center mb-[20px] space-x-2">

              {/* Keyword Type Selector */}
              <Icon
                name={keywordType === "meal prep" ? "code-working" : keywordType === "ingredient" && "list"}
                color={colors.zinc900}
                size={20}
                onPress={() => {
                  const keyword = keywordType === "meal prep" ? "ingredient" : "meal prep";
                  setKeywordType(keyword)
                  filterPreps(keyword, "", prepTypeFilter)
                }}
              />

              {/* text input */}
              <TextInput
                value={prepKeywordQuery}
                onChangeText={(value) => filterPreps(keywordType, value, prepTypeFilter)}
                placeholder={`${keywordType} keyword(s)`}
                placeholderTextColor={colors.zinc400}
                className="flex-1 w-5/6 bg-white radius-[5px] border-[1px] border-zinc300 pl-2.5 pr-10 py-1.5 rounded-md text-[14px] leading-[17px]"
              />
  
              {/* BUTTONS */}
              <View className="flex flex-row absolute right-5 h-[30px] items-center justify-center">

                {/* type filtering */}
                <Icon
                  name={prepTypeFilter === "prep" ? "information-circle" : prepTypeFilter === "complex" ? "stop-circle" : prepTypeFilter === "simple" ? "ellipse" : "ellipse-outline"}
                  color={colors.zinc700}
                  size={18}
                  onPress={() => filterPreps(keywordType, prepKeywordQuery, prepTypeFilter === "prep" ? "complex" : prepTypeFilter === "complex" ? "simple" : prepTypeFilter === "simple" ? "" : "prep")}
                />

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
                    setOpenDatesIndex(-1);
                    setShowSpecifics(false);
                    filterPreps(keywordType, "", prepTypeFilter);
                  }}
                />
              </View>
            </View>
            
            {/* Filtered List of Preps */}
            {filteredPrepData?.length > 0 
            ?
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
                    
                    {/* Overall Name Display */}
                    <View className="flex flex-row w-3/4 bg-theme300 py-2 pl-2 pr-1 space-x-2 items-center justify-between">
                      {/* name */}
                      <View className="flex-1">
                        <Text className="text-left text-[13px] italic">
                          {filteredPrepNames?.[index]}
                        </Text>
                      </View>

                      {/* indicator of selected option */}
                      <TouchableOpacity 
                        className="" 
                        onPress={(openDatesIndex === index || openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? () => setCurrIndex((currIndex + 1) % prep.length) : undefined}
                        activeOpacity={!(openDatesIndex === index || openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) && 1}
                      >
                        <Text className="text-[12px] font-semibold text-theme900">
                          {
                          (openDatesIndex === index || openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index)
                          ? `${currIndex + 1}/${prep.length}`
                          : `(${prep.length})`
                          }
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* dates */}
                    <View className="flex flex-col w-1/6 bg-theme400 py-2 justify-center items-center">
                      <Icon
                        name="calendar"
                        size={18}
                        color={colors.zinc700}
                        onPress={() => {
                          setCurrIndex((openDatesIndex === index || openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0)
                          setOpenDatesIndex(openDatesIndex === index ? -1 : index)
                          setOpenPrepIndex(-1)
                          setOpenComplexIndex(-1)
                          setOpenSimpleIndex(-1)
                          setShowSpecifics(false)
                        }}
                      />
                    </View>

                    {/* open ingredients button */}
                    {(filteredPrepIds[index]?.[(openDatesIndex === index || openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0]?.includes("LUNCH") 
                      || filteredPrepIds[index]?.[(openDatesIndex === index || openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0]?.includes("DINNER")) 
                    ? // if simple custom
                    <View className="flex w-1/12 py-2 justify-center items-center bg-zinc350">
                      <Icon
                        name="ellipse"
                        color={colors.zinc400}
                        size={18}
                        onPress={() => {
                          setCurrIndex((openDatesIndex === index || openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0)
                          setOpenSimpleIndex(openSimpleIndex === index ? -1 : index)
                          setOpenComplexIndex(-1)
                          setOpenPrepIndex(-1)
                          setOpenDatesIndex(-1)
                          setShowSpecifics(false)
                        }}
                      />
                    </View>
                    : (filteredPrepIds[index]?.[(openDatesIndex === index || openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0]?.includes("."))
                    ? // if complex custom
                    <View className="flex w-1/12 py-2 justify-center items-center bg-zinc350">
                      <Icon
                        name="stop-circle"
                        color={colors.zinc450}
                        size={20}
                        onPress={() => {
                          setCurrIndex((openDatesIndex === index || openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0)
                          setOpenComplexIndex(openComplexIndex === index ? -1 : index)
                          setOpenSimpleIndex(-1)
                          setOpenPrepIndex(-1)
                          setOpenDatesIndex(-1)
                          setShowSpecifics(false)
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
                          setCurrIndex((openDatesIndex === index || openComplexIndex === index || openSimpleIndex === index || openPrepIndex === index) ? currIndex : 0)
                          setOpenPrepIndex(openPrepIndex === index ? -1 : index)
                          setOpenComplexIndex(-1)
                          setOpenSimpleIndex(-1)
                          setOpenDatesIndex(-1)
                          setShowSpecifics(false)
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
                        {filteredPrepMeals[index]?.[currIndex].indexOf("LUNCH") !== -1
                        ?
                        <>
                          {filteredPrepMeals[index]?.[currIndex].map((meal, i) => 
                            <View key={i}>
                              {meal === "LUNCH" &&
                                <View className={`flex flex-row ${i !== filteredPrepMeals[index]?.[currIndex].indexOf("LUNCH") && "border-t-0.5 border-theme500"} justify-center items-center space-x-2 py-0.5`}>
                                  {/* current date */}
                                  <View className="flex">
                                    <Text className="text-zinc800 text-[12px] text-center">
                                      {formatDateShort(filteredPrepDates[index]?.[currIndex][i])}
                                    </Text>
                                  </View>

                                  {/* goto arrow */}
                                  <Icon
                                    name="arrow-forward"
                                    size={14}
                                    color={colors.theme700}
                                    onPress={() => {
                                      const [year, month, day] = filteredPrepDates[index]?.[currIndex][i].split("-");
                                      closeModal("LUNCH", {
                                        dateString: filteredPrepDates[index]?.[currIndex][i],
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
                        {filteredPrepMeals[index]?.[currIndex].indexOf("DINNER") !== -1
                        ?
                        <>
                          {filteredPrepMeals[index]?.[currIndex].map((meal, i) => 
                            <View key={i}>
                              {meal === "DINNER" &&
                                <View className={`flex flex-row ${i !== filteredPrepMeals[index]?.[currIndex].indexOf("DINNER") && "border-t-0.5 border-theme500"} justify-center items-center space-x-2 py-0.5`}>
                                  {/* current date */}
                                  <View className="flex">
                                    <Text className="text-zinc800 text-[12px] text-center">
                                      {formatDateShort(filteredPrepDates[index]?.[currIndex][i])}
                                    </Text>
                                  </View>

                                  {/* goto arrow */}
                                  <Icon
                                    name="arrow-forward"
                                    size={14}
                                    color={colors.theme700}
                                    onPress={() => {
                                      const [year, month, day] = filteredPrepDates[index]?.[currIndex][i].split("-");
                                      closeModal("DINNER", {
                                        dateString: filteredPrepDates[index]?.[currIndex][i],
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

                  {/* COMPLEX DETAILS */}
                  {(openPrepIndex === index || openComplexIndex === index) && (
                    <View className="flex flex-row w-full">
                    {/* Ingredient List */}

                      {!showSpecifics
                      ? // not showing specific amounts
                      <View className="flex flex-col w-3/4 bg-zinc300 py-1 items-start justify-center">
                        {prep[currIndex].currentData.map((current, i) => 
                          current !== null && (
                            <View key={i} className="flex flex-row w-full pl-2 pr-5 space-x-1">
                              {/* current ingredient name */}
                              <Text className="text-zinc800 text-[11px] text-center">
                                {"⁃"}
                              </Text>
                              <Text className="text-zinc800 text-[11px] text-left pr-2">
                                {current.ingredientName}
                              </Text>
                            </View>
                          )
                        )}
                      </View>
                      : 
                      // showing specific amounts
                      <View className="flex w-full bg-zinc300 items-start justify-center">
                        <>
                        {prep[currIndex].currentData.map((current, i) => 
                          current !== null && (
                            <View key={i} className="flex flex-row">

                              {/* INGREDIENT NAME */}
                              <View className={`${i === 0 && "pt-1"} ${i === prep[currIndex].currentData.filter(curr => curr !== null).length - 1 && "pb-1"} w-3/4 flex flex-row pl-2 pr-5 space-x-1`}>
                                <Text className="text-zinc800 text-[11px] text-center">
                                  {"⁃"}
                                </Text>
                                <Text className="text-zinc800 text-[11px] text-left pr-2">
                                  {`${current.ingredientName}`}
                                </Text>
                              </View>

                              {/* INGREDIENT AMOUNT */}
                              <View className={`${i === 0 && "pt-1"} ${i === prep[currIndex].currentData.filter(curr => curr !== null).length - 1 && "pb-1"} w-1/4 justify-center items-center bg-zinc350`}>
                                <Text className="text-theme900 font-medium text-[9px] text-center">
                                  {`${prep[currIndex].currentAmounts[i]} ${extractUnit(current.ingredientData[current.ingredientStore].unit, prep[currIndex].currentAmounts[i])}`}
                                </Text>
                              </View>
                            </View>
                          )
                        )}
                        </>

                        {/* collapse specifics */}
                        <View className="absolute w-1/4 right-0 mr-[20px] z-20 h-full items-start justify-center">
                          <Icon
                            name="chevron-collapse"
                            color={colors.zinc900}
                            size={16}
                            onPress={() => setShowSpecifics(false)}
                          />
                        </View>
                      </View>
                      }
                      
                      {/* Details */}
                      {!showSpecifics &&
                      <View className="flex flex-col w-1/4 bg-zinc350 justify-center space-y-0.5 py-1">

                        {/* expand specifics */}
                        <View className="absolute left-[-20px] h-full items-center justify-center">
                          <Icon
                            name="resize"
                            color={colors.zinc900}
                            size={16}
                            onPress={() => setShowSpecifics(true)}
                          />
                        </View>
                        
                        {/* total calories */}
                        <Text className="text-theme900 font-medium text-[11px] text-center">
                          {prep[currIndex].prepCal} {"cal"}
                        </Text>
                        {/* total price */}
                        <Text className="text-theme900 font-medium text-[11px] text-center">
                          {"$"}{prep[currIndex].prepPrice}
                        </Text>
                      </View>
                      }
                    </View>
                  )}

                  {/* SIMPLE DETAILS */}
                  {openSimpleIndex === index && (
                    <View className="flex flex-row w-full bg-zinc300 justify-center items-center space-x-5 py-1">
                      {/* total calories */}
                      <Text className="text-theme900 font-medium text-[11px] text-center">
                        {prep[currIndex].prepCal} {"cal"}
                      </Text>
                      {/* total price */}
                      <Text className="text-theme900 font-medium text-[11px] text-center">
                        {"$"}{prep[currIndex].prepPrice}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
            :
            <View className="py-1 px-3 bg-zinc500 border-2 border-zinc600">
              <Text className="italic text-center text-white font-medium">
                no meal preps match the current filter
              </Text>
            </View>
            }
          </View>
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default MealSearchModal;