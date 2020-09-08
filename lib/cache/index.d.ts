import { Cache } from "apollo-cache";
import { Store } from "redux";
import { InMemoryCache, ApolloReducerConfig, defaultDataIdFromObject, NormalizedCacheObject } from "apollo-cache-inmemory";
import { OfflineState } from "@redux-offline/redux-offline/lib/types";
export declare const NORMALIZED_CACHE_KEY = "apollo-offline";
export declare const METADATA_KEY = "apollo-offline-metadata";
export { defaultDataIdFromObject };
export declare type OfflineSyncMetadataState = {
    idsMap: {
        [key: string]: string;
    };
    snapshot: {
        enqueuedMutations: number;
    };
};
export interface OfflineCache {
    offline: OfflineState;
    rehydrated: boolean;
    [NORMALIZED_CACHE_KEY]: NormalizedCacheObject;
    [METADATA_KEY]: OfflineSyncMetadataState;
}
export declare type OfflineCacheOptions = {
    store: Store<OfflineCache>;
    storeCacheRootMutation?: boolean;
};
export default class ApolloOfflineCache extends InMemoryCache {
    private store;
    private storeCacheRootMutation;
    constructor(optionsOrStore: Store<OfflineCache> | OfflineCacheOptions, config?: ApolloReducerConfig);
    restore(data: NormalizedCacheObject): this;
    write(write: Cache.WriteOptions): void;
    reset(): Promise<void>;
    getIdsMap(): {
        [x: string]: string;
    };
}
