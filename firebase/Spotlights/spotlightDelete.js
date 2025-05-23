///////////////////////////////// IMPORTS /////////////////////////////////

// initialize firebase app
import { getFirestore, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

export async function spotlightDelete (spotlightId) {
  

  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {

    // gets the current spotlight and deletes it
    const spotlightRef = doc(db, 'SPOTLIGHTS', spotlightId);
    await deleteDoc(spotlightRef);
        
    // stores the spotlight data in the firebase
    updateDoc(doc(db, 'GLOBALS', 'spotlight'), { id: null });

  } catch (error) {
    console.error('Error deleting spotlight:', error);
  }
  
};