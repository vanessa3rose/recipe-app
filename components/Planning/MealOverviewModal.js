///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState } from 'react';

// UI components
import { Modal, View, Text, TouchableOpacity } from 'react-native';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';

// validation
import extractUnit from '../../components/Validation/extractUnit';


///////////////////////////////// SIGNATURE /////////////////////////////////

const MealOverviewModal = ({ 
  data, modalVisible, setModalVisible, 
}) => {


  ///////////////////////////////// SPECIFICS VIEW /////////////////////////////////

  const [specificsIndex, setSpecificsIndex] = useState(-1);


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
        <View className="flex w-3/4 py-5 px-2 bg-zinc200 rounded-xl border-[1px] border-zinc-400 z-50">
        
          {/* Title */}
          <Text className="font-bold text-[16px] text-center text-black">
            {data.prepName}
          </Text>
          
          {/* Divider */}
          <View className="h-[1px] bg-zinc400 mt-2 mb-4 mx-4"/>
          
          {/* GRID */}
          {((data?.currentData?.length > 0) && specificsIndex === -1) ?
            // Ingredient Names
            <View className="flex justify-center items-center border-2 border-theme500 mx-5">
              {data?.currentData?.map((current, index) => (
                <View key={`frozen-${index}`}>
                  {current && (
                    <View className="flex flex-row w-full min-h-[30px] bg-white border-b-[1px] border-zinc200">
                      {/* BULLET */}
                      <Text className="flex justify-center w-1/12 py-[7px] text-black font-semibold text-[12px] text-right">
                        {index + 1}{"."}
                      </Text>
                      {/* NAME */}
                      <Text className={`flex justify-center w-5/6 py-[7px] px-1.5 text-[12px] text-left ${!data?.currentIncluded[index] ? "line-through text-mauve600" : "text-black"}`}>
                        {current?.ingredientName || ""}
                      </Text>

                      {/* Specific Selector */}
                      <View className="flex w-1/12 justify-center items-center">
                        <Icon
                          name="resize"
                          color={colors.zinc800}
                          size={16}
                          onPress={() => setSpecificsIndex(index)}
                        />
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>

          // SPECIFICS FOR COMPLEX / REG
          : (data?.currentData?.length > 0) ? (
            // Specifics of selected
            <View className="flex justify-center items-center border-2 border-theme500 mx-5">
              <View className="flex flex-row w-full min-h-[30px] bg-white border-b-[1px] border-zinc200">
                {/* BULLET */}
                <Text className="flex justify-center w-1/12 py-[7px] text-black font-semibold text-[12px] text-right">
                  {specificsIndex + 1}{"."}
                </Text>
                {/* NAME */}
                <Text className={`flex justify-center w-5/6 py-[7px] pl-1.5 text-[12px] text-left ${!data?.currentIncluded[specificsIndex] ? "line-through text-mauve600" : "text-black"}`}>
                  {data?.currentData[specificsIndex]?.ingredientName || ""}
                </Text>

                {/* Specific Deselctor */}
                <View className="flex w-1/12 justify-center items-center">
                  <Icon
                    name="chevron-collapse"
                    color={colors.zinc800}
                    size={16}
                    onPress={() => setSpecificsIndex(-1)}
                  />
                </View>
              </View>

              {/* Specifics Details */}
              <View className="flex flex-row py-1 w-full justify-evenly items-center bg-zinc350">
                {/* AMOUNT */}
                <Text className="text-theme900 text-[11px] font-bold">
                  {`${data.currentAmounts[specificsIndex]} ${extractUnit(data.currentData[specificsIndex]?.ingredientData[data.currentData[specificsIndex].ingredientStore].unit || "", data.currentAmounts[specificsIndex])}`}
                </Text>
                {/* CAL - $ */}
                <Text className="text-theme800 text-[10px] italic font-medium">
                  {`${(isNaN(data.currentCals[specificsIndex]) ? 0 : Number(data.currentCals[specificsIndex])).toFixed(0)} calories  -  $${(isNaN(data.currentPrices[specificsIndex]) ? 0 : Number(data.currentPrices[specificsIndex])).toFixed(2)}`}
                </Text>
              </View>
            </View>

          // NOTE FOR SIMPLE
          ) : (
            <View className="justify-center items-center pb-4">
              <Text className={`w-5/6 bg-zinc300 py-2 px-4 text-center border border-zinc350 ${data?.prepNote === "" ? "italic text-zinc600" : "text-theme900"}`}>
                {data?.prepNote === "" ? "no notes" : data?.prepNote}
              </Text>
            </View>
          )}

          
          {/* Divider */}
          {(data?.currentData?.length > 0) && (
            <View className="h-[1px] bg-zinc400 m-4"/>
          )}


          {/* DETAILS */}
          <View className="flex flex-row justify-evenly px-[7.5px]">

            {/* text */}
            <View className="flex border-0.5 w-1/2 rounded-sm">
              <Text className="leading-7 text-center text-[12px] italic text-black bg-theme200 rounded-sm">
                {data.prepCal} {" calories"}
              </Text>
            </View>

            {/* data */}
            <View className="flex border-0.5 w-1/3 rounded-sm">
              <Text className="leading-7 text-center text-[12px] italic text-black bg-theme200 rounded-sm">
                {"$"}{data.prepPrice}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default MealOverviewModal;