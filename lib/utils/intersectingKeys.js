"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.intersectingKeys = void 0;
const INDEX_NOT_FOUND = -1;
exports.intersectingKeys = (object1, object2) => {
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);
    return keys1.filter((k) => keys2.indexOf(k) !== INDEX_NOT_FOUND);
};
exports.default = exports.intersectingKeys;
//# sourceMappingURL=intersectingKeys.js.map