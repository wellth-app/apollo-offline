"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIds = void 0;
const isUuid_1 = require("./isUuid");
exports.getIds = (dataIdFromObject, obj, path = "", acc = {}) => {
    if (!obj) {
        return acc;
    }
    if (typeof obj === "object") {
        const dataId = dataIdFromObject(obj);
        if (dataId) {
            const [, , id = null] = dataId.match(/(.+:)?(.+)/) || [];
            if (isUuid_1.isUuid(dataId)) {
                acc[path] = id;
            }
        }
        Object.keys(obj).forEach((key) => {
            const val = obj[key];
            if (Array.isArray(val)) {
                val.forEach((v, i) => exports.getIds(dataIdFromObject, v, `${path}.${key}[${i}]`, acc));
            }
            else if (typeof val === "object") {
                exports.getIds(dataIdFromObject, val, `${path}${path && "."}${key}`, acc);
            }
        });
    }
    return exports.getIds(dataIdFromObject, null, path, acc);
};
exports.default = exports.getIds;
//# sourceMappingURL=getIds.js.map