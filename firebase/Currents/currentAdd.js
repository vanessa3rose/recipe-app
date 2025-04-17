///////////////////////////////// IMPORTS /////////////////////////////////

// Initialize Firebase App
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const currentAdd = async (ingredientId, ingredientData, ingredientStore, {
    check = false, containerPrice = "0.00", amountTotal = "", amountLeft = "?", unitPrice = "0.00",
  } = {}) => {


  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {

    ///////////////////////////////// DATA /////////////////////////////////

    const current = {
        check, ingredientId, ingredientData, amountTotal, amountLeft, unitPrice, containerPrice, ingredientStore,
    };

    ///////////////////////////////// PROCESSING /////////////////////////////////

    // add the new ingredient to the Firestore 'currents' collection
    await addDoc(collection(db, "currents"), current);
    
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};


///////////////////////////////// EXPORT /////////////////////////////////

export default currentAdd;