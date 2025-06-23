///////////////////////////////// EQUALITY /////////////////////////////////

export function deepSnackEqual (a, b) {

  if (a === b) return true;

  if (typeof a !== typeof b || a === null || b === null) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepSnackEqual(item, b[i]));
  }

  if (typeof a === 'object') {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every(key => deepSnackEqual(a[key], b[key]));
  }

  return false;
}


///////////////////////////////// INDEX OF /////////////////////////////////

export function deepSnackIndexOf (array, target) {
  for (let i = 0; i < array.length; i++) {
    if (deepSnackEqual(array[i], target)) {
      return i;
    }
  }
  return -1;
}  