///////////////////////////////// IMPORTS /////////////////////////////////

// Fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

// Initialize Firebase App
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

export const allIngredientFetch = async () => {


  ///////////////////////////////// FUNCTION /////////////////////////////////
  
  try {


    ///////////////////////////////// DATA /////////////////////////////////

    const querySnapshot = await getDocs(collection(db, 'ingredients'));
      const ingredientsArray = querySnapshot.docs.map((doc, index) => {
      const ingredient = doc.data();
      
      // CALCULATION DATA
      let aSize = ingredient[`aServingSize`] || '';
      let aUnit = ingredient[`aUnit`] || '';
      let aContainer = ingredient[`aServingContainer`] || '';
      let aCal = ingredient[`aCalServing`] || '';
      let aPrice = ingredient[`aPriceContainer`] || '';

      let mbSize = ingredient[`mbServingSize`] || '';
      let mbUnit = ingredient[`mbUnit`] || '';
      let mbContainer = ingredient[`mbServingContainer`] || '';
      let mbCal = ingredient[`mbCalServing`] || '';
      let mbPrice = ingredient[`mbPriceContainer`] || '';

      let smSize = ingredient[`smServingSize`] || '';
      let smUnit = ingredient[`smUnit`] || '';
      let smContainer = ingredient[`smServingContainer`] || '';
      let smCal = ingredient[`smCalServing`] || '';
      let smPrice = ingredient[`smPriceContainer`] || '';

      let ssSize = ingredient[`ssServingSize`] || '';
      let ssUnit = ingredient[`ssUnit`] || '';
      let ssContainer = ingredient[`ssServingContainer`] || '';
      let ssCal = ingredient[`ssCalServing`] || '';
      let ssPrice = ingredient[`ssPriceContainer`] || '';

      let tSize = ingredient[`tServingSize`] || '';
      let tUnit = ingredient[`tUnit`] || '';
      let tContainer = ingredient[`tServingContainer`] || '';
      let tCal = ingredient[`tCalServing`] || '';
      let tPrice = ingredient[`tPriceContainer`] || '';

      let wSize = ingredient[`wServingSize`] || '';
      let wUnit = ingredient[`wUnit`] || '';
      let wContainer = ingredient[`wServingContainer`] || '';
      let wCal = ingredient[`wCalServing`] || '';
      let wPrice = ingredient[`wPriceContainer`] || '';

      // THE LINK
      const aStoreLink = ingredient[`aLink`];
      const aValidLink = aStoreLink && aStoreLink !== '#' ? aStoreLink : null;

      const mbStoreLink = ingredient[`mbLink`];
      const mbValidLink = mbStoreLink && mbStoreLink !== '#' ? mbStoreLink : null;

      const smStoreLink = ingredient[`smLink`];
      const smValidLink = smStoreLink && smStoreLink !== '#' ? smStoreLink : null;

      const ssStoreLink = ingredient[`ssLink`];
      const ssValidLink = aStoreLink && ssStoreLink !== '#' ? ssStoreLink : null;

      const tStoreLink = ingredient[`tLink`];
      const tValidLink = tStoreLink && tStoreLink !== '#' ? tStoreLink : null;

      const wStoreLink = ingredient[`wLink`];
      const wValidLink = wStoreLink && wStoreLink !== '#' ? wStoreLink : null;
      
      // FINAL DATA
      const formattedIngredient = {

        // general
        id: doc.id,
        ingredientName: ingredient.ingredientName,
        ingredientType: ingredient.ingredientType || [],

        // links
        aIngredientLink: aValidLink,
        mbIngredientLink: mbValidLink,
        smIngredientLink: smValidLink,
        ssIngredientLink: ssValidLink,
        tIngredientLink: tValidLink,
        wIngredientLink: wValidLink,

        // brands
        aBrand: ingredient[`aBrand`] || '',
        mbBrand: ingredient[`mbBrand`] || '',
        smBrand: ingredient[`smBrand`] || '',
        ssBrand: ingredient[`ssBrand`] || '',
        tBrand: ingredient[`tBrand`] || '',
        wBrand: ingredient[`wBrand`] || '',

        // serving sizes
        aServingSize: `${aSize} ${aUnit}`,
        mbServingSize: `${mbSize} ${mbUnit}`,
        smServingSize: `${smSize} ${smUnit}`,
        ssServingSize: `${ssSize} ${ssUnit}`,
        tServingSize: `${tSize} ${tUnit}`,
        wServingSize: `${wSize} ${wUnit}`,

        // servings per container
        aServingContainer: aContainer,
        mbServingContainer: mbContainer,
        smServingContainer: smContainer,
        ssServingContainer: ssContainer,
        tServingContainer: tContainer,
        wServingContainer: wContainer,

        // total yield
        aTotalYield: (aSize === "" || aContainer === "") ? "" : `${(new Fractional(aSize)).multiply(new Fractional(aContainer)).toString()} ${aUnit}`, 
        mbTotalYield: (mbSize === "" || mbContainer === "") ? "" : `${(new Fractional(mbSize)).multiply(new Fractional(mbContainer)).toString()} ${mbUnit}`, 
        smTotalYield: (smSize === "" || smContainer === "") ? "" : `${(new Fractional(smSize)).multiply(new Fractional(smContainer)).toString()} ${smUnit}`, 
        ssTotalYield: (ssSize === "" || ssContainer === "") ? "" : `${(new Fractional(ssSize)).multiply(new Fractional(ssContainer)).toString()} ${ssUnit}`, 
        tTotalYield: (tSize === "" || tContainer === "") ? "" : `${(new Fractional(tSize)).multiply(new Fractional(tContainer)).toString()} ${tUnit}`, 
        wTotalYield: (wSize === "" || wContainer === "") ? "" : `${(new Fractional(wSize)).multiply(new Fractional(wContainer)).toString()} ${wUnit}`, 

        // calories per serving
        aCalServing: aCal,
        mbCalServing: mbCal,
        smCalServing: smCal,
        ssCalServing: ssCal,
        tCalServing: tCal,
        wCalServing: wCal,

        // calories per container
        aCalContainer: (aCal === "" || aContainer === "") ? "" : `${((new Fraction((new Fractional(aCal)).multiply(new Fractional(aContainer)).toString())) * 1).toFixed(0)}`,
        mbCalContainer: (mbCal === "" || mbContainer === "") ? "" : `${((new Fraction((new Fractional(mbCal)).multiply(new Fractional(mbContainer)).toString())) * 1).toFixed(0)}`,
        smCalContainer: (smCal === "" || smContainer === "") ? "" : `${((new Fraction((new Fractional(smCal)).multiply(new Fractional(smContainer)).toString())) * 1).toFixed(0)}`,
        ssCalContainer: (ssCal === "" || ssContainer === "") ? "" : `${((new Fraction((new Fractional(ssCal)).multiply(new Fractional(ssContainer)).toString())) * 1).toFixed(0)}`,
        tCalContainer: (tCal === "" || tContainer === "") ? "" : `${((new Fraction((new Fractional(tCal)).multiply(new Fractional(tContainer)).toString())) * 1).toFixed(0)}`,
        wCalContainer: (wCal === "" || wContainer === "") ? "" : `${((new Fraction((new Fractional(wCal)).multiply(new Fractional(wContainer)).toString())) * 1).toFixed(0)}`,        
        
        // price per serving
        aPriceServing: (aPrice === "" || aContainer === "") ? "" : `$${((new Fraction((new Fractional(aPrice)).divide(new Fractional(aContainer)).toString())) * 1).toFixed(2)}`,
        mbPriceServing: (mbPrice === "" || mbContainer === "") ? "" : `$${((new Fraction((new Fractional(mbPrice)).divide(new Fractional(mbContainer)).toString())) * 1).toFixed(2)}`,
        smPriceServing: (smPrice === "" || smContainer === "") ? "" : `$${((new Fraction((new Fractional(smPrice)).divide(new Fractional(smContainer)).toString())) * 1).toFixed(2)}`,
        ssPriceServing: (ssPrice === "" || ssContainer === "") ? "" : `$${((new Fraction((new Fractional(ssPrice)).divide(new Fractional(ssContainer)).toString())) * 1).toFixed(2)}`,
        tPriceServing: (tPrice === "" || tContainer === "") ? "" : `$${((new Fraction((new Fractional(tPrice)).divide(new Fractional(tContainer)).toString())) * 1).toFixed(2)}`,
        wPriceServing: (wPrice === "" || wContainer === "") ? "" : `$${((new Fraction((new Fractional(wPrice)).divide(new Fractional(wContainer)).toString())) * 1).toFixed(2)}`,

        // price per container
        aPriceContainer: `${aPrice === "" ? "" : `$${parseFloat(aPrice).toFixed(2)}`}`,
        mbPriceContainer: `${mbPrice === "" ? "" : `$${parseFloat(mbPrice).toFixed(2)}`}`,
        smPriceContainer: `${smPrice === "" ? "" : `$${parseFloat(smPrice).toFixed(2)}`}`,
        ssPriceContainer: `${ssPrice === "" ? "" : `$${parseFloat(ssPrice).toFixed(2)}`}`,
        tPriceContainer: `${tPrice === "" ? "" : `$${parseFloat(tPrice).toFixed(2)}`}`,
        wPriceContainer: `${wPrice === "" ? "" : `$${parseFloat(wPrice).toFixed(2)}`}`,
      }

      return formattedIngredient;
    })
    .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName)); // Sort by ingredientName alphabetically

    return ingredientsArray;

  } catch (error) {
    console.error('Error fetching ingredients:', error);
    throw error; // Re-throw error for caller to handle
  }
};