import { Store } from "redux";
import { FetchResult } from "apollo-link";
import { OfflineAction } from "@redux-offline/redux-offline/lib/types";
import { EnqueuedMutationEffect, CacheUpdates } from "../links/offline";
import { OfflineCacheShape } from "../cache";
import { ApolloOfflineClient, OfflineCallback } from "../client";
declare type ResultRecord = Record<string, any>;
export declare const offlineEffect: (store: Store<OfflineCacheShape>, client: ApolloOfflineClient, effect: EnqueuedMutationEffect<any>, action: OfflineAction, callback: OfflineCallback, mutationCacheUpdates: CacheUpdates) => Promise<FetchResult<ResultRecord, ResultRecord>>;
export default offlineEffect;
