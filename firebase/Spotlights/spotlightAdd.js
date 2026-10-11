///////////////////////////////// IMPORTS /////////////////////////////////

// initialize firebase app
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
      ingredientAmounts: new Array(12).fill(""), 
      ingredientAmountEdited: [true, true, true, true, true, true, true, true, true, true, true, true], 
      ingredientCals: new Array(12).fill(""), 
      ingredientData: new Array(12).fill(null), 
      ingredientIds: new Array(12).fill(""), 
      ingredientNames: new Array(12).fill(""), 
      ingredientNameEdited: [true, true, true, true, true, true, true, true, true, true, true, true], 
      ingredientPrices: new Array(12).fill(""), 
      ingredientServings: new Array(12).fill(""), 
      ingredientStores: new Array(12).fill(""), 
      ingredientStoreEdited: [true, true, true, true, true, true, true, true, true, true, true, true], 
      ingredientTypes: {0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: []}, 
    };
    
    // adds the new spotlight to the 'SPOTLIGHTS' collection
    const docRef = await addDoc(collection(db, 'SPOTLIGHTS'), spotlight);

    // stores the spotlight data in the firebase
    updateDoc(doc(db, 'GLOBALS', 'spotlight'), { id: docRef.id });

    return [docRef.id, spotlight];

  } catch (e) {
    console.error("Error adding document: ", e);
  }
};


///////////////////////////////// EXPORT /////////////////////////////////

export default spotlightAdd;