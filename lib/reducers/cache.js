"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const writeCache_1 = require("../actions/writeCache");
exports.default = (state = {}, action) => {
    const { type, payload: normalizedCache } = action;
    switch (type) {
        case writeCache_1.WRITE_CACHE:
            return Object.assign({}, normalizedCache);
        default:
            return state;
    }
};
//# sourceMappingURL=cache.js.map