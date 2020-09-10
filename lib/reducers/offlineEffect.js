"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("@redux-offline/redux-offline/lib/constants");
const constants_2 = require("../cache/constants");
const snapshot_1 = require("./snapshot");
const idsMap_1 = require("./idsMap");
exports.offlineEffect = (dataIdFromObject) => (state, action) => {
    const { type, payload } = action;
    switch (type) {
        case constants_1.PERSIST_REHYDRATE: {
            const { [constants_2.METADATA_KEY]: rehydratedState } = payload;
            return rehydratedState || state;
        }
        default: {
            const _a = state || {}, { idsMap: originalIdsMap = {}, snapshot: originalSnapshot = {} } = _a, restState = __rest(_a, ["idsMap", "snapshot"]);
            const snapshot = snapshot_1.default(originalSnapshot, action);
            const idsMap = idsMap_1.default(originalIdsMap, Object.assign({}, action, { remainingMutations: snapshot.enqueuedMutations }), dataIdFromObject);
            return Object.assign({}, restState, { snapshot,
                idsMap });
        }
    }
};
exports.default = exports.offlineEffect;
//# sourceMappingURL=offlineEffect.js.map