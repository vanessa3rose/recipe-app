///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect } from 'react';

// UI components
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';

// visual effects
import Icon from 'react-native-vector-icons/Ionicons';
import colors from '../../assets/colors';


///////////////////////////////// SIGNATURE /////////////////////////////////

const CalendarModal = ({
  modalVisible, setModalVisible, closeModal, globalDate, allowNull, allowMonth
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
  const [visibleDate, setVisibleDate] = useState(null);

  // when opening the modal, stores the date
  useEffect(() => {
    if (modalVisible) {
      setDate(globalDate);
      setVisibleDate(globalDate);
    }
  }, [modalVisible]);


  ///////////////////////////////// HTML /////////////////////////////////

  return (

    // CONTAINER
    <Modal
      visible={modalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={closeModal}
    >
      <View className="flex-1 justify-center items-center">

        {/* Background Overlay */}
        <View className="absolute bg-black opacity-50 w-full h-full"/>
        
        {/* Modal Content */}
        <View className="flex items-center bg-zinc200 w-2/3 border-0.5 border-black p-2 rounded-t-xl">
          {date && (
            <>
              <Calendar
                key={date.dateString}
                current={date.dateString}           
                onDayPress={(day) => setDate(day)}
                onMonthChange={(day) => {
                  setVisibleDate(day);
                  if ((new Date(date.timestamp)).toString().split(" ")[4] === "12:00:00") {
                    const newDate = (new Date(day.year, day.month - 1, day.day, 12, 0, 0, 0));
                    setDate({
                      dateString: newDate.toLocaleDateString('en-CA'),
                      day: newDate.getDate(),
                      month: newDate.getMonth() + 1,
                      timestamp: newDate.getTime(),
                      year: newDate.getFullYear(),
                    })
                  }
                }}
                markedDates={{
                  [date.dateString]: { selected: true, marked: true, selectedTextColor: ((new Date(date.timestamp)).toString().split(" ")[4] === "12:00:00") ? colors.zinc700 : "white", selectedColor: ((new Date(date.timestamp)).toString().split(" ")[4] === "12:00:00") ? "white" : date.dateString === today.dateString ? colors.zinc400 : colors.theme500 },
                }}
                theme={{
                  todayTextColor: colors.theme500,
                  todayBackgroundColor: colors.zinc200,
                  arrowColor: colors.theme400,
                  monthTextColor: 'black',
                }}
                className="rounded-t-xl px-5"
              />
              
              {/* MONTH button */}
              {allowMonth && (
                <TouchableOpacity 
                  className={`absolute z-50 mt-5 py-1 px-2 w-1/2 h-[28px] rounded-md flex justify-center items-center border-2 ${((new Date(date.timestamp)).toString().split(" ")[4] === "12:00:00") ? "border-theme500" : "border-white"}`}
                  onPress={() => {
                    const newDate = (new Date(visibleDate.year, visibleDate.month - 1, visibleDate.day, 12, 0, 0, 0));
                    setDate({
                      dateString: newDate.toLocaleDateString('en-CA'),
                      day: newDate.getDate(),
                      month: newDate.getMonth() + 1,
                      timestamp: newDate.getTime(),
                      year: newDate.getFullYear(),
                    })
                  }}
                />
              )}
            </>
          )}
        </View>

        {/* BOTTOM BAR */}
        <View className="flex flex-row border-t-[1px] border-zinc400 bg-zinc200 w-2/3 justify-between items-center h-[50px] px-5">
          
          {/* Submit button */}
          <Icon
            name="checkmark-circle"
            size={24}
            color={colors.zinc600}
            onPress={() => closeModal(date)}
          />

          <View className="flex flex-row space-x-2 justify-center items-center">
            {/* TODAY button */}
            <TouchableOpacity
              onPress={() => setDate(today)}
            >
              <Text className="bg-theme300 text-black px-5 py-2 rounded-3xl">
                TODAY
              </Text>
            </TouchableOpacity>

            {/* NULL button */}
            {allowNull && (
              <Icon
                name="ban"
                size={20}
                onPress={() => setDate({})}
              />
            )}
          </View>
          
          {/* Cancel button */}
          <Icon
            name="close-circle"
            size={24}
            color={colors.zinc600}
            onPress={() => setModalVisible(false)}
          />
        </View>
      </View>
    </Modal>
  );
};

///////////////////////////////// EXPORT /////////////////////////////////

export default CalendarModal;