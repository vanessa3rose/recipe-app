///////////////////////////////// IMPORTS /////////////////////////////////

// store lists
import storeKeys from '../../assets/storeKeys';

// fractions
import Fraction from 'fraction.js';

// validation
import isFraction from '../../components/Validation/isFraction';

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
      const storeData = updatedIngredient?.ingredientData?.[store] || {};
      
      // values
      const servingSize = storeData.servingSize; 
      const servingContainer = storeData.servingContainer; 
      const calServing = storeData.calServing; 
      const priceContainer = storeData.priceContainer; 

      const hasValidPrice = isFraction(priceContainer);
      const hasValidContainer = isFraction(servingContainer) && new Fraction(servingContainer).valueOf() > 0;

      // calculations
      const totalYield = (isFraction(servingSize) && isFraction(servingContainer)) ? new Fraction(servingSize).mul(new Fraction(servingContainer)).simplify(0.001).toFraction(true) : "";
      const calContainer = (isFraction(calServing) && isFraction(servingContainer)) ? new Fraction(calServing).mul(new Fraction(servingContainer)).valueOf().toFixed(0) : "";
      const priceServing = (hasValidPrice && hasValidContainer) ? new Fraction(priceContainer).div(new Fraction(servingContainer)).valueOf().toFixed(2) : "";
    
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

      if (Array.isArray(recipeData?.ingredientIds)) {
        let recipeModified = false;

        // only updates recipe ingredients if they match the edited one's id
        recipeData.ingredientIds.forEach((id, index) => {
          if (id !== null && id === editingId) {
            
            // stores that the recipe was modified
            recipeModified = true;

            // stores the given ingredient's data
            recipeData.ingredientData[index] = ingredient?.ingredientData;
            recipeData.ingredientNames[index] = ingredient?.ingredientName;
            recipeData.ingredientTypes[index] = ingredient?.ingredientTypes;


            // if the current ingredient data is valid
            if (ingredient !== null) {
              const storeObj = ingredient.ingredientData?.[recipeData.ingredientStores?.[index]] || {};

              // simple calculations
              const rawAmount = recipeData.ingredientAmounts?.[index];
              const rawYield = storeObj.totalYield;
              const rawCal = storeObj.calContainer;
              const rawPrice = storeObj.priceContainer;
              
              // validation
              const hasValidInputs = isFraction(rawAmount) && isFraction(rawYield) && isFraction(rawCal) && isFraction(rawPrice);
              const amountFrac = hasValidInputs ? new Fraction(rawAmount) : null;
              const yieldFrac = hasValidInputs ? new Fraction(rawYield) : null;
              
              // calculations for the recipeData based on the amount of the current recipe
              if (!hasValidInputs || yieldFrac.valueOf() === 0) {
                recipeData.ingredientCals[index] = "";
                recipeData.ingredientPrices[index] = "";
                recipeData.ingredientServings[index] = "";
              } else if (amountFrac.valueOf() === 0) {
                recipeData.ingredientCals[index] = 0;
                recipeData.ingredientPrices[index] = 0;
                recipeData.ingredientServings[index] = 0;
              } else {
                recipeData.ingredientCals[index] = amountFrac.div(yieldFrac).mul(new Fraction(rawCal)).valueOf();
                recipeData.ingredientPrices[index] = amountFrac.div(yieldFrac).mul(new Fraction(rawPrice)).valueOf();
                recipeData.ingredientServings[index] = yieldFrac.div(new Fraction(rawAmount)).valueOf();
              }

              // calculates the next store based on the brands that are and are not empty
              const currStore = recipeData.ingredientStores[index];
              
              // only does so if the current brand isn't valid
              if (recipeData.ingredientData[index][currStore].brand === "") {
                let nextStore = currStore;

                for (let i = 1; i <= storeKeys.length; i++) {
                  if (recipeData.ingredientData[index][storeKeys[(storeKeys.indexOf(currStore) + i) % storeKeys.length]].brand !== "") {
                    nextStore = storeKeys[(storeKeys.indexOf(currStore) + i) % storeKeys.length];
                    break;
                  }
                }
                recipeData.ingredientStores[index] = nextStore;
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
          let totalCal = new Fraction(0);
          let totalPrice = new Fraction(0);
          let totalServing = new Fraction(0);

          // loops over the 12 ingredients and performs calculations
          for (var i = 0; i < 12; i++) {

            // if the current ingredient is checked
            if (recipeData.ingredientChecks[i]) {
              // total calories
              if (isFraction(recipeData.ingredientCals[i])) { totalCal = totalCal.add(new Fraction(recipeData.ingredientCals[i])); }
              // total price
              if (isFraction(recipeData.ingredientPrices[i])) { totalPrice = totalPrice.add(new Fraction(recipeData.ingredientPrices[i])); }
              // servings possible
              if (isFraction(recipeData.ingredientServings[i])) {
                const servingFrac = new Fraction(recipeData.ingredientServings[i]);
                if (servingFrac.valueOf() > totalServing.valueOf()) { totalServing = servingFrac; }
              }
            }
          }

          // sets the calculated data
          recipeData.recipeCal = totalCal.valueOf().toFixed(0);
          recipeData.recipePrice = totalPrice.valueOf().toFixed(2);
          recipeData.recipeServing = totalServing.valueOf().toFixed(2);

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

      if (Array.isArray(spotlightData.ingredientIds)) {
        let spotlightModified = false;

        // only updates spotlight ingredients if they match the deleted one's id
        spotlightData.ingredientIds.forEach((id, index) => {
          if (id !== null && id === editingId) {

            // stores that the spotlight was modified
            spotlightModified = true;

            // stores the given ingredient's data
            spotlightData.ingredientData[index] = ingredient?.ingredientData;
            spotlightData.ingredientNames[index] = ingredient?.ingredientName;
            spotlightData.ingredientTypes[index] = ingredient?.ingredientTypes;


            // if the current ingredient data is valid
            if (ingredient !== null) {
              const storeObj = ingredient.ingredientData?.[spotlightData.ingredientStores?.[index]] || {};

              // simple calculations
              const rawAmount = spotlightData.ingredientAmounts?.[index];
              const rawYield = storeObj.totalYield;
              const rawCal = storeObj.calContainer;
              const rawPrice = storeObj.priceContainer;
              
              // validation
              const hasValidInputs = isFraction(rawAmount) && isFraction(rawYield) && isFraction(rawCal) && isFraction(rawPrice);
              const amountFrac = hasValidInputs ? new Fraction(rawAmount) : null;
              const yieldFrac = hasValidInputs ? new Fraction(rawYield) : null;

              // calculations for the spotlightData based on the amount of the current spotlight
              if (!hasValidInputs || yieldFrac.valueOf() === 0) {
                spotlightData.ingredientCals[index] = "";
                spotlightData.ingredientPrices[index] = "";
                spotlightData.ingredientServings[index] = "";
              } else if (amountFrac.valueOf() === 0) {
                spotlightData.ingredientCals[index] = 0;
                spotlightData.ingredientPrices[index] = 0;
                spotlightData.ingredientServings[index] = 0;
              } else {
                spotlightData.ingredientCals[index] = amountFrac.div(yieldFrac).mul(new Fraction(rawCal)).valueOf();
                spotlightData.ingredientPrices[index] = amountFrac.div(yieldFrac).mul(new Fraction(rawPrice)).valueOf();
                spotlightData.ingredientServings[index] = yieldFrac.div(new Fraction(rawAmount)).valueOf();
              }
          
              // calculates the next store based on the brands that are and are not empty
              const currStore = spotlightData.ingredientStores[index];

              // only does so if the current brand isn't valid
              if (spotlightData.ingredientData[index][currStore].brand === "") {
                let nextStore = currStore;

                for (let i = 1; i <= storeKeys.length; i++) {
                  if (spotlightData.ingredientData[index][storeKeys[(storeKeys.indexOf(currStore) + i) % storeKeys.length]].brand !== "") {
                    nextStore = storeKeys[(storeKeys.indexOf(currStore) + i) % storeKeys.length];
                    break;
                  }
                }
                spotlightData.ingredientStores[index] = nextStore;
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
          let totalCal = new Fraction(0);
          let totalPrice = new Fraction(0);
          let totalServing = new Fraction(0);
      
          // loops over the 12 ingredients and performs calculations
          for (var i = 0; i < 12; i++) {
            // total calories
            if (isFraction(spotlightData.ingredientCals[i])) { totalCal = totalCal.add(new Fraction(spotlightData.ingredientCals[i])); }
            // total price
            if (isFraction(spotlightData.ingredientPrices[i])) { totalPrice = totalPrice.add(new Fraction(spotlightData.ingredientPrices[i])); } 
            // servings possible
            if (isFraction(spotlightData.ingredientServings[i])) {
              const servingFrac = new Fraction(spotlightData.ingredientServings[i]);
              if (servingFrac.valueOf() > totalServing.valueOf()) { totalServing = servingFrac; }
            }
          }

          // sets the calculated data
          spotlightData.spotlightCal = totalCal.valueOf().toFixed(0);
          spotlightData.spotlightPrice = totalPrice.valueOf().toFixed(2);
          spotlightData.spotlightServing = totalServing.valueOf().toFixed(2);
          
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