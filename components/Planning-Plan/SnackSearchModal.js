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
import { deepSnackIndexOf } from '../Validation/deepSnackSearch';


///////////////////////////////// SIGNATURE /////////////////////////////////

const SnackSearchModal = ({ 
  snapshot, modalVisible, setModalVisible, closeModal
}) => {


  ///////////////////////////////// ON OPEN /////////////////////////////////

  // loads data on open
  useEffect(() => {
    if (modalVisible) {
      loadSnacks();
    }
  }, [modalVisible]);

  // getting DB data
  const [uniqueSnackNames, setUniqueSnackNames] = useState(null);
  const [uniqueSnackData, setUniqueSnackData] = useState(null);
  const [uniqueSnackDates, setUniqueSnackDates] = useState(null);


  // gets the collection of snacks
  const loadSnacks = async () => {

    // to get the unique list of snacks
    let snackNames = [];
    let snackData = [];
    let snackDates = [];


    // loops through all the plans
    snapshot.docs.map((plan) => {
      
      // SNACKS
      if (plan.data().snacks?.snackData) {

        plan.data().snacks.snackData.map((snack) => {
          const snackNameIndex = snackNames.indexOf(snack.name);
          
          // completely new
          if (snackNameIndex === -1) {
            snackNames.push(snack.name); 
            snackData.push([snack]); 
            snackDates.push([[plan.id]]);
            
          // otherwise - exact match or alternate found
          } else {
            const snackDataIndex = deepSnackIndexOf(snackData[snackNameIndex], snack);
  
            // alternative found
            if (snackDataIndex === -1) {
              snackData[snackNameIndex].push(snack);
              snackDates[snackNameIndex].push([plan.id]);
            
            // exact match found
            } else {
              snackDates[snackNameIndex][snackDataIndex].push(plan.id);
            }
          }
        })
      }
    })
    
    // combined data to sort
    let combined = snackNames.map((name, index) => ({
      name: name,
      data: snackData[index],
      date: snackDates[index],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
    
    // stores extracted, sorted values
    setUniqueSnackNames(combined.map(item => item.name));
    setUniqueSnackData(combined.map(item => item.data));
    setUniqueSnackDates(combined.map(item => item.date));
    
    setFilteredSnackNames(combined.map(item => item.name));
    setFilteredSnackData(combined.map(item => item.data));
    setFilteredSnackDates(combined.map(item => item.date));
  }


  ///////////////////////////////// SHOWING DETAILS /////////////////////////////////

  const [openIndex, setOpenIndex] = useState(-1);
  const [infoType, setInfoType] = useState("details")

  // to format the given date as "mm/dd/yy"
  const formatDateShort = (currDate) => {
    currDate = new Date(currDate + "T00:00:00");
    
    const mm = currDate.getMonth() + 1; // Months are 0-based
    const dd = currDate.getDate();
    const yy = currDate.getFullYear() % 100;
    
    return `${mm}/${dd}/${yy}`;
  };


  ///////////////////////////////// SEARCH SECTION /////////////////////////////////

  const [snackKeywordQuery, setSnackKeywordQuery] = useState("");

  const [filteredSnackNames, setFilteredSnackNames] = useState(null);
  const [filteredSnackData, setFilteredSnackData] = useState(null);
  const [filteredSnackDates, setFilteredSnackDates] = useState(null);
  
  // to filter the list of snacks in the search section
  const filterSnacks = (searchQuery) => {
    setSnackKeywordQuery(searchQuery);
    setOpenIndex(-1);

    // to get the unique list of snacks
    let snackNames = [];
    let snackData = [];
    let snackDates = [];

    // adds the data to the snack lists that matches the filtering
    uniqueSnackNames.map((name, index) => {
      
      // if the keywords match, push the data
      if (searchQuery.split(" ").every((word) => name.toLowerCase().includes(word.toLowerCase()))) {
        // adds the name to the filtered names
        snackNames.push(uniqueSnackNames[index]);
        snackData.push(uniqueSnackData[index]);
        snackDates.push(uniqueSnackDates[index]);
      }
    })

    // stores the data
    setFilteredSnackNames(snackNames);
    setFilteredSnackData(snackData);
    setFilteredSnackDates(snackDates);
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
              SNACK SEARCH
            </Text>
          </View>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mb-4"/>

          <View className="flex flex-col items-center justify-center">

            {/* RECIPE FILTERING SECTION */}
            <View className="flex flex-row w-full px-3 justify-center items-center mb-[20px] space-x-4">

              {/* Searchbar */}
              <View className="w-5/6 h-[30px]">
              {/* text input */}
                <TextInput
                  value={snackKeywordQuery}
                  onChangeText={(value) => filterSnacks(value)}
                  placeholder="snack keyword(s)"
                  placeholderTextColor={colors.zinc400}
                  className="flex-1 w-full bg-white radius-[5px] border-[1px] border-zinc300 pl-2.5 pr-10 py-1.5 rounded-md text-[14px] leading-[17px]"
                />
                {/* clear button */}
                <View className="flex flex-row h-[30px] absolute right-1 items-center justify-center">
                  <Icon
                    name="close-outline"
                    size={20}
                    color="black"
                    onPress={() => {
                      setSnackKeywordQuery("");
                      setOpenIndex(-1);
                      filterSnacks("");
                    }}
                  />
                </View>
              </View>

              {/* information type button */}
              <Icon
                name={infoType === "details" ? "apps" : "calendar"}
                size={20}
                color={colors.zinc600}
                onPress={() => setInfoType(infoType === "details" ? "dates" : "details")}
              />
            </View>
            
            {/* Filtered List of Snacks */}
            {filteredSnackData?.length > 0 
            ?
            <ScrollView
              vertical
              scrollEventThrottle={16}
              contentContainerStyle={{ flexDirection: 'column' }}
              className="max-h-[200px] bg-zinc500 border-2 border-zinc600 space-y-2 mb-3"
            >
              {filteredSnackData?.map((snack, index) =>
                <View
                  key={index}
                  className="flex flex-col items-center justify-center"
                >
                  {/* GENERAL DETAILS */}
                  <View className="flex flex-row border-y-[1px] border-zinc600">
                    
                    {/* Overall Name Display */}
                    <View className="flex flex-row w-[85%] bg-theme300 py-2 pl-2 pr-1 space-x-2 items-center justify-between">
                      {/* name */}
                      <View className="flex-1">
                        <Text className="text-left text-[13px] italic">
                          {filteredSnackNames[index]}
                        </Text>
                      </View>

                      {/* indicator of selected option */}
                      <View>
                        <Text className="text-[12px] font-semibold text-theme900">
                          {`(${snack.length})`}
                        </Text>
                      </View>
                    </View>

                    {/* open information button */}
                    <View className="flex w-[15%] py-2 justify-center items-center bg-theme400">
                      <Icon
                        name="information-circle"
                        color={colors.zinc800}
                        size={18}
                        onPress={() => setOpenIndex(openIndex === index ? -1 : index)}
                      />
                    </View>
                  </View>

                  {/* SNACK DATES */}
                  {(openIndex === index && infoType === "dates") && (
                  <View className="bg-zinc300 w-full justify-center items-center">
                    <ScrollView
                      horizontal
                      scrollEventThrottle={16}
                      contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                      className="flex flex-row py-2"
                    >
                      {filteredSnackDates[index].map((variant, idx) => (
                        <View 
                          index={idx}
                          className="flex flex-col space-y-1 w-[100px] justify-center items-center"
                        >
                          {variant.map((date, i) => (
                            <View
                              index={i}
                              className="flex flex-row space-x-1"
                            >
                              {/* goto arrow */}
                              <Icon
                                name="arrow-back"
                                size={14}
                                color={colors.zinc700}
                                onPress={() => {
                                  const [year, month, day] = date.split("-");
                                  closeModal("SNACK", {
                                    dateString: date,
                                    day: parseInt(day, 10).toString(),
                                    month: parseInt(month, 10).toString(),
                                    year: parseInt(year, 10).toString(),
                                    timestamp: new Date(year, month, day).getTime(),
                                  });
                                }}
                              />
                              {/* date */}
                              <Text className="text-theme900 font-medium text-[11px] text-center">
                                {formatDateShort(date)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                  )}

                  {/* DETAILS */}
                  {(openIndex === index && infoType === "details") && (
                  <View className="bg-zinc300 w-full justify-center items-center px-2">
                    <ScrollView
                      horizontal
                      scrollEventThrottle={16}
                      contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                      className="flex flex-row py-2 space-x-2"
                    >
                      {snack.map((variant, i) => (
                        <View 
                          index={i}
                          className="flex flex-col space-y-0.5 w-[100px] justify-center items-center px-2"
                        >
                          {/* amount */}
                          <Text className="text-theme900 font-medium text-[11px] text-center">
                            {`${variant.amount} ${extractUnit(variant.unit, variant.amount)}`}
                          </Text>
                          {/* DIVIDER */}
                          <View className="h-[1px] bg-zinc400 w-5/6 mb-0.5"/>
                          {/* calories */}
                          <Text className="text-zinc700 font-medium text-[10px] text-center">
                            {`${variant.cal} cal`}
                          </Text>
                          {/* price */}
                          <Text className="text-zinc700 font-medium text-[10px] text-center">
                          {`$${variant.price}`}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                  )}
                </View>
              )}
            </ScrollView>
            :
            <View className="py-1 px-3 bg-zinc500 border-2 border-zinc600">
              <Text className="italic text-center text-white font-medium">
                no snacks match the current filter
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

export default SnackSearchModal;