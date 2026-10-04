///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React from 'react';

// UI components
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';

// firebase
import { currentDelete } from '../../firebase/Currents/currentDelete';


///////////////////////////////// SIGNATURE /////////////////////////////////

const DeleteCurrentModal = ({ 
  id, isChecked, prepList, currentName, visible, onConfirm, onCancel
}) => {

  
  ///////////////////////////////// HTML /////////////////////////////////

  return (

    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
    >
      <View className="flex-1 justify-center items-center">

        {/* Background Overlay */}
        <View className="absolute bg-black opacity-50 w-full h-full"/>
        
        {/* Modal Content */}
        <View className="w-3/4 bg-zinc200 px-7 py-10 rounded-2xl">

          {/* Confirmation Text */}
          <Text className="mb-4">
            <Text className="text-[20px] font-bold text-center leading-[26px]">
              {"Are you sure you want to delete "}
            </Text>
            <Text className="text-[20px] font-bold text-center text-theme400 leading-[26px]">
              {currentName}
            </Text>
            <Text className="text-[20px] font-bold text-center leading-[26px]">
              {"?"}
            </Text>
          </Text>

          {/* Warning */}
          {isChecked ?
            <View className="space-y-2.5">
              <Text className="italic text-zinc600 text-center px-5">
                before proceededing, delete any used up meal preps that include this ingredient
              </Text>
              <Text className="italic text-mauve700 text-center">
                this action will prevent prematurely removing the ingredient from today's meal preps in the planning tab
              </Text>
            </View>
          :
            <Text className="italic text-zinc450 text-center">
              this will remove the ingredient from any date on or after today in the planning tab
            </Text>
          }

          {/* Prep List */}
          {(prepList !== null && prepList.length > 0) && (
            <View className="space-y-2">
              {/* divider */}
              <View className="h-[1px] bg-zinc400 my-5 mx-2"/>

              <Text className="text-zinc600 text-center">
                preps including this ingredient:
              </Text>

              <ScrollView className="flex flex-col pl-4 pr-10 max-h-[180px]">
                {/* maps the recipe list */}
                {prepList?.sort((a,b) => a.localeCompare(b)).map((prep, index) => 
                  <View className="flex flex-row space-x-2" key={index}>
                    <Text className="italic text-mauve700 text-left">
                      {"-"}
                    </Text>
                    <Text className="italic text-mauve700 text-left">
                      {prep}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          <View className="flex flex-row justify-center space-x-10 pt-7">

            {/* Delete Button */}
            <TouchableOpacity
              className="bg-theme500 p-2.5 rounded-[5px]"
              onPress={() => {
                currentDelete(id);
                onConfirm();
              }}
            >
              <Text className="text-white font-bold text-[16px]">DELETE</Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              className="bg-zinc500 p-2.5 rounded-[5px]"
              onPress={onCancel}
            >
              <Text className="text-white font-bold text-[16px]">CANCEL</Text>
            </TouchableOpacity>

          </View>
        </View>
      </View>
    </Modal>
  );
}


///////////////////////////////// EXPORT /////////////////////////////////

export default DeleteCurrentModal;