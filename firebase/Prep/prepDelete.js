///////////////////////////////// IMPORTS /////////////////////////////////

// Initialize Firebase App
import { getFirestore, doc, deleteDoc, collection, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);

///////////////////////////////// SIGNATURE /////////////////////////////////

export async function prepDelete (prepId) {


  ///////////////////////////////// DATA /////////////////////////////////

  // today's current date
  const today = (() => {
    const localDate = new Date();
    
    return {
      dateString: localDate.toLocaleDateString('en-CA'),
      day: localDate.getDate(),
      month: localDate.getMonth() + 1,
      timestamp: localDate.getTime(),
      year: localDate.getFullYear(),
    };
  })();


  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {
            

    ///////////////////////////////// MEAL PREP /////////////////////////////////

    // gets the current prep and deletes it
    const prepRef = doc(db, 'preps', prepId);
    await deleteDoc(prepRef);
        
    // stores the prep data in the firebase
    await updateDoc(doc(db, 'globals', 'prep'), { id: null });
    
    
    ///////////////////////////////// WEEKLY PLANS /////////////////////////////////

    // creates a batch for updating plans
    const batch = writeBatch(db);

    // gets all weekly plan data
    const plansSnapshot = await getDocs(collection(db, 'plans'));
    
    // loops over all weekly plans and adds updates to the batch
    plansSnapshot.forEach((planDoc) => {
      const planData = planDoc.data();

      // if the current plan's date is past today's
      if (planDoc.id > today.dateString) {
        
        // if the current meal prep is the lunch of the current plan date, update the data
        if (planData.meals.lunch.prepId && prepId && planData.meals.lunch.prepId === prepId) {
          batch.update(doc(db, 'plans', planDoc.id), {
            'meals.lunch.prepId': null,
            'meals.lunch.prepData': null,
          });
        }

        // if the current meal prep is the dinner of the current plan date, update the data
        if (planData.meals.dinner.prepId && prepId && planData.meals.dinner.prepId === prepId) {
          batch.update(doc(db, 'plans', planDoc.id), {
            'meals.dinner.prepId': null,
            'meals.dinner.prepData': null,
          });
        }
      }
    });

    // commit the batch after all updates have been added
    await batch.commit();

  } catch (error) {
    console.error('Error deleting prep:', error);
  }
};
