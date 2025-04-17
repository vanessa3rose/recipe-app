///////////////////////////////// SIGNATURE /////////////////////////////////

const capitalizeInput = (text) => {

  
///////////////////////////////// FUNCTION /////////////////////////////////

  // Capitalize the first letter of each word
  const capitalizedText = text
    .split(' ')                                                                 // Split text into words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())    // Capitalize first letter of each word
    .join(' ');                                                                 // Join the words back together with spaces

  // Remove the last space if it's present
  if (capitalizedText.charAt(capitalizedText.length - 1) === ' ') {
    return capitalizedText.slice(0, -1);                             
  }

  return capitalizedText;
};


///////////////////////////////// EXPORT /////////////////////////////////

export default capitalizeInput;  