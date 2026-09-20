///////////////////////////////// IMPORTS /////////////////////////////////

// react hooks
import React, { useState, useEffect } from 'react';

// UI components
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';

// validation
import extractUnit from '../Validation/extractUnit';


///////////////////////////////// SIGNATURE /////////////////////////////////

const ViewDataModal = ({ 
  visibleIngredient, setVisibleIngredient, recipeSnapshot, spotlightSnapshot
}) => {


  ///////////////////////////////// RECIPE LIST /////////////////////////////////
  
  const [recipeList, setRecipeList] = useState(null);

  // on modal open
  useEffect(() => {
    fetchRecipeList();
  }, [recipeSnapshot]);

  // retrieves the list of recipes
  const fetchRecipeList = async () => {
    const list = [];

    // loops over the recipeSnapshot and finds all recipes including the ingredient
    if (recipeSnapshot) {
      recipeSnapshot.forEach((doc) => {
        if (doc.data().ingredientIds.indexOf(visibleIngredient.id) !== -1) {
          list.push(doc.data().recipeName);
        }
      });
    }

    setRecipeList(list)
  };


  ///////////////////////////////// SPOTLIGHT LIST /////////////////////////////////

  const [spotlightList, setSpotlightList] = useState(null);

  // on modal open
  useEffect(() => {
    fetchSpotlightList();
  }, [spotlightSnapshot]);

  // retrieves the name of the selected ingredient
  const fetchSpotlightList = async () => {
    const list = [];

    // loops over the spotlightSnapshot and finds all spotlights including the ingredient
    if (spotlightSnapshot) {
      spotlightSnapshot.forEach((doc) => {
        if (doc.data().ingredientIds.indexOf(visibleIngredient.id) !== -1) {
          list.push(doc.data().spotlightName);
        }
      });
    }

    setSpotlightList(list);
  };

  ///////////////////////////////// HTML /////////////////////////////////
  
  return (

    <Modal
      transparent={true}
      animationType="slide"
      visible={visibleIngredient !== null}
      onRequestClose={() => setVisibleIngredient(null)}
    >
      <View className="flex-1 justify-center items-center">
        
        {/* Background Overlay */}
        <TouchableOpacity onPress={() => setVisibleIngredient(null)} className="absolute bg-black opacity-50 w-full h-full"/>
        
        {/* Modal Content */}
        <View className="flex w-5/6 py-5 px-2 bg-zinc200 rounded-xl border-[1px] border-zinc-400 z-50">

          {/* Title */}
          <Text className="font-bold text-[16px] text-center text-black">
            {visibleIngredient.ingredientName}
          </Text>

          {/* Divider */}
          <View className="h-[1px] bg-zinc400 m-2 mb-4"/>

          {/* TYPE MAP*/}
          <View className="flex flex-row flex-wrap w-full justify-center items-center space-x-3 space-y-1.5 pb-1">
            {visibleIngredient.ingredientTypes.map((type, index) => (
              <View key={index} className="bg-theme800 rounded-lg">
                <Text className="text-white px-2 py-1 font-bold">{type.toUpperCase()}</Text>
              </View>
            ))}
          </View>
          

          {/* divider */}
          <View className="h-[3px] bg-zinc300 mt-2 mb-5 mx-8"/>
                    
                    
          {/* No Inclusions */}
          {(recipeList && recipeList.length === 0 && spotlightList && spotlightList.length === 0) && (
            <Text className="italic text-zinc500 text-center">
              {"this ingredient is not listed in any\nrecipes or spotlights"}
            </Text>
          )}

          <View className="flex flex-row justify-center items-start px-4">
          
            {/* Recipe List */}
            {(recipeList && recipeList.length > 0) && (
              <View className={`${(spotlightList && spotlightList.length > 0) ? "w-1/2 pr-2" : "w-3/4"}`}>
                <Text className="text-theme600 text-center font-bold pb-1">
                  RECIPES
                </Text>

                <ScrollView className="flex flex-col space-y-1 max-h-[180px] bg-zinc100 py-4 border-2 border-zinc300 rounded-lg">
                  {/* maps the recipe list */}
                  {recipeList?.sort((a,b) => a.localeCompare(b)).map((recipe, index) => 
                    <View
                      key={index} 
                      className={`flex flex-row justify-center items-center px-2 ${recipeList.length !== 1 && "mb-2"} ${(index !== recipeList.length - 1) && "border-b-2 border-zinc300"}`}
                    >
                      <Text className={`italic text-zinc700 text-center ${recipeList.length !== 1 && "pb-2"}`}>
                        {recipe}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          
            {/* Spotlight List */}
            {(spotlightList && spotlightList.length > 0) && (
              <View className={`${(recipeList && recipeList.length > 0) ? "w-1/2 pr-2" : "w-3/4"}`}>
                <Text className="text-theme600 text-center font-bold pb-1">
                  SPOTLIGHTS
                </Text>

                <ScrollView className="flex flex-col space-y-1 max-h-[180px] bg-zinc100 py-4 border-2 border-zinc300 rounded-lg">
                  {/* maps the recipe list */}
                  {spotlightList?.sort((a,b) => a.localeCompare(b)).map((recipe, index) => 
                    <View
                      key={index} 
                      className={`flex flex-row justify-center items-center px-2 ${spotlightList.length !== 1 && "mb-2"} ${(index !== spotlightList.length - 1) && "border-b-2 border-zinc300"}`}
                    >
                      <Text className={`italic text-zinc700 text-center ${spotlightList.length !== 1 && "pb-2"}`}>
                        {spotlightList}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}

          </View>
        </View>
      </View>
    </Modal>
  );
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ViewDataModal;