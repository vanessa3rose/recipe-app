///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

import colors from '../../assets/colors';

import { ingredientDelete } from '../../firebase/Ingredients/ingredientDelete';

// Initialize Firebase App
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const DeleteIngredientModal = ({ 
  id, recipeSnapshot, spotlightSnapshot, visible, onConfirm, onCancel 
}) => {


///////////////////////////////// INGREDIENT NAME /////////////////////////////////

  const [ingredientName, setIngredientName] = useState('');

  // on modal open
  useEffect(() => {
    fetchIngredientName();
  }, [id]);

  // retrieves the name of the selected ingredient
  const fetchIngredientName = async () => {
    if (id) {
      try {
        const docRef = doc(db, 'ingredients', id);
        const docSnap = await getDoc(docRef);
  
        if (docSnap.exists()) {
          setIngredientName(docSnap.data().ingredientName);
        } else {
          console.error('No such document!');
          setIngredientName('Unknown Ingredient');
        }
      } catch (error) {
        console.error('Error fetching ingredient:', error);
      }
    }
  };


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
          if (doc.data().ingredientIds.indexOf(id) !== -1) {
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
          if (doc.data().ingredientIds.indexOf(id) !== -1) {
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
      visible={visible}
      animationType="slide"
    >
      <View className="flex-1 justify-center items-center">

        {/* Background Overlay */}
        <View className="absolute bg-black opacity-50 w-full h-full"/>
            
        {/* Modal Content */}
        <View className="w-3/4 bg-zinc200 px-7 py-10 rounded-2xl">

          {/* Confirmation Text */}
          <Text>
            <Text className="text-[20px] font-bold text-center leading-[26px]">
              {"Are you sure you want to delete "}
            </Text>
            <Text className="text-[20px] font-bold text-center text-theme400 leading-[26px]">
              {ingredientName}
            </Text>
            <Text className="text-[20px] font-bold text-center">
              {"?"}
            </Text>
          </Text>

          {/* divider */}
          <View className="h-[1px] bg-zinc400 my-5 mx-2"/>
          
          
          {/* No Warning */}
          {recipeList && recipeList.length === 0 && spotlightList && spotlightList.length === 0 &&
            <Text className="italic text-zinc450 text-center">
              {"this ingredient is not listed in any\nrecipes or spotlights"}
            </Text>
          }

          {/* Recipe Warning */}
          {recipeList && recipeList.length > 0 &&
            <View className="space-y-2">
              <Text className="italic text-zinc600 text-center">
                recipes including this ingredient:
              </Text>
              <View className="flex flex-col pl-2">
                {/* maps the recipe list */}
                {recipeList?.map((recipe, index) => 
                  <View className="flex flex-row space-x-2" key={index}>
                    <Text className="italic text-pink-700 text-left">
                      {"-"}
                    </Text>
                    <Text className="italic text-pink-700 text-left">
                      {recipe}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          }

          {/* Double Warning */}
          {recipeList && recipeList.length > 0 && spotlightList && spotlightList.length > 0 &&
            // divider
            <View className="h-[1px] bg-zinc350 m-4"/>
          }
          
          {/* Spotlight Warning */}
          {spotlightList && spotlightList.length > 0 &&
            <View className="space-y-2">
              <Text className="italic text-zinc600 text-center">
                spotlights including this ingredient:
              </Text>
              <View className="flex flex-col pl-2">
                {/* maps the spotlight list */}
                {spotlightList?.map((spotlight, index) => 
                  <View className="flex flex-row space-x-2" key={index}>
                    <Text className="italic text-pink-700 text-left">
                      {"-"}
                    </Text>
                    <Text className="italic text-pink-700 text-left">
                      {spotlight}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          }



          <View className="flex flex-row justify-around pt-8">

            {/* Delete Button */}
            <TouchableOpacity
              className="bg-theme500 p-2.5 rounded-[5px]"
              onPress={() => {
                ingredientDelete(id);
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

export default DeleteIngredientModal;