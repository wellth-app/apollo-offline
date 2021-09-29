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
exports.createOfflineStore = void 0;
const redux_1 = require("redux");
const redux_devtools_extension_1 = require("redux-devtools-extension");
const redux_offline_1 = require("@redux-offline/redux-offline");
const defaults_1 = require("@redux-offline/redux-offline/lib/defaults");
const redux_thunk_1 = require("redux-thunk");
const rehydrated_1 = require("../reducers/rehydrated");
const cache_1 = require("../reducers/cache");
const offlineEffect_1 = require("../reducers/offlineEffect");
const constants_1 = require("../cache/constants");
const utils_1 = require("../utils");
const logger = utils_1.rootLogger.extend("store");
exports.createOfflineStore = (_a) => {
    var { middleware, persistCallback, storage = undefined, dataIdFromObject, discard } = _a, offlineConfig = __rest(_a, ["middleware", "persistCallback", "storage", "dataIdFromObject", "discard"]);
    logger("Creating offline store");
    const { enhanceStore: offlineEnhanceStore, middleware: offlineMiddleware, enhanceReducer, } = redux_offline_1.createOffline(Object.assign(Object.assign(Object.assign({}, defaults_1.default), offlineConfig), { discard: discard, persistCallback: () => {
            logger("Persistence loaded");
            persistCallback();
        }, persistOptions: Object.assign(Object.assign({}, (storage && { storage })), { whitelist: ["offline", constants_1.NORMALIZED_CACHE_KEY, constants_1.METADATA_KEY] }) }));
    const reducer = redux_1.combineReducers({
        rehydrated: rehydrated_1.default,
        [constants_1.NORMALIZED_CACHE_KEY]: cache_1.default,
        [constants_1.METADATA_KEY]: (state, action) => offlineEffect_1.default(dataIdFromObject)(state, action),
    });
    const enhanceStore = redux_devtools_extension_1.composeWithDevTools({
        name: "@wellth/apollo-offline/store",
    });
    return redux_1.createStore(enhanceReducer(reducer), enhanceStore(redux_1.applyMiddleware(redux_thunk_1.default, offlineMiddleware, ...middleware), offlineEnhanceStore));
};
//# sourceMappingURL=index.js.map