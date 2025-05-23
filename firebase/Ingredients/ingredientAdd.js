///////////////////////////////// IMPORTS /////////////////////////////////

// store lists
import storeKeys from '../../assets/storeKeys';

// fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

// initialize firebase app
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const ingredientAdd = async ({
  newIngredient
}) => {


  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {


    ///////////////////////////////// DATA CALCULATIONS /////////////////////////////////
    
    // function to calculate totalYield, calContainer, and priceServing for each store
    const storeCalculations = (store) => {
      
      // values
      const servingSize = newIngredient.ingredientData[store].servingSize; 
      const servingContainer = newIngredient.ingredientData[store].servingContainer; 
      const calServing = newIngredient.ingredientData[store].calServing; 
      const priceContainer = newIngredient.ingredientData[store].priceContainer; 

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
        ...newIngredient.ingredientData[store],
        ...storeCalculations(store),
      };
    });

    // overall ingredient
    const ingredient = {
      ingredientName: newIngredient.ingredientName, 
      ingredientTypes: Array.isArray(newIngredient.ingredientTypes) ? newIngredient.ingredientTypes.map(type => type === "CUSTOM" ? "" : type) : newIngredient.ingredientTypes === "CUSTOM" ? "" : newIngredient.ingredientTypes,
      ingredientData: ingredientData,
    };


    ///////////////////////////////// PROCESSING /////////////////////////////////

    // Add the new ingredient to the Firestore 'INGREDIENTS' collection
    await addDoc(collection(db, 'INGREDIENTS'), ingredient);
    
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ingredientAdd;