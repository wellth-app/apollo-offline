"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheSnapshot = void 0;
const saveSnapshot_1 = require("../actions/saveSnapshot");
exports.cacheSnapshot = (state = {}, action) => {
    const { type, payload } = action;
    switch (type) {
        case saveSnapshot_1.SAVE_SNAPSHOT: {
            const { cache } = payload;
            const cacheContents = Object.assign({}, cache.extract(false));
            return cacheContents;
        }
        default:
            return state;
    }
};
exports.default = exports.cacheSnapshot;
//# sourceMappingURL=cacheSnapshot.js.map