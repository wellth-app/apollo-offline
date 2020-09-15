"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.snapshot = void 0;
const cacheSnapshot_1 = require("./cacheSnapshot");
const enqueuedMutations_1 = require("./enqueuedMutations");
exports.snapshot = (state, action) => {
    const enqueuedMutations = enqueuedMutations_1.default(state && state.enqueuedMutations, action);
    const cache = cacheSnapshot_1.default(state && state.cache, Object.assign(Object.assign({}, action), { enqueuedMutations }));
    return {
        enqueuedMutations,
        cache,
    };
};
exports.default = exports.snapshot;
//# sourceMappingURL=snapshot.js.map