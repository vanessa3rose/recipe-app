///////////////////////////////// IMPORTS /////////////////////////////////

// Initialize Firebase App
import { getFirestore, collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const spotlightAdd = async ({ numSpotlights = 0 } = {}) => {

  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {
    
    // variables
    const spotlight = {
      spotlightName: "Spotlight Recipe " + (numSpotlights + 1),
      spotlightNameEdited: true,
      spotlightMult: 0,
      spotlightCal: "0", 
      spotlightPrice: "0.00", 
      spotlightServing: "0.00", 
      recipeId: null, 
      ingredientData: [null, null, null, null, null, null, null, null, null, null, null, null], 
      ingredientNameEdited: [true, true, true, true, true, true, true, true, true, true, true, true], 
      ingredientAmountEdited: [true, true, true, true, true, true, true, true, true, true, true, true], 
      ingredientStoreEdited: [true, true, true, true, true, true, true, true, true, true, true, true], 
      ingredientIds: ["", "", "", "", "", "", "", "", "", "", "", ""], 
      ingredientAmounts: ["", "", "", "", "", "", "", "", "", "", "", ""], 
      ingredientStores: ["", "", "", "", "", "", "", "", "", "", "", ""], 
      ingredientCals: ["", "", "", "", "", "", "", "", "", "", "", ""], 
      ingredientPrices: ["", "", "", "", "", "", "", "", "", "", "", ""], 
      ingredientServings: ["", "", "", "", "", "", "", "", "", "", "", ""], 
    };
    
    // adds the new ingredient to the 'spotlights' collection
    const docRef = await addDoc(collection(db, "spotlights"), spotlight);

    // stores the spotlight data in the firebase
    updateDoc(doc(db, 'globals', 'spotlight'), { id: docRef.id });

    return [docRef.id, spotlight];

  } catch (e) {
    console.error("Error adding document: ", e);
  }
};


///////////////////////////////// EXPORT /////////////////////////////////

export default spotlightAdd;