///////////////////////////////// IMPORTS /////////////////////////////////

// Fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

// Initialize Firebase App
import { getFirestore, doc, deleteDoc, collection, getDocs, getDoc, writeBatch } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

export async function ingredientDelete(ingredientId) {

  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {

    ///////////////////////////////// INGREDIENTS /////////////////////////////////

    const ingredientRef = doc(db, 'ingredients', ingredientId);
    await deleteDoc(ingredientRef);


    ///////////////////////////////// RECIPES /////////////////////////////////

    // creates a batch for updating recipes
    const recipeBatch = writeBatch(db);

    // gets all recipe data
    const recipesSnapshot = await getDocs(collection(db, 'recipes'));

    // loops over all recipes
    recipesSnapshot.docs.forEach((recipeDoc) => {
      const recipeData = recipeDoc.data();

      if (recipeData.ingredientIds !== null && Array.isArray(recipeData.ingredientIds)) {
        let recipeModified = false; // tracks if changes were made

        // only updates recipe ingredients if they match the deleted one's id
        recipeData.ingredientIds.forEach((id, index) => {
          if (id !== null && id === ingredientId) {

            // stores that the recipe was modified
            recipeModified = true;

            // clears the attributes of deleted ingredients
            recipeData.ingredientAmounts[index] = "";
            recipeData.ingredientCals[index] = "";
            recipeData.ingredientChecks[index] = false;
            recipeData.ingredientData[index] = null;
            recipeData.ingredientIds[index] = "";
            recipeData.ingredientPrices[index] = "";
            recipeData.ingredientServings[index] = "";
            recipeData.ingredientStores[index] = "";
          }
        });
        

        // only updates if the recipe has been modified
        if (recipeModified) {

          // running totals
          let totalCal = 0;
          let totalPrice = 0;
          let totalServing = 0;

          // loops over the 12 ingredients and performs calculations
          for (var i = 0; i < 12; i++) {

            // if the current ingredient is checked
            if (recipeData.ingredientChecks[i]) {
              // total calories
              if (recipeData.ingredientCals[i] !== "") { totalCal += recipeData.ingredientCals[i]; }
              // total price
              if (recipeData.ingredientPrices[i] !== "") { totalPrice += recipeData.ingredientPrices[i]; }
              // servings possible
              if (recipeData.ingredientServings[i] !== "" && recipeData.ingredientServings[i] > totalServing) { totalServing = recipeData.ingredientServings[i]; }
            }
          }

          // sets the calculated data
          recipeData.recipeCal = ((new Fraction(totalCal.toString())) * 1).toFixed(0);
          recipeData.recipePrice = ((new Fraction(totalPrice.toString())) * 1).toFixed(2);
          recipeData.recipeServing = ((new Fraction(totalServing.toString())) * 1).toFixed(2);
          

          // add the update operation to the batch
          recipeBatch.update(doc(db, 'recipes', recipeDoc.id), recipeData);
        }
      }
    });

    // commit the recipe batch
    await recipeBatch.commit();


    ///////////////////////////////// SPOTLIGHTS /////////////////////////////////

    // create a batch for updating spotlights
    const spotlightBatch = writeBatch(db);

    // gets all spotlight data
    const spotlightsSnapshot = await getDocs(collection(db, 'spotlights'));

    // loops over all spotlights
    spotlightsSnapshot.docs.forEach((spotlightDoc) => {
      const spotlightData = spotlightDoc.data();

      if (spotlightData.ingredientIds !== null && Array.isArray(spotlightData.ingredientIds)) {
        let spotlightModified = false; // tracks if changes were made

        // only updates spotlight ingredients if they match the deleted one's id
        spotlightData.ingredientIds.forEach((id, index) => {
          if (id !== null && id === ingredientId) {

            // stores that the spotlight was modified
            spotlightModified = true;

            // clears the attributes of deleted ingredients
            spotlightData.ingredientAmounts[index] = "";
            spotlightData.ingredientCals[index] = "";
            spotlightData.ingredientData[index] = null;
            spotlightData.ingredientNameEdited[index] = false;
            spotlightData.ingredientAmountEdited[index] = false;
            spotlightData.ingredientStoreEdited[index] = false;
            spotlightData.ingredientIds[index] = "";
            spotlightData.ingredientPrices[index] = "";
            spotlightData.ingredientServings[index] = "";
            spotlightData.ingredientStores[index] = "";
          }
        });
        
        
        // only updates if the spotlight has been modified
        if (spotlightModified) {

          // running totals
          let totalCal = 0;
          let totalPrice = 0;
          let totalServing = 0;
      
          // loops over the 12 ingredients and performs calculations
          for (var i = 0; i < 12; i++) {
            // total calories
            if (spotlightData.ingredientCals[i] !== "") { totalCal += spotlightData.ingredientCals[i]; } 
            // total price
            if (spotlightData.ingredientPrices[i] !== "") { totalPrice += spotlightData.ingredientPrices[i]; }
            // servings possible
            if (spotlightData.ingredientServings[i] !== "" && spotlightData.ingredientServings[i] > totalServing) { totalServing = spotlightData.ingredientServings[i]; }
          }

          // sets the calculated data
          spotlightData.spotlightCal = ((new Fraction(totalCal.toString())) * 1).toFixed(0);
          spotlightData.spotlightPrice = ((new Fraction(totalPrice.toString())) * 1).toFixed(2);
          spotlightData.spotlightServing = ((new Fraction(totalServing.toString())) * 1).toFixed(2);


          // add the update operation to the batch
          spotlightBatch.update(doc(db, 'spotlights', spotlightDoc.id), spotlightData);
        }
      }
    });

    // commit the recipe batch
    await spotlightBatch.commit();


  } catch (error) {
    console.error('Error deleting ingredient:', error);
  }
};