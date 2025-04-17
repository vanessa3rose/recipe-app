///////////////////////////////// IMPORTS /////////////////////////////////

import React, { useRef, useState, useEffect } from 'react';

// Fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

// Initialize Firebase App
import { getFirestore, collection, updateDoc, doc, getDocs, writeBatch } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const currentEdit = async ({
    editingId,
    ingredientId, ingredientData, check, containerPrice, amountTotal, amountLeft, unitPrice, ingredientStore,
}) => {


  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {

    
    ///////////////////////////////// DATA /////////////////////////////////

    // the data of the current ingredient that is being edited
    const current = {
      ingredientId, ingredientData, check, containerPrice, amountTotal, amountLeft, unitPrice, ingredientStore,
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
    
    // updates the Firestore 'ingredients' collection data
    await updateDoc(doc(db, "currents", editingId), current);
    
    
    ///////////////////////////////// MEAL PREPS /////////////////////////////////

    // for list of preps that are updated
    let updatedPreps = [];
  
    // creates a batch for updating meal preps
    const prepBatch = writeBatch(db);
 
    // gets all meal prep data
    const prepsSnapshot = await getDocs(collection(db, 'preps'));

    // loops over all meal preps
    prepsSnapshot.docs.forEach((prepDoc) => {
      const prepData = prepDoc.data();

      if (prepData.currentIds !== null && Array.isArray(prepData.currentIds)) {
        let prepModified = false; // tracks if changes were made

        // only updates meal prep ingredients if they match the edited one's id
        prepData.currentIds.forEach((id, index) => {
          if (id !== null && id === editingId) {

            // stores that the prep was modified
            prepModified = true;

            // stores the given current ingredient's data
            prepData.currentData[index] = current;


            // if the current ingredient data is valid
            if (current !== null) {
 
              // simple calculations
              const storeKey = current.ingredientStore;
              const amount = new Fractional(prepData.currentAmounts[index]);
              const servings = storeKey !== "" ? new Fractional(current.ingredientData[`${storeKey}TotalYield`]) : new Fractional(current.ingredientData.ServingSize);
              const cals = storeKey !== "" ? new Fractional(current.ingredientData[`${storeKey}CalContainer`]) : new Fractional(current.ingredientData.CalServing);
              const priceUnit = new Fractional(current.unitPrice);
              
              // calculations for the recipeData based on the amount of the current recipe
              if (isNaN(amount.toString()) || isNaN(priceUnit.numerator) || isNaN(priceUnit.denominator) || isNaN(servings.toString()) || isNaN(cals.toString())) {
                prepData.currentCals[index] = "";
                prepData.currentPrices[index] = "";
              } else if (amount.toString() === 0) {
                prepData.currentCals[index] = 0;
                prepData.currentPrices[index] = 0;
              } else {
                prepData.currentCals[index] = (new Fraction((amount.divide(servings)).multiply(cals).toString()) * 1);
                prepData.currentPrices[index] = (new Fraction((amount.multiply(priceUnit)).toString()) * 1);
              }

            // if the current ingredient is not valid, clear its values
            } else {
              prepData.currentAmounts[index] = "";
              prepData.currentCals[index] = "";
              prepData.currentData[index] = null;
              prepData.currentIds[index] = "";
              prepData.currentPrices[index] = "";
            }
          }
        });


        // only updates if the prep has been modified
        if (prepModified) {
       
          // running totals
          let totalCal = 0;
          let totalPrice = 0;
  
          // loops over the 12 ingredients and performs calculations
          for (var i = 0; i < 12; i++) {
            // total calories
            if (prepData.currentCals[i] !== "") { totalCal += prepData.currentCals[i]; }
            // total price
            if (prepData.currentPrices[i] !== "") { totalPrice += prepData.currentPrices[i]; }
          }

          // sets the calculated data
          prepData.prepCal = ((new Fraction(totalCal.toString())) * 1).toFixed(0);
          prepData.prepPrice = ((new Fraction(totalPrice.toString())) * 1).toFixed(2);
          
          // add the update operation to the batch
          prepBatch.update(doc(db, 'preps', prepDoc.id), prepData);
          updatedPreps.push({"id": prepDoc.id, "data": prepData});
        }
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
    const plansSnapshot = await getDocs(collection(db, 'plans'));

    // loops over all weekly plans
    plansSnapshot.forEach((planDoc) => {
      const planData = planDoc.data();
      
      // only looks at plans past today
      if (planDoc.id >= today.dateString) {
        
        // if the current meal prep is the lunch of the current plan date, update the data
        if (planData.meals.lunch.prepId && updatedIds.includes(planData.meals.lunch.prepId)) {
          planBatch.update(doc(db, 'plans', planDoc.id), {
            'meals.lunch.prepData': updatedData[updatedIds.indexOf(planData.meals.lunch.prepId)],
          });
        }

        // if the current meal prep is the dinner of the current plan date, update the data
        if (planData.meals.dinner.prepId && updatedIds.includes(planData.meals.dinner.prepId)) {
          planBatch.update(doc(db, 'plans', planDoc.id), {
            'meals.dinner.prepData': updatedData[updatedIds.indexOf(planData.meals.dinner.prepId)],
          });
        }
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