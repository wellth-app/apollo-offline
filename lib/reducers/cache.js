"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const writeCache_1 = require("../actions/writeCache");
const resetState_1 = require("../actions/resetState");
const InitialState = {};
exports.default = (state = InitialState, action) => {
    const { type, payload: normalizedCache } = action;
    switch (type) {
        case writeCache_1.WRITE_CACHE:
            return Object.assign({}, normalizedCache);
        case resetState_1.RESET_STATE:
            return InitialState;
        default:
            return state;
    }
};
//# sourceMappingURL=cache.js.map