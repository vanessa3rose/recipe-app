///////////////////////////////// IMPORTS /////////////////////////////////

// store lists
import storeKeys from '../../assets/storeKeys';

// fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

// initialize firebase app
import { getFirestore, collection, updateDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const ingredientEdit = async ({
  editingId, updatedIngredient
}) => {
  

  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {
    

    ///////////////////////////////// DATA CALCULATIONS /////////////////////////////////

    // function to calculate totalYield, calContainer, and priceServing for each store
    const storeCalculations = (store) => {
      
      // values
      const servingSize = updatedIngredient.ingredientData[store].servingSize; 
      const servingContainer = updatedIngredient.ingredientData[store].servingContainer; 
      const calServing = updatedIngredient.ingredientData[store].calServing; 
      const priceContainer = updatedIngredient.ingredientData[store].priceContainer; 

      // calculations
      const totalYield = (servingSize === "" || servingContainer === "") ? "" : `${(new Fractional(servingSize)).multiply(new Fractional(servingContainer)).toString()}`;
      const calContainer = (calServing === "" || servingContainer === "") ? "" : `${((new Fraction((new Fractional(calServing)).multiply(new Fractional(servingContainer)).toString())) * 1).toFixed(0)}`;
      const priceServing = (priceContainer === "" || servingContainer === "") ? "" : `${((new Fraction((new Fractional(priceContainer)).divide(new Fractional(servingContainer)).toString())) * 1).toFixed(2)}`;
    
      return { totalYield, calContainer, priceServing };
    };


    ///////////////////////////////// DATA /////////////////////////////////

    // ingredient data portion
    const ingredientData = {};
    storeKeys.forEach((store) => {
      ingredientData[store] = {
        ...updatedIngredient.ingredientData[store],
        ...storeCalculations(store),
      };
    });

    // overall ingredient
    const ingredient = {
      ingredientName: updatedIngredient.ingredientName, 
      ingredientTypes: updatedIngredient.ingredientTypes,
      ingredientData: ingredientData,
    };


    ///////////////////////////////// PROCESSING /////////////////////////////////
    
    // updates the Firestore 'INGREDIENTS' collection data
    await updateDoc(doc(db, 'INGREDIENTS', editingId), ingredient);


    ///////////////////////////////// RECIPES /////////////////////////////////
    
    // creates a batch for updating recipes
    const recipeBatch = writeBatch(db);

    // gets all recipe data
    const recipesSnapshot = await getDocs(collection(db, 'RECIPES'));

    // loops over all recipes
    recipesSnapshot.docs.forEach((recipeDoc) => {
      const recipeData = recipeDoc.data();

      if (recipeData.ingredientIds !== null && Array.isArray(recipeData.ingredientIds)) {
        let recipeModified = false; // tracks if changes were made

        // only updates recipe ingredients if they match the edited one's id
        recipeData.ingredientIds.forEach((id, index) => {
          if (id !== null && id === editingId) {

            // stores that the recipe was modified
            recipeModified = true;

            // stores the given ingredient's data
            recipeData.ingredientData[index] = ingredient.ingredientData;
            recipeData.ingredientNames[index] = ingredient.ingredientName;
            recipeData.ingredientTypes[index] = ingredient.ingredientTypes;


            // if the current ingredient data is valid
            if (ingredient !== null) {

              // simple calculations
              const amount = new Fractional(recipeData.ingredientAmounts[index]);
              const totalYield = new Fractional(ingredient.ingredientData[recipeData.ingredientStores[index]].totalYield);
              const calContainer = new Fractional(ingredient.ingredientData[recipeData.ingredientStores[index]].calContainer);
              const priceContainer = new Fractional(ingredient.ingredientData[recipeData.ingredientStores[index]].priceContainer);

              // calculations for the recipeData based on the amount of the current recipe
              if (isNaN(amount.toString()) || isNaN(totalYield.toString()) || isNaN(calContainer.toString()) || isNaN(priceContainer.toString())) {
                  recipeData.ingredientCals[index] = "";
                  recipeData.ingredientPrices[index] = "";
                  recipeData.ingredientServings[index] = "";
              } else if (amount.toString() === 0) {
                  recipeData.ingredientCals[index] = 0;
                  recipeData.ingredientPrices[index] = 0;
                  recipeData.ingredientServings[index] = 0;
              } else {
                  recipeData.ingredientCals[index] = (new Fraction((amount.divide(totalYield)).multiply(calContainer).toString()) * 1);
                  recipeData.ingredientPrices[index] = (new Fraction((amount.divide(totalYield)).multiply(priceContainer).toString()) * 1);
                  recipeData.ingredientServings[index] = (new Fraction((totalYield.divide(amount)).toString()) * 1);
              }

            // if the current ingredient is not valid, clear its values
            } else {
              recipeData.ingredientChecks[index] = false;
              recipeData.ingredientIds[index] = "";
              recipeData.ingredientNames[index] = "";
              recipeData.ingredientTypes[index] = [];
              recipeData.ingredientAmounts[index] = "";
              recipeData.ingredientStores[index] = "";
              recipeData.ingredientCals[index] = "";
              recipeData.ingredientPrices[index] = "";
              recipeData.ingredientServings[index] = "";
            }
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
          recipeBatch.update(doc(db, 'RECIPES', recipeDoc.id), recipeData);
        }
      }
    });

    // commit the recipe batch
    await recipeBatch.commit();


    ///////////////////////////////// SPOTLIGHTS /////////////////////////////////

    // create a batch for updating spotlights
    const spotlightBatch = writeBatch(db);

    // gets all spotlight data
    const spotlightsSnapshot = await getDocs(collection(db, 'SPOTLIGHTS'));

    // loops over all spotlights
    spotlightsSnapshot.docs.forEach((spotlightDoc) => {
      const spotlightData = spotlightDoc.data();

      if (spotlightData.ingredientIds !== null && Array.isArray(spotlightData.ingredientIds)) {
        let spotlightModified = false; // tracks if changes were made

        // only updates spotlight ingredients if they match the deleted one's id
        spotlightData.ingredientIds.forEach((id, index) => {
          if (id !== null && id === editingId) {

            // stores that the spotlight was modified
            spotlightModified = true;

            // stores the given ingredient's data
            spotlightData.ingredientData[index] = ingredient.ingredientData;
            spotlightData.ingredientNames[index] = ingredient.ingredientName;
            spotlightData.ingredientTypes[index] = ingredient.ingredientTypes;


            // if the current ingredient data is valid
            if (ingredient !== null) {

              // simple calculations
              const amount = new Fractional(spotlightData.ingredientAmounts[index]);
              const totalYield = new Fractional(ingredient.ingredientData[spotlightData.ingredientStores[index]].totalYield);
              const calContainer = new Fractional(ingredient.ingredientData[spotlightData.ingredientStores[index]].calContainer);
              const priceContainer = new Fractional(ingredient.ingredientData[spotlightData.ingredientStores[index]].priceContainer);

              // calculations for the spotlightData based on the amount of the current spotlight
              if (isNaN(amount.toString()) || isNaN(totalYield.toString()) || isNaN(calContainer.toString()) || isNaN(priceContainer.toString())) {
                spotlightData.ingredientCals[index] = "";
                spotlightData.ingredientPrices[index] = "";
                spotlightData.ingredientServings[index] = "";
              } else if (amount.toString() === 0) {
                spotlightData.ingredientCals[index] = 0;
                spotlightData.ingredientPrices[index] = 0;
                spotlightData.ingredientServings[index] = 0;
              } else {
                spotlightData.ingredientCals[index] = (new Fraction((amount.divide(totalYield)).multiply(calContainer).toString()) * 1);
                spotlightData.ingredientPrices[index] = (new Fraction((amount.divide(totalYield)).multiply(priceContainer).toString()) * 1);
                spotlightData.ingredientServings[index] = (new Fraction((totalYield.divide(amount)).toString()) * 1);
              }

            // if the current ingredient is not valid, clear its values
            } else {
              spotlightData.ingredientAmounts[index] = "";
              spotlightData.ingredientCals[index] = "";
              spotlightData.ingredientNames[index] = "";
              spotlightData.ingredientNameEdited[index] = true;
              spotlightData.ingredientAmountEdited[index] = true;
              spotlightData.ingredientStoreEdited[index] = true;
              spotlightData.ingredientIds[index] = "";
              spotlightData.ingredientPrices[index] = "";
              spotlightData.ingredientServings[index] = "";
              spotlightData.ingredientStores[index] = "";
              spotlightData.ingredientTypes[index] = [];
            }
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
          spotlightBatch.update(doc(db, 'SPOTLIGHTS', spotlightDoc.id), spotlightData);
        }
      }
    });
    
    // commit the spotlight batch
    await spotlightBatch.commit();
    
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ingredientEdit;