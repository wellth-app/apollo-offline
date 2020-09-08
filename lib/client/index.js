"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
require("setimmediate");
const apollo_client_1 = require("apollo-client");
const apollo_link_1 = require("apollo-link");
const apollo_cache_inmemory_1 = require("apollo-cache-inmemory");
const offline_1 = require("../links/offline");
const passthrough_1 = require("../links/passthrough");
const createNetworkLink_1 = require("../links/createNetworkLink");
const resetState_1 = require("../actions/resetState");
const store_1 = require("../store");
const utils_1 = require("../utils");
const cache_1 = require("../cache");
const logger = utils_1.rootLogger.extend("client");
class ApolloOfflineClient extends apollo_client_1.default {
    constructor({ disableOffline = false, reduxMiddleware = [], offlineLink = null, onlineLink = null, cacheOptions = {}, mutationCacheUpdates = {}, offlineConfig: { discardCondition, callback: offlineCallback = undefined, storage = undefined, storeCacheRootMutation = false, }, }, _a = {}) {
        var { cache: customCache = undefined, link: customLink = undefined } = _a, clientOptions = __rest(_a, ["cache", "link"]);
        let resolveClient;
        const dataIdFromObject = disableOffline
            ? () => null
            : cacheOptions.dataIdFromObject || apollo_cache_inmemory_1.defaultDataIdFromObject;
        const store = disableOffline
            ? null
            : store_1.createOfflineStore({
                storage,
                dataIdFromObject,
                middleware: reduxMiddleware,
                persistCallback: () => resolveClient(this),
                effect: (effect, action) => offline_1.offlineEffect(store, this, effect, action, offlineCallback, mutationCacheUpdates),
                discard: offline_1.discard(discardCondition, offlineCallback),
            });
        const cache = disableOffline
            ? customCache || new apollo_cache_inmemory_1.InMemoryCache(cacheOptions)
            : new cache_1.default({ store, storeCacheRootMutation }, cacheOptions);
        const link = apollo_link_1.ApolloLink.from([
            new apollo_link_1.ApolloLink((operation, forward) => {
                let handle = null;
                return new apollo_link_1.Observable((observer) => {
                    this.hydratedPromise
                        .then(() => {
                        handle = passthrough_1.default(operation, forward).subscribe(observer);
                    })
                        .catch(observer.error);
                    return () => {
                        if (handle) {
                            handle.unsubscribe;
                        }
                    };
                });
            }),
            !!customLink
                ? customLink
                : createNetworkLink_1.createNetworkLink({ store, disableOffline, offlineLink, onlineLink }),
        ]);
        super(Object.assign({}, clientOptions, { link,
            cache }));
        this.mutationCacheUpdates = mutationCacheUpdates;
        this._store = store;
        this._disableOffline = disableOffline;
        this.hydratedPromise = disableOffline
            ? Promise.resolve(this)
            : new Promise((resolve) => {
                resolveClient = resolve;
            });
    }
    hydrated() {
        return this.hydratedPromise;
    }
    isOfflineEnabled() {
        return !this._disableOffline;
    }
    reset() {
        return __awaiter(this, void 0, void 0, function* () {
            logger("Resetting client store and cache");
            this._store.dispatch(resetState_1.default);
            yield this.cache.reset();
            yield this.resetStore();
        });
    }
    mutate(options) {
        if (!this.isOfflineEnabled()) {
            return super.mutate(options);
        }
        const execute = false;
        const { optimisticResponse, context: originalContext = {}, update, fetchPolicy } = options, otherOptions = __rest(options, ["optimisticResponse", "context", "update", "fetchPolicy"]);
        const context = Object.assign({}, originalContext, { apolloOfflineContext: {
                execute,
                update,
                fetchPolicy,
                optimisticResponse,
            } });
        return super.mutate(Object.assign({ optimisticResponse,
            context,
            update,
            fetchPolicy }, otherOptions));
    }
}
exports.default = ApolloOfflineClient;
exports.ApolloOfflineClient = ApolloOfflineClient;
//# sourceMappingURL=index.js.map