"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_cache_inmemory_1 = require("apollo-cache-inmemory");
exports.defaultDataIdFromObject = apollo_cache_inmemory_1.defaultDataIdFromObject;
const utils_1 = require("../utils");
const writeCache_1 = require("../actions/writeCache");
const constants_1 = require("./constants");
const logger = utils_1.rootLogger.extend("offline-cache");
const ROOT_MUTATION_DATA_ID = "ROOT_MUTATION";
const writeThunk = (type, payload) => (dispatch, _getState) => dispatch({
    type,
    payload,
});
const boundWriteCache = (store, data) => {
    logger(`Dispatching ${writeCache_1.WRITE_CACHE}`);
    store.dispatch(writeThunk(writeCache_1.WRITE_CACHE, data));
};
const isOfflineCacheOptions = (obj) => !!obj.store;
class ApolloOfflineCache extends apollo_cache_inmemory_1.InMemoryCache {
    constructor(optionsOrStore, config = {}) {
        super(config);
        this.storeCacheRootMutation = false;
        if (isOfflineCacheOptions(optionsOrStore)) {
            const { store, storeCacheRootMutation = false } = optionsOrStore;
            this.store = store;
            this.storeCacheRootMutation = storeCacheRootMutation;
        }
        else {
            this.store = optionsOrStore;
        }
        const cancelSubscription = this.store.subscribe(() => {
            const { [constants_1.NORMALIZED_CACHE_KEY]: normalizedCache = {}, rehydrated = false, } = this.store.getState();
            super.restore(Object.assign({}, normalizedCache));
            if (rehydrated) {
                logger("Rehydrated! Cancelling subscription...");
                cancelSubscription();
            }
        });
    }
    restore(data) {
        boundWriteCache(this.store, data);
        super.restore(data);
        super.broadcastWatches();
        return this;
    }
    write(write) {
        super.write(write);
        if (!this.storeCacheRootMutation &&
            write.dataId === ROOT_MUTATION_DATA_ID) {
            this.data.delete(ROOT_MUTATION_DATA_ID);
        }
        if (this.data && typeof this.data.record === "undefined") {
            const data = super.extract(true);
            boundWriteCache(this.store, data);
        }
        else {
            logger("No dispatch for RecordingCache");
        }
    }
    reset() {
        logger("Resetting cache");
        boundWriteCache(this.store, {});
        return super.reset();
    }
    getIdsMap() {
        const { [constants_1.METADATA_KEY]: { idsMap }, } = this.store.getState();
        return Object.assign({}, idsMap);
    }
}
exports.ApolloOfflineCache = ApolloOfflineCache;
exports.default = ApolloOfflineCache;
//# sourceMappingURL=index.js.map