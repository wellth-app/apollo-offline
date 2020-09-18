"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOptimistic = exports.IS_OPTIMISTIC_KEY = void 0;
exports.IS_OPTIMISTIC_KEY = typeof Symbol !== "undefined" ? Symbol("isOptimistic") : "@@isOptimistic";
exports.isOptimistic = (obj) => typeof obj[exports.IS_OPTIMISTIC_KEY] !== undefined
    ? obj[exports.IS_OPTIMISTIC_KEY]
    : undefined;
exports.default = exports.isOptimistic;
//# sourceMappingURL=isOptimistic.js.map