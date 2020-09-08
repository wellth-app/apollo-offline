"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceUsingMap = (obj, map = {}) => {
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
                obj[key] = val.map((v, i) => exports.replaceUsingMap(v, map));
            }
            else if (typeof val === "object") {
                obj[key] = exports.replaceUsingMap(val, map);
            }
            else {
                const newVal = map[val];
                if (newVal) {
                    obj[key] = newVal;
                }
            }
        });
    }
    return obj;
};
exports.default = exports.replaceUsingMap;
//# sourceMappingURL=replaceUsingMap.js.map