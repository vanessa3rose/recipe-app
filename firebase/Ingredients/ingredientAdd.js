///////////////////////////////// IMPORTS /////////////////////////////////

// Fractions
var Fractional = require('fractional').Fraction;
import Fraction from 'fraction.js';

// Initialize Firebase App
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const ingredientAdd = async ({
  ingredientName = "", ingredientType = [],
  aLink = "", mbLink = "", smLink = "", ssLink = "", tLink = "", wLink = "",
  aBrand = "", mbBrand = "", smBrand = "", ssBrand = "", tBrand = "", wBrand = "",
  aServingSize = 0, mbServingSize = 0, smServingSize = 0, ssServingSize = 0, tServingSize = 0, wServingSize = 0,
  aUnit = "", mbUnit = "", smUnit = "", ssUnit = "", tUnit = "", wUnit = "",
  aServingContainer = 0, mbServingContainer = 0, smServingContainer = 0, ssServingContainer = 0, tServingContainer = 0, wServingContainer = 0,
  aCalServing = 0, mbCalServing = 0, smCalServing = 0, ssCalServing = 0, tCalServing = 0, wCalServing = 0,
  aPriceContainer = 0, mbPriceContainer = 0, smPriceContainer = 0, ssPriceContainer = 0, tPriceContainer = 0, wPriceContainer = 0,
}) => {


  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {


    ///////////////////////////////// DATA CALCULATIONS /////////////////////////////////
    
    // Calculate TotalYield for each field
    const aTotalYield = (aServingSize === "" || aServingContainer === "") ? "" : `${(new Fractional(aServingSize)).multiply(new Fractional(aServingContainer)).toString()}`;
    const mbTotalYield = (mbServingSize === "" || mbServingContainer === "") ? "" : `${(new Fractional(mbServingSize)).multiply(new Fractional(mbServingContainer)).toString()}`;
    const smTotalYield = (smServingSize === "" || smServingContainer === "") ? "" : `${(new Fractional(smServingSize)).multiply(new Fractional(smServingContainer)).toString()}`;
    const ssTotalYield = (ssServingSize === "" || ssServingContainer === "") ? "" : `${(new Fractional(ssServingSize)).multiply(new Fractional(ssServingContainer)).toString()}`;
    const tTotalYield = (tServingSize === "" || tServingContainer === "") ? "" : `${(new Fractional(tServingSize)).multiply(new Fractional(tServingContainer)).toString()}`;
    const wTotalYield = (wServingSize === "" || wServingContainer === "") ? "" : `${(new Fractional(wServingSize)).multiply(new Fractional(wServingContainer)).toString()}`;

    // Calculate CalContainer for each field
    const aCalContainer = (aCalServing === "" || aServingContainer === "") ? "" : `${((new Fraction((new Fractional(aCalServing)).multiply(new Fractional(aServingContainer)).toString())) * 1).toFixed(0)}`;
    const mbCalContainer = (mbCalServing === "" || mbServingContainer === "") ? "" : `${((new Fraction((new Fractional(mbCalServing)).multiply(new Fractional(mbServingContainer)).toString())) * 1).toFixed(0)}`;
    const smCalContainer = (smCalServing === "" || smServingContainer === "") ? "" : `${((new Fraction((new Fractional(smCalServing)).multiply(new Fractional(smServingContainer)).toString())) * 1).toFixed(0)}`;
    const ssCalContainer = (ssCalServing === "" || ssServingContainer === "") ? "" : `${((new Fraction((new Fractional(ssCalServing)).multiply(new Fractional(ssServingContainer)).toString())) * 1).toFixed(0)}`;
    const tCalContainer = (tCalServing === "" || tServingContainer === "") ? "" : `${((new Fraction((new Fractional(tCalServing)).multiply(new Fractional(tServingContainer)).toString())) * 1).toFixed(0)}`;
    const wCalContainer = (wCalServing === "" || wServingContainer === "") ? "" : `${((new Fraction((new Fractional(wCalServing)).multiply(new Fractional(wServingContainer)).toString())) * 1).toFixed(0)}`;

    // Calculate PriceServing for each field
    const aPriceServing = (aPriceContainer === "" || aServingContainer === "") ? "" : `${((new Fraction((new Fractional(aPriceContainer)).divide(new Fractional(aServingContainer)).toString())) * 1).toFixed(2)}`;
    const mbPriceServing = (mbPriceContainer === "" || mbServingContainer === "") ? "" : `${((new Fraction((new Fractional(mbPriceContainer)).divide(new Fractional(mbServingContainer)).toString())) * 1).toFixed(2)}`;
    const smPriceServing = (smPriceContainer === "" || smServingContainer === "") ? "" : `${((new Fraction((new Fractional(smPriceContainer)).divide(new Fractional(smServingContainer)).toString())) * 1).toFixed(2)}`;
    const ssPriceServing = (ssPriceContainer === "" || ssServingContainer === "") ? "" : `${((new Fraction((new Fractional(ssPriceContainer)).divide(new Fractional(ssServingContainer)).toString())) * 1).toFixed(2)}`;
    const tPriceServing = (tPriceContainer === "" || tServingContainer === "") ? "" : `${((new Fraction((new Fractional(tPriceContainer)).divide(new Fractional(tServingContainer)).toString())) * 1).toFixed(2)}`;
    const wPriceServing = (wPriceContainer === "" || wServingContainer === "") ? "" : `${((new Fraction((new Fractional(wPriceContainer)).divide(new Fractional(wServingContainer)).toString())) * 1).toFixed(2)}`;


    ///////////////////////////////// DATA /////////////////////////////////

    const ingredient = {
      ingredientName, 
      ingredientType: Array.isArray(ingredientType) ? ingredientType.map(type => type === "CUSTOM" ? "" : type) : ingredientType === "CUSTOM" ? "" : ingredientType,
      aLink, mbLink, smLink, ssLink, tLink, wLink,
      aBrand, mbBrand, smBrand, ssBrand, tBrand, wBrand,
      aServingSize, mbServingSize, smServingSize, ssServingSize, tServingSize, wServingSize,
      aUnit, mbUnit, smUnit, ssUnit, tUnit, wUnit,
      aServingContainer, mbServingContainer, smServingContainer, ssServingContainer, tServingContainer, wServingContainer,
      aTotalYield, mbTotalYield, smTotalYield, ssTotalYield, tTotalYield, wTotalYield,
      aCalServing, mbCalServing, smCalServing, ssCalServing, tCalServing, wCalServing,
      aCalContainer, mbCalContainer, smCalContainer, ssCalContainer, tCalContainer, wCalContainer,
      aPriceServing, mbPriceServing, smPriceServing, ssPriceServing, tPriceServing, wPriceServing,
      aPriceContainer, mbPriceContainer, smPriceContainer, ssPriceContainer, tPriceContainer, wPriceContainer,
    };


    ///////////////////////////////// PROCESSING /////////////////////////////////

    // Add the new ingredient to the Firestore 'ingredients' collection
    await addDoc(collection(db, "ingredients"), ingredient);
    
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};


///////////////////////////////// EXPORT /////////////////////////////////

export default ingredientAdd;