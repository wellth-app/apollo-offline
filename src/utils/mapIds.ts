import { intersectingKeys } from "./intersectingKeys";

export const mapIds = (object1 = {}, object2 = {}) =>
  intersectingKeys(object1, object2).reduce(
    (map, key) => ((map[object1[key]] = object2[key]), map),
    {},
  );

export default mapIds;
