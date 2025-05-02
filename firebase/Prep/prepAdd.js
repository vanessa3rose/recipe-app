///////////////////////////////// IMPORTS /////////////////////////////////

// Initialize Firebase App
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const prepAdd = async (prep) => {

  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {
    
    // adds the new ingredient to the 'spotlights' collection
    const docRef = await addDoc(collection(db, 'preps'), prep);

    // stores the prep data in the firebase
    updateDoc(doc(db, 'globals', 'prep'), { id: docRef.id });

    return [docRef.id, prep];

  } catch (e) {
    console.error("Error adding document: ", e);
  }
};


///////////////////////////////// EXPORT /////////////////////////////////

export default prepAdd;