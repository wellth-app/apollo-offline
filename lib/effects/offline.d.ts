import { Store } from "redux";
import { OfflineCacheShape } from "cache";
import { FetchResult } from "apollo-link";
import { EnqueuedMutationEffect, CacheUpdates } from "links/offline";
import { OfflineAction } from "@redux-offline/redux-offline/lib/types";
import { ApolloOfflineClient, OfflineCallback } from "../client";
export declare const offlineEffect: (store: Store<OfflineCacheShape>, client: ApolloOfflineClient, effect: EnqueuedMutationEffect<any>, action: OfflineAction, callback: OfflineCallback, mutationCacheUpdates: CacheUpdates) => Promise<FetchResult<Record<string, any>, Record<string, any>, Record<string, any>>>;
export default offlineEffect;
