///////////////////////////////// IMPORTS /////////////////////////////////

// initialize firebase app
import { getFirestore, collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const prepAdd = async (prep) => {
  

  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {
    
    // adds the new prep to the 'PREPS' collection
    const docRef = await addDoc(collection(db, 'PREPS'), prep);

    // stores the prep data in the firebase
    updateDoc(doc(db, 'GLOBALS', 'prep'), { id: docRef.id });

    return [docRef.id, prep];

  } catch (e) {
    console.error("Error adding document: ", e);
  }
};


///////////////////////////////// EXPORT /////////////////////////////////

export default prepAdd;