///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect } from 'react';

// UI components
import { Modal, View, Text, TouchableOpacity } from 'react-native';

// modals
import ModNameModal from './ModNameModal';
import ModTypeModal from './ModTypeModal';
import ModBrandModal from './ModBrandModal';
import ModUnitModal from './ModUnitModal';


///////////////////////////////// SIGNATURE /////////////////////////////////

const ModDetailsModal = ({ 
  modalVisible, setModalVisible, closeModal, 
  initialQuery, ingredientsSnapshot, recipeSnapshot, spotlightSnapshot,
  initialType, initialTypeList, initialBrandLists,
}) => {


  ///////////////////////////////// ROUTING /////////////////////////////////

  const [detail, setDetail] = useState("");

  
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
        <View className={`flex ${detail !== "" ? "bg-transparent" : "bg-zinc200 border-[1px] border-zinc-400"} w-4/5 py-5 px-2 rounded-xl`}>

          {/* SELECTING */}
          {(detail === "") && (
            <>
              {/* HEADER */}
              <View className="flex flex-row justify-center px-4">
                <Text className="font-bold text-[18px] text-center text-black">
                  BATCH DETAIL EDITOR
                </Text>
              </View>
              
                          
              {/* Divider */}
              <View className="h-[1px] bg-zinc400 m-2 mb-4"/>

              {/* SELECTOR */}
              <View className="justify-center items-center">
                <View className="flex flex-col w-5/6 justify-center items-center bg-zinc300 py-5 space-y-5 border-2 border-zinc350">

                  {/* name */}
                  <TouchableOpacity 
                    className="bg-theme400 w-7/12 py-2 rounded-xl border border-theme500"
                    onPress={() => setDetail("name")}
                  >
                    <Text className="text-center font-semibold text-white">
                      NAME EDITOR
                    </Text>
                  </TouchableOpacity>

                  {/* type */}
                  <TouchableOpacity 
                    className="bg-theme500 w-7/12 py-2 rounded-xl border border-theme600"
                    onPress={() => setDetail("type")}
                  >
                    <Text className="text-center font-semibold text-white">
                      TYPE EDITOR
                    </Text>
                  </TouchableOpacity>

                  {/* brand */}
                  <TouchableOpacity 
                    className="bg-theme600 w-7/12 py-2 rounded-xl border border-theme700"
                    onPress={() => setDetail("brand")}
                  >
                    <Text className="text-center font-semibold text-white">
                      BRAND EDITOR
                    </Text>
                  </TouchableOpacity>

                  {/* unit */}
                  <TouchableOpacity 
                    className="bg-theme700 w-7/12 py-2 rounded-xl border border-theme800"
                    onPress={() => setDetail("unit")}
                  >
                    <Text className="text-center font-semibold text-white">
                      UNIT EDITOR
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}


          {/* VIEWING */}
          {detail === "name" 
          ?
            <ModNameModal 
              modalVisible={modalVisible} 
              setModalVisible={setModalVisible}
              closeModal={closeModal} 
              initialType={initialType}
              initialTypeList={initialTypeList}
              initialQuery={initialQuery}
              ingredientsSnapshot={ingredientsSnapshot}
              recipeSnapshot={recipeSnapshot}
              spotlightSnapshot={spotlightSnapshot}
            />
          : detail === "type"
          ?
            <ModTypeModal 
              modalVisible={modalVisible} 
              setModalVisible={setModalVisible}
              closeModal={closeModal} 
              initialType={initialType}
              initialTypeList={initialTypeList}
              initialQuery={initialQuery}
              ingredientsSnapshot={ingredientsSnapshot}
              recipeSnapshot={recipeSnapshot}
              spotlightSnapshot={spotlightSnapshot}
            />
          : detail === "brand"
          ?
            <ModBrandModal 
              modalVisible={modalVisible} 
              setModalVisible={setModalVisible}
              closeModal={closeModal} 
              initialBrandLists={initialBrandLists}
              ingredientsSnapshot={ingredientsSnapshot}
              recipeSnapshot={recipeSnapshot}
              spotlightSnapshot={spotlightSnapshot}
            />
          : detail === "unit"
          &&
            <ModUnitModal 
              modalVisible={modalVisible} 
              setModalVisible={setModalVisible}
              closeModal={closeModal} 
              initialBrandLists={initialBrandLists}
              ingredientsSnapshot={ingredientsSnapshot}
              recipeSnapshot={recipeSnapshot}
              spotlightSnapshot={spotlightSnapshot}
            />
          }
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ModDetailsModal;