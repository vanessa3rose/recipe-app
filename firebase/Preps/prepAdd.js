///////////////////////////////// IMPORTS /////////////////////////////////

// id
import { nanoid } from 'nanoid/non-secure';
const generateVariantId = () => nanoid(12);

// initialize firebase app
import { getFirestore, collection, setDoc, updateDoc, doc } from 'firebase/firestore';
import { app } from '../../firebase.config';
const db = getFirestore(app);


///////////////////////////////// SIGNATURE /////////////////////////////////

const prepAdd = async (prep) => {
  

  ///////////////////////////////// FUNCTION /////////////////////////////////

  try {

    // creates doc ref FIRST
    const prepRef = doc(collection(db, 'PREPS'));
    const prepId = prepRef.id;
    
    // sets up variants
    const prepDoc = {
      prepName: prep.prepName,
      variants: [{
        ...prep,
        prepId: prepId,
        variantId: generateVariantId(),
      }],
    };

    // write once
    await setDoc(prepRef, prepDoc);

    // update globals
    await updateDoc(doc(db, 'GLOBALS', 'prep'), { id: prepId });

    return [prepId, prepDoc];

  } catch (e) {
    console.error("Error adding document: ", e);
  }
};


///////////////////////////////// EXPORT /////////////////////////////////

export default prepAdd;