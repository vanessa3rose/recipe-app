///////////////////////////////// IMPORTS /////////////////////////////////

// fractions
import Fraction from 'fraction.js';

// validation
import isFraction from './isFraction';


///////////////////////////////// SIGNATURE /////////////////////////////////

const extractUnit = (unit, amount) => {
  if (!unit || typeof unit !== 'string') return unit || "";
  const amt = typeof amount === 'number' ? String(amount) : (amount || "").toString().trim();
  
  
  ///////////////////////////////// FUNCTION /////////////////////////////////
  
  // if there <= one, remove () and everything between ()
  if (isFraction(amt) && new Fraction(amt).valueOf() !== 0 && new Fraction(amt).valueOf() <= 1) {
    if (unit.includes("/")) { return unit.slice(0, -1).split('(')[0] + unit.slice(0, -1).split('(')[1].split("/")[0]; }
    else { return unit.split('').filter((_, index) => index < unit.indexOf("(") || index > unit.indexOf(")")).join(''); }

  // if the amount is blank, return unit
  } else if (amt === "" || amt === "?" || amt === null || amt === undefined) {
    return unit;
  
  // if there is more than one OR 0, simply remove the ()
  } else {
    if (unit.includes("/")) { return unit.slice(0, -1).split('(')[0] + unit.slice(0, -1).split('(')[1].split("/")[1]; }
    else { return unit.split('').filter(char => char !== '(' && char !== ')').join(''); }
  }
};
  
  
///////////////////////////////// EXPORT /////////////////////////////////

export default extractUnit;  