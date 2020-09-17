"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheSnapshot = void 0;
const saveSnapshot_1 = require("../actions/saveSnapshot");
const resetState_1 = require("../actions/resetState");
const InitialState = {};
exports.cacheSnapshot = (state = InitialState, action) => {
    const { type, payload } = action;
    switch (type) {
        case saveSnapshot_1.SAVE_SNAPSHOT: {
            const { cache } = payload;
            const cacheContents = Object.assign({}, cache.extract(false));
            return cacheContents;
        }
        case resetState_1.RESET_STATE:
            return InitialState;
        default:
            return state;
    }
};
exports.default = exports.cacheSnapshot;
//# sourceMappingURL=cacheSnapshot.js.map