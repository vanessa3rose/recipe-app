///////////////////////////////// IMPORTS /////////////////////////////////

// initialize firebase app
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const currentAdd = async (ingredientId, ingredientData, ingredientName, ingredientStore, ingredientTypes, archive, {
  check = false, containerPrice = "0.00", amountTotal = "", amountLeft = "?", unitPrice = "0.00",
} = {}) => {


  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {

    ///////////////////////////////// DATA /////////////////////////////////

    const current = {
      amountLeft, amountTotal, archive, check, containerPrice, ingredientData, ingredientId, ingredientName, ingredientStore, ingredientTypes, unitPrice
    };

    ///////////////////////////////// PROCESSING /////////////////////////////////

    // add the new ingredient to the Firestore 'CURRENTS' collection
    await addDoc(collection(db, 'CURRENTS'), current);
    
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};


///////////////////////////////// EXPORT /////////////////////////////////

export default currentAdd;