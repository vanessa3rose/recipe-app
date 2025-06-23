///////////////////////////////// EQUALITY /////////////////////////////////

export function deepPrepEqual (a, b) {
  const ignoredKeys = [
    "prepNote", "prepMult", 
    "amountLeft", "amountTotal", "archive", "check", 
    "ingredientData", "ingredientId", "ingredientStore", "ingredientTypes", 
    "id", "containerPrice", "unitPrice"
  ];

  if (a === b) return true;

  if (typeof a !== typeof b || a === null || b === null) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepPrepEqual(item, b[i]));
  }

  if (typeof a === 'object') {
    const aKeys = Object.keys(a).filter(key => !ignoredKeys.includes(key));
    const bKeys = Object.keys(b).filter(key => !ignoredKeys.includes(key));

    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every(key => deepPrepEqual(a[key], b[key]));
  }

  return false;
}


///////////////////////////////// INDEX OF /////////////////////////////////

export function deepPrepIndexOf (array, target) {
  for (let i = 0; i < array.length; i++) {
    if (deepPrepEqual(array[i], target)) {
      return i;
    }
  }
  return -1;
}  