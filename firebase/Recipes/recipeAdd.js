///////////////////////////////// IMPORTS /////////////////////////////////

// initialize firebase app
import { getFirestore, collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const recipeAdd = async ({
  recipeName = "", setRecipeId,
  recipeData = null, 
}) => {


  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {
    
    
    ///////////////////////////////// DATA /////////////////////////////////
    
    const recipe = {
      recipeCal: "0",
      recipeCheck: false,
      recipeName: recipeName,
      recipePrice: "0.00",
      recipeServing: "0.00",
      recipeTags: [],
      ingredientAmounts: [ "", "", "", "", "", "", "", "", "", "", "", "" ],
      ingredientCals: [ "", "", "", "", "", "", "", "", "", "", "", "" ],
      ingredientChecks: [ false, false, false, false, false, false, false, false, false, false, false, false ],
      ingredientData: [ null, null, null, null, null, null, null, null, null, null, null, null ],
      ingredientIds: [ "", "", "", "", "", "", "", "", "", "", "", "" ],
      ingredientNames: [ "", "", "", "", "", "", "", "", "", "", "", "" ], 
      ingredientPrices: [ "", "", "", "", "", "", "", "", "", "", "", "" ],
      ingredientServings: [ "", "", "", "", "", "", "", "", "", "", "", "" ], 
      ingredientStores: [ "", "", "", "", "", "", "", "", "", "", "", "" ],
      ingredientTypes: {0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: []},
    };
    
    ///////////////////////////////// PROCESSING /////////////////////////////////

    // Add the new ingredient to the Firestore 'RECIPES' collection
    const docRef = await addDoc(collection(db, 'RECIPES'), recipeData === null ? recipe : recipeData);
    setRecipeId(docRef.id);
    
    // stores the recipe data in the firebase
    updateDoc(doc(db, 'GLOBALS', 'recipe'), { id: docRef.id });
    
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};


///////////////////////////////// EXPORT /////////////////////////////////

export default recipeAdd;