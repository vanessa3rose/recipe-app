///////////////////////////////// IMPORTS /////////////////////////////////

// Initialize Firebase App
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
    
    const recipeCheck = false;
    const recipeTags = [];
    const recipeCal = "0";
    const recipePrice = "0.00";
    const recipeServing = "0.00";
    const ingredientChecks = [ false, false, false, false, false, false, false, false, false, false, false, false ]; 
    const ingredientData = [ null, null, null, null, null, null, null, null, null, null, null, null ];
    const ingredientIds = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 
    const ingredientAmounts = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 
    const ingredientStores = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 
    const ingredientCals = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 
    const ingredientPrices = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 
    const ingredientServings = [ "", "", "", "", "", "", "", "", "", "", "", "" ]; 
    
    const recipe = {
        recipeName, recipeCheck, recipeTags, recipeCal, recipePrice, recipeServing,
        ingredientChecks, ingredientData, ingredientIds, ingredientAmounts, ingredientStores,
        ingredientCals, ingredientPrices, ingredientServings,
    };
    
    ///////////////////////////////// PROCESSING /////////////////////////////////

    // Add the new ingredient to the Firestore 'recipes' collection
    const docRef = await addDoc(collection(db, "recipes"), recipeData === null ? recipe : recipeData);
    setRecipeId(docRef.id);
    
    // stores the recipe data in the firebase
    updateDoc(doc(db, 'globals', 'recipe'), { id: docRef.id });
    
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};


///////////////////////////////// EXPORT /////////////////////////////////

export default recipeAdd;