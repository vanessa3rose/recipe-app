///////////////////////////////// IMPORTS /////////////////////////////////

// fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

// initialize firebase app
import { getFirestore, collection, updateDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const currentEdit = async ({
    editingId,
    amountLeft, amountTotal, archive, check, containerPrice, 
    ingredientData, ingredientId, ingredientName, ingredientStore, ingredientTypes,
    unitPrice,
}) => {


  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {

    
    ///////////////////////////////// DATA /////////////////////////////////

    // the data of the current ingredient that is being edited
    const current = {
      editingId,
      amountLeft, amountTotal, archive, check, containerPrice, 
      ingredientData, ingredientId, ingredientName, ingredientStore, ingredientTypes,
      unitPrice,
    };

    // today's current date
    const today = (() => {
      const localDate = new Date();

      return {
        dateString: localDate.toLocaleDateString('en-CA'),
        day: localDate.getDate(),
        month: localDate.getMonth() + 1,
        timestamp: localDate.getTime(),
        year: localDate.getFullYear(),
      };
    })();


    ///////////////////////////////// PROCESSING /////////////////////////////////
    
    // updates the Firestore 'CURRENTS' collection data
    await updateDoc(doc(db, 'CURRENTS', editingId), current);
    
    
    ///////////////////////////////// MEAL PREPS /////////////////////////////////

    // for list of preps that are updated
    let updatedPreps = [];
  
    // creates a batch for updating meal preps
    const prepBatch = writeBatch(db);
 
    // gets all meal prep data
    const prepsSnapshot = await getDocs(collection(db, 'PREPS'));

    // loops over all meal preps
    prepsSnapshot.docs.forEach((prepDoc) => {
      let prepData = prepDoc.data();
      let prepModified = false; // tracks if prep changes were made

      // loops over the variants
      prepData.variants?.forEach((variant) => {
        if (variant.currentIds && Array.isArray(variant.currentIds)) {
          let variantModified = false; // tracks if variant changes were made

          // only updates meal prep ingredients if they match the edited one's id
          variant.currentIds.forEach((id, index) => {
            if (id !== null && id === editingId) {

              // stores that the prep was modified
              prepModified = true;
              variantModified = true;

              // stores the given current ingredient's data
              variant.currentData[index] = current;


              // if the current ingredient data is valid
              if (current !== null) {
  
                // simple calculations
                const storeKey = current.ingredientStore;
                const amount = new Fractional(variant.currentAmounts[index] === "" ? 0 : variant.currentAmounts[index]);
                const servings = storeKey !== "-" ? new Fractional(current.ingredientData[storeKey].totalYield) : new Fractional(current.ingredientData["-"].servingSize);
                const cals = storeKey !== "-" ? new Fractional(current.ingredientData[storeKey].calContainer) : new Fractional(current.ingredientData["-"].calServing);
                const priceUnit = new Fractional(current.unitPrice);
                
                // calculations for the recipeData based on the amount of the current recipe
                if (isNaN(new Fraction(amount.toString()).valueOf()) || isNaN(new Fraction(priceUnit.toString()).valueOf()) || isNaN(new Fraction(servings.toString()).valueOf()) || isNaN(new Fraction(cals.toString()).valueOf())) {
                  variant.currentCals[index] = "";
                  variant.currentPrices[index] = "";
                } else if (amount.toString() === 0) {
                  variant.currentCals[index] = 0;
                  variant.currentPrices[index] = 0;
                } else {
                  variant.currentCals[index] = (new Fraction((amount.divide(servings)).multiply(cals).toString()) * 1);
                  variant.currentPrices[index] = (new Fraction((amount.multiply(priceUnit)).toString()) * 1);
                }

              // if the current ingredient is not valid, clear its values
              } else {
                variant.currentAmounts[index] = "";
                variant.currentCals[index] = "";
                variant.currentData[index] = null;
                variant.currentIds[index] = "";
                variant.currentPrices[index] = "";
                variant.currentIncluded[index] = false;
              }
            }
          })


          // only updates if the variant has been modified
          if (variantModified) {
        
            // running totals
            let totalCal = 0;
            let totalPrice = 0;
    
            // loops over the 12 ingredients and performs calculations
            for (var i = 0; i < 12; i++) {
              // total calories
              if (variant.currentCals[i] !== "" && variant.currentIncluded[i]) { totalCal += variant.currentCals[i]; }
              // total price
              if (variant.currentPrices[i] !== "" && variant.currentIncluded[i]) { totalPrice += variant.currentPrices[i]; }
            }

            // sets the calculated data
            variant.prepCal = ((new Fraction(totalCal.toString())) * 1).toFixed(0);
            variant.prepPrice = ((new Fraction(totalPrice.toString())) * 1).toFixed(2);
          }
        }
      })

      // only updates if the prep has been modified
      if (prepModified) {
        // add the update operation to the batch
        prepBatch.update(doc(db, 'PREPS', prepDoc.id), prepData);
        updatedPreps.push({"id": prepDoc.id, "data": prepData});
      }
    });

    // commit the recipe batch
    await prepBatch.commit();

    // extracts data
    const updatedIds = updatedPreps.map(prep => prep.id);
    const updatedData = updatedPreps.map(prep => prep.data);

    ///////////////////////////////// WEEKLY PLANS /////////////////////////////////

    // creates a batch for updating plans
    const planBatch = writeBatch(db);

    // gets all weekly plan data
    const plansSnapshot = await getDocs(collection(db, 'PLANS'));

    // loops over all weekly plans
    plansSnapshot.forEach((planDoc) => {
      const planData = planDoc.data();
      
      // only looks at plans past today
      if (planDoc.id >= today.dateString) {
        const updates = {};
      
        // if the current meal prep is the lunch of the current plan date, update the data
        const lunchPrepId = planData.meals.lunch.prepId;
        const lunchVariantId = planData.meals.lunch.prepData?.variantId;
        if (lunchPrepId && lunchVariantId && updatedIds.includes(lunchPrepId)) {
          const updatedVariant = updatedData[updatedIds.indexOf(lunchPrepId)]?.variants.find(v => v.variantId === lunchVariantId);
          if (updatedVariant) { updates['meals.lunch.prepData'] = updatedVariant; }
        }

        // if the current meal prep is the dinner of the current plan date, update the data
        const dinnerPrepId = planData.meals.dinner.prepId;
        const dinnerVariantId = planData.meals.dinner.prepData?.variantId;
        if (dinnerPrepId && dinnerVariantId && updatedIds.includes(dinnerPrepId)) {
          const updatedVariant = updatedData[updatedIds.indexOf(dinnerPrepId)]?.variants.find(v => v.variantId === dinnerVariantId);
          if (updatedVariant) { updates['meals.dinner.prepData'] = updatedVariant; }
        }
        
        // adds the batches separately
        if (Object.keys(updates).length > 0) { planBatch.update(doc(db, 'PLANS', planDoc.id), updates); }
      }
    });
 
    // commit the batches separately
    await planBatch.commit();
    
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};


///////////////////////////////// EXPORT /////////////////////////////////

export default currentEdit;