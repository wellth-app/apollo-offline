"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperationFieldName = void 0;
const apollo_utilities_1 = require("apollo-utilities");
__exportStar(require("./replaceUsingMap"), exports);
__exportStar(require("./getIds"), exports);
__exportStar(require("./mapIds"), exports);
__exportStar(require("./intersectingKeys"), exports);
__exportStar(require("./isUuid"), exports);
__exportStar(require("./isOptimistic"), exports);
var logger_1 = require("./logger");
Object.defineProperty(exports, "rootLogger", { enumerable: true, get: function () { return logger_1.default; } });
exports.getOperationFieldName = (operation) => apollo_utilities_1.resultKeyNameFromField(operation.definitions[0].selectionSet
    .selections[0]);
//# sourceMappingURL=index.js.map