///////////////////////////////// IMPORTS /////////////////////////////////

// fractions
var Fractional = require('fractional').Fraction;


///////////////////////////////// SIGNATURE /////////////////////////////////

const extractUnit = (unit, amount) => {

  
  ///////////////////////////////// FUNCTION /////////////////////////////////
  
  // if there <= one, remove () and everything between ()
  if (amount !== 0 && amount !== "0" && (new Fractional(amount).numerator / new Fractional(amount).denominator) <= 1) {
    if (unit.includes("/")) { return unit.slice(0, -1).split('(')[0] + unit.slice(0, -1).split('(')[1].split("/")[0]; }
    else { return unit.split('').filter((_, index) => index < unit.indexOf("(") || index > unit.indexOf(")")).join(''); }

  // if the amount is blank, return unit
  } else if (amount === "" || amount === "?" || amount === null || amount === undefined) {
    return unit;
  
  // if there is more than one OR 0, simply remove the ()
  } else {
    if (unit.includes("/")) { return unit.slice(0, -1).split('(')[0] + unit.slice(0, -1).split('(')[1].split("/")[1]; }
    else { return unit.split('').filter(char => char !== '(' && char !== ')').join(''); }
  }
};
  
  
///////////////////////////////// EXPORT /////////////////////////////////

export default extractUnit;  