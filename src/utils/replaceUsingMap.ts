/// Find values within `obj` that match the keys found in `map`
/// and replace them with the value within the map.
export const replaceUsingMap = (obj, map = {}) => {
  if (!obj || !map) {
    return obj;
  }

  const newVal = map[obj];
  if (newVal) {
    obj = newVal;

    return obj;
  }

  if (typeof obj === "object") {
    Object.keys(obj).forEach((key) => {
      const val = obj[key];

      if (Array.isArray(val)) {
        obj[key] = val.map((v, i) => replaceUsingMap(v, map));
      } else if (typeof val === "object") {
        obj[key] = replaceUsingMap(val, map);
      } else {
        const newVal = map[val];
        if (newVal) {
          obj[key] = newVal;
        }
      }
    });
  }

  return obj;
};

export default replaceUsingMap;
