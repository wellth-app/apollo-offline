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
const rehydrated_1 = require("./rehydrated");
const cache_1 = require("./cache");
const offline_1 = require("../links/offline");
const cache_2 = require("../cache");
const offlineEffectsConfigs = [offline_1.offlineEffectConfig]
    .filter(Boolean)
    .reduce((config, _a) => {
    var { enqueueAction } = _a, rest = __rest(_a, ["enqueueAction"]);
    config[enqueueAction] = Object.assign({ enqueueAction }, rest);
    return config;
}, {});
exports.default = ({ dataIdFromObject }) => ({
    rehydrated: rehydrated_1.default,
    [cache_2.NORMALIZED_CACHE_KEY]: cache_1.default,
    [cache_2.METADATA_KEY]: (state, action) => Object.entries(offlineEffectsConfigs).reduce((effectState, [, { reducer = () => (x) => x }]) => reducer(dataIdFromObject)(effectState, action), state),
});
//# sourceMappingURL=index.js.map