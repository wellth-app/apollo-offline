"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const intersectingKeys_1 = require("./intersectingKeys");
exports.mapIds = (object1 = {}, object2 = {}) => intersectingKeys_1.intersectingKeys(object1, object2).reduce((map, key) => ((map[object1[key]] = object2[key]), map), {});
exports.default = exports.mapIds;
//# sourceMappingURL=mapIds.js.map