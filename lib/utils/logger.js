"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = require("debug");
const debugLogger = debug_1.default("apollo-offline");
const extend = function (category = "") {
    const newCategory = category
        ? [...this.namespace.split(":"), category].join(":")
        : this.namespace;
    const result = debug_1.default(newCategory);
    result.extend = extend.bind(result);
    return result;
};
debugLogger.extend = extend.bind(debugLogger);
exports.default = debugLogger;
//# sourceMappingURL=logger.js.map