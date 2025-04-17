///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';

import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';


///////////////////////////////// SIGNATURE /////////////////////////////////

const CalendarModal = ({
  modalVisible, closeModal, globalDate,
}) => {


  ///////////////////////////////// DATA /////////////////////////////////

  // today's current date
  const today = (() => {
    const localDate = new Date();
    
    return {
      dateString: localDate.toLocaleDateString('en-CA'),
      day: localDate.getDate(),
      month: localDate.getMonth() + 1,
      timestamp: localDate.getTime(),
      year: localDate.getFullYear(),
    };
  })();

  // the date that has been selected, set on open
  const [date, setDate] = useState(null);

  // when opening the modal, stores the date
  useEffect(() => {
    setDate(globalDate)
  }, [modalVisible]);


  ///////////////////////////////// HTML /////////////////////////////////

  return (

    // CONTAINER
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={closeModal} // Close modal on back press
    >
      <View className="flex-1 justify-center items-center">

        {/* Background Overlay */}
        <View className="absolute bg-black opacity-50 w-full h-full"/>
        
        {/* Modal Content */}
        <View className="bg-zinc200 w-2/3 border-black p-2 rounded-t-xl">
          {date && (
            <Calendar
              key={date.dateString}
              current={date.dateString}           
              onDayPress={(day) => setDate(day)}
              markedDates={{
                [date.dateString]: { selected: true, marked: true, selectedColor: date.dateString === today.dateString ? colors.zinc400 : colors.theme500 },
              }}
              theme={{
                todayTextColor: colors.theme500,
                todayBackgroundColor: colors.zinc200,
                arrowColor: colors.theme400,
                monthTextColor: 'black',
              }}
              className="rounded-t-xl"
            />
          )}
        </View>

        {/* BOTTOM BAR */}
        <View className="flex flex-row border-t bg-zinc200 w-2/3 justify-between items-center h-[50px] px-5">
          
          {/* Submit button */}
          <Icon
            name="checkmark-circle"
            size={24}
            color={colors.zinc600}
            onPress={() => closeModal(date)} // Close modal and send selected date back
          />

          {/* TODAY button */}
          <TouchableOpacity
            onPress={() => {
              setDate(today); // Update the selected date to today's date
            }}
          >
            <Text className="bg-theme300 text-black px-5 py-2 rounded-3xl">
              TODAY
            </Text>
          </TouchableOpacity>
          
          {/* Cancel button */}
          <Icon
            name="close-circle"
            size={24}
            color={colors.zinc600}
            onPress={() => closeModal(date)} // Close modal and send original selected date back
          />
        </View>
      </View>
    </Modal>
  );
};

///////////////////////////////// EXPORT /////////////////////////////////

export default CalendarModal;