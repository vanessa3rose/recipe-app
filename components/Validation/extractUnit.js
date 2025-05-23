///////////////////////////////// IMPORTS /////////////////////////////////

// fractions
var Fractional = require('fractional').Fraction;


///////////////////////////////// SIGNATURE /////////////////////////////////

const extractUnit = (unit, amount) => {

  
  ///////////////////////////////// FUNCTION /////////////////////////////////
  
  // if there <= one, remove () and everything between ()
  if ((new Fractional(amount).numerator / new Fractional(amount).denominator) <= 1) {
    return unit.split('').filter((_, index) => index < unit.indexOf("(") || index > unit.indexOf(")")).join('');

  // if the amount is blank, return unit
  } else if (amount === "" || amount === "?" || amount === null || amount === undefined) {
    return unit;
  
  // if there is more than one, simply remove the ()
  } else {
    return unit.split('').filter(char => char !== '(' && char !== ')').join('');
  }
};
  
  
///////////////////////////////// EXPORT /////////////////////////////////

export default extractUnit;  