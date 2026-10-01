///////////////////////////////// IMPORTS /////////////////////////////////

// fractions
import Fraction from 'fraction.js';


///////////////////////////////// SIGNATURE /////////////////////////////////

const isFraction = (value) => {

  
  ///////////////////////////////// FUNCTION /////////////////////////////////

  // returns false if undefined, null
  if (value === undefined || value === null) return false;
  // returns false if empty
  const strVal = String(value).trim();
  if (strVal === "") return false;

  // checks if whole number or (im)proper fraction
  try {
    const frac = new Fraction(strVal);
    if (!isFinite(frac.valueOf())) return false;
    return true;

  } catch {
    return false;
  }
};


///////////////////////////////// EXPORT /////////////////////////////////

export default isFraction;