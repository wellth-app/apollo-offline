const INDEX_NOT_FOUND = -1;

export const intersectingKeys = (object1: object, object2: object) => {
  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);

  return keys1.filter((k) => keys2.indexOf(k) !== INDEX_NOT_FOUND);
};

export default intersectingKeys;
