///////////////////////////////// IMPORTS /////////////////////////////////

// Fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

// Initialize Firebase App
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

// storeKey = 'a', 'mb', 'sm', 'ss', 't', 'w'
// typeKey = current list of types
export const storeIngredientFetch = async (storeKey, typeKey, ingredientSnapshot) => {

  
  ///////////////////////////////// FUNCTION /////////////////////////////////
  
  try {


    ///////////////////////////////// DATA /////////////////////////////////

    // const querySnapshot = await getDocs(collection(db, 'ingredients'));
    const ingredientsArray = ingredientSnapshot?.docs.map((doc) => {
      const ingredient = doc.data();

      // CALCULATION DATA
      let size = ingredient[`${storeKey}ServingSize`] || '';
      let unit = ingredient[`${storeKey}Unit`] || '';
      let container = ingredient[`${storeKey}ServingContainer`] || '';
      let cal = ingredient[`${storeKey}CalServing`] || '';
      let price = ingredient[`${storeKey}PriceContainer`] || '';

      // THE LINK
      const storeLink = ingredient[`${storeKey}Link`];
      const validLink = storeLink && storeLink !== '#' ? storeLink : null;
      
      // FINAL DATA
      const formattedIngredient = {
        id: doc.id,
        ingredientName: {
          text: ingredient.ingredientName,
          link: validLink,
        },
        ingredientType: ingredient.ingredientType || [],
        brand: ingredient[`${storeKey}Brand`] || '',
        servingSize: `${size} ${unit}`,
        servingContainer: container,
        totalYield: (size === "" || container === "") ? "" : `${(new Fractional(size)).multiply(new Fractional(container)).toString()} ${unit}`, 
        calServing: cal,
        calContainer: (cal === "" || container === "") ? "" : `${((new Fraction((new Fractional(cal)).multiply(new Fractional(container)).toString())) * 1).toFixed(0)}`,
        priceServing: (price === "" || container === "") ? "" : `$${((new Fraction((new Fractional(price)).divide(new Fractional(container)).toString())) * 1).toFixed(2)}`,
        priceContainer: `${price === "" ? "" : `$${parseFloat(price).toFixed(2)}`}`
      };

      return formattedIngredient;
    })
    // filters the results based on the provided typeKey
    .filter(ingredient => 
      Array.isArray(ingredient.ingredientType) 
        ? ingredient.ingredientType.includes(typeKey) 
        : ingredient.ingredientType === typeKey
    );

    return ingredientsArray;

  } catch (error) {
    console.error('Error fetching ingredients:', error);
    throw error;
  }
};