///////////////////////////////// SIGNATURE /////////////////////////////////

const validateFractionInput = (value) => {


  ///////////////////////////////// FUNCTION /////////////////////////////////

  const fractionPattern = /^(\d+\s?)?\d*\/?\d*$/;                       // Matches "1 1/2", "1/2", or "3"
  return fractionPattern.test(value) ? value : value.slice(0, -1);      // Remove last invalid character

};


///////////////////////////////// EXPORT /////////////////////////////////

export default validateFractionInput;