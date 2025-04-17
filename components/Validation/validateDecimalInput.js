///////////////////////////////// SIGNATURE /////////////////////////////////

const validateDecimalInput = (value) => {


    ///////////////////////////////// FUNCTION /////////////////////////////////

    const decimalPattern = /^\d*\.?\d*$/;  // Matches "123", "123.45", or "0.5"
    return decimalPattern.test(value) ? value : value.slice(0, -1); // Remove last invalid character

};


///////////////////////////////// EXPORT /////////////////////////////////

export default validateDecimalInput;    