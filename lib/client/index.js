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
exports.ApolloOfflineClient = void 0;
require("setimmediate");
const apollo_client_1 = require("apollo-client");
const apollo_link_1 = require("apollo-link");
const apollo_utilities_1 = require("apollo-utilities");
const apollo_cache_inmemory_1 = require("apollo-cache-inmemory");
const persistenceLoaded_1 = require("../effects/persistenceLoaded");
const offline_1 = require("../effects/offline");
const discard_1 = require("../effects/discard");
const passthrough_1 = require("../links/passthrough");
const createNetworkLink_1 = require("../links/createNetworkLink");
const resetState_1 = require("../actions/resetState");
const store_1 = require("../store");
const utils_1 = require("../utils");
const cache_1 = require("../cache");
const logger = utils_1.rootLogger.extend("client");
class ApolloOfflineClient extends apollo_client_1.default {
    constructor({ disableOffline = false, reduxMiddleware = [], offlineLink = null, onlineLink = null, cacheOptions = {}, mutationCacheUpdates = {}, offlineConfig: { discardCondition, callback: offlineCallback = () => {
    }, storage = undefined, storeCacheRootMutation = false, runPersistenceLoadedEffect = false, }, }, _a = {}) {
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
                persistCallback: () => {
                    if (runPersistenceLoadedEffect) {
                        persistenceLoaded_1.persistenceLoadedEffect(store, this, mutationCacheUpdates);
                    }
                    resolveClient(this);
                },
                effect: (effect, action) => offline_1.offlineEffect(store, this, effect, action, offlineCallback, mutationCacheUpdates),
                discard: discard_1.discard(discardCondition, (error) => offlineCallback(error, null)),
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
                        .catch(observer.error.bind(observer));
                    return () => {
                        if (handle) {
                            handle.unsubscribe();
                        }
                    };
                });
            }),
            customLink ||
                createNetworkLink_1.createNetworkLink({ store, disableOffline, offlineLink, onlineLink }),
        ]);
        super(Object.assign(Object.assign({}, clientOptions), { link,
            cache }));
        this.mutationCacheUpdates = mutationCacheUpdates;
        this.reduxStore = store;
        this.disableOffline = disableOffline;
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
        return !this.disableOffline;
    }
    reduxState() {
        return this.reduxStore.getState();
    }
    networkConnected() {
        return this.reduxState().offline.online;
    }
    reset() {
        console.info("ApolloOfflineClient.reset() is deprecated and will be removed in future versions. Use `resetStore` or `clearStore` instead.");
        return this.resetStore();
    }
    resetStore() {
        this.resetReduxStore();
        return super.resetStore();
    }
    clearStore() {
        this.resetReduxStore();
        return super.clearStore();
    }
    resetReduxStore() {
        logger("Resetting redux store");
        this.reduxStore.dispatch(resetState_1.default);
    }
    mutate(options) {
        if (!this.isOfflineEnabled()) {
            return super.mutate(options);
        }
        const execute = false;
        const { optimisticResponse, context: originalContext, update, fetchPolicy } = options, otherOptions = __rest(options, ["optimisticResponse", "context", "update", "fetchPolicy"]);
        const operationName = apollo_utilities_1.getOperationName(options.mutation);
        let mutationUpdate = update;
        if (!mutationUpdate && this.mutationCacheUpdates[operationName]) {
            const contextUpdate = this.mutationCacheUpdates[operationName];
            mutationUpdate = contextUpdate(originalContext);
        }
        const context = Object.assign(Object.assign({}, originalContext), { apolloOfflineContext: {
                execute,
                update: mutationUpdate,
                fetchPolicy,
                optimisticResponse,
            } });
        return super.mutate(Object.assign({ optimisticResponse,
            context, update: mutationUpdate, fetchPolicy }, otherOptions));
    }
}
exports.default = ApolloOfflineClient;
exports.ApolloOfflineClient = ApolloOfflineClient;
//# sourceMappingURL=index.js.map