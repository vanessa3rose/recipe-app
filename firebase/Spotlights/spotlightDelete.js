///////////////////////////////// IMPORTS /////////////////////////////////

// Initialize Firebase App
import { getFirestore, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

export async function spotlightDelete (spotlightId) {

  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {

    // gets the current spotlight and deletes it
    const spotlightRef = doc(db, 'spotlights', spotlightId);
    await deleteDoc(spotlightRef);
        
    // stores the spotlight data in the firebase
    updateDoc(doc(db, 'globals', 'spotlight'), { id: null });

  } catch (error) {
    console.error('Error deleting spotlight:', error);
  }
  
};