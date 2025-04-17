///////////////////////////////// IMPORTS /////////////////////////////////

// Initialize Firebase App
import { getFirestore, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

export async function recipeDelete(
  recipeId, setRecipeId, setRecipeData,
) {

  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {

    // gets the current recipe and deletes it
    await deleteDoc(doc(db, 'recipes', recipeId));

    // restores the current recipe id and data
    setRecipeId(null);
    setRecipeData(null);
    
    // stores the recipe data in the firebase
    updateDoc(doc(db, 'globals', 'recipe'), { id: null });

  } catch (error) {
    console.error('Error deleting recipe:', error);
  }
};