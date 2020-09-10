import { Cache } from "apollo-cache";
import { Store } from "redux";
import { InMemoryCache, ApolloReducerConfig, defaultDataIdFromObject, NormalizedCacheObject } from "apollo-cache-inmemory";
import { OfflineState } from "@redux-offline/redux-offline/lib/types";
import { NORMALIZED_CACHE_KEY, METADATA_KEY } from "./constants";
export { defaultDataIdFromObject };
export declare type OfflineSyncMetadataState = {
    idsMap: {
        [key: string]: string;
    };
    snapshot: {
        cache: NormalizedCacheObject;
        enqueuedMutations: number;
    };
};
export interface OfflineCacheShape {
    offline: OfflineState;
    rehydrated: boolean;
    [NORMALIZED_CACHE_KEY]: NormalizedCacheObject;
    [METADATA_KEY]: OfflineSyncMetadataState;
}
declare type OfflineStore = Store<OfflineCacheShape>;
export declare type OfflineCacheOptions = {
    store: OfflineStore;
    storeCacheRootMutation?: boolean;
};
export declare class ApolloOfflineCache extends InMemoryCache {
    private store;
    private storeCacheRootMutation;
    constructor(optionsOrStore: OfflineStore | OfflineCacheOptions, config?: ApolloReducerConfig);
    restore(data: NormalizedCacheObject): this;
    write(write: Cache.WriteOptions): void;
    reset(): Promise<void>;
    getIdsMap(): {
        [key: string]: string;
    };
}
export default ApolloOfflineCache;
