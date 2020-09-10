"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_utilities_1 = require("apollo-utilities");
__export(require("./replaceUsingMap"));
__export(require("./getIds"));
__export(require("./mapIds"));
__export(require("./intersectingKeys"));
__export(require("./isUuid"));
var logger_1 = require("./logger");
exports.rootLogger = logger_1.default;
exports.isUuid = (val) => typeof val === "string" &&
    val.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
exports.getOperationFieldName = (operation) => apollo_utilities_1.resultKeyNameFromField(operation.definitions[0]
    .selectionSet.selections[0]);
//# sourceMappingURL=index.js.map