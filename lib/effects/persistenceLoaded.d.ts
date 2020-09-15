import { Store } from "redux";
import { OfflineCacheShape } from "../cache";
import { ApolloOfflineClient, CacheUpdates } from "../client";
export declare const persistenceLoadedEffect: (store: Store<OfflineCacheShape>, client: ApolloOfflineClient, mutationCacheUpdates: CacheUpdates) => void;
export default persistenceLoadedEffect;
