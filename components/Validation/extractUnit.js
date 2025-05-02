///////////////////////////////// SIGNATURE /////////////////////////////////

const extractUnit = (unit, amount) => {

  
  ///////////////////////////////// FUNCTION /////////////////////////////////
  
  // if there is only one, remove () and everything between ()
  if (amount === 1 || amount === "1") {
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