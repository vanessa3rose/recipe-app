///////////////////////////////// SIGNATURE /////////////////////////////////

const validateWholeNumberInput = (value) => {


    ///////////////////////////////// FUNCTION /////////////////////////////////

    const wholeNumberPattern = /^\d*$/;  // Matches only whole numbers like "123", "0", or ""
    return wholeNumberPattern.test(value) ? value : value.slice(0, -1); // Remove last invalid character

};


///////////////////////////////// EXPORT /////////////////////////////////

export default validateWholeNumberInput;    