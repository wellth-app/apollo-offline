import { isUuid } from "./isUuid";

export const getIds = (dataIdFromObject, obj, path = "", acc = {}) => {
  if (!obj) {
    return acc;
  }

  if (typeof obj === "object") {
    const dataId = dataIdFromObject(obj);

    if (dataId) {
      const [, , id = null] = dataId.match(/(.+:)?(.+)/) || [];

      if (isUuid(dataId)) {
        acc[path] = id;
      }
    }

    Object.keys(obj).forEach((key) => {
      const val = obj[key];

      if (Array.isArray(val)) {
        val.forEach((v, i) =>
          getIds(dataIdFromObject, v, `${path}.${key}[${i}]`, acc),
        );
      } else if (typeof val === "object") {
        getIds(dataIdFromObject, val, `${path}${path && "."}${key}`, acc);
      }
    });
  }

  return getIds(dataIdFromObject, null, path, acc);
};

export default getIds;
