/// <reference types="zen-observable" />
import { ApolloLink, Operation, NextLink, Observable, GraphQLRequest, ExecutionResult, FetchResult } from "apollo-link";
import { FetchPolicy, MutationUpdaterFn, MutationQueryReducersMap } from "apollo-client";
import { RefetchQueryDescription } from "apollo-client/core/watchQueryOptions";
import { OfflineAction } from "@redux-offline/redux-offline/lib/types";
import { NormalizedCacheObject } from "apollo-cache-inmemory";
import { Store as ReduxStore } from "redux";
import ApolloOfflineClient, { OfflineCallback } from "../client";
import { OfflineCache } from "../cache";
import { Discard } from "../store";
export declare type DetectNetwork = () => boolean;
export declare const isOptimistic: (obj: any) => any;
export interface CacheUpdates {
    [key: string]: (context: any) => MutationUpdaterFn;
}
declare type Store = ReduxStore<OfflineCache>;
export interface OfflineLinkOptions {
    store: Store;
}
export default class OfflineLink extends ApolloLink {
    private store;
    constructor({ store }: OfflineLinkOptions);
    request(operation: Operation, forward: NextLink): Observable<unknown>;
}
export declare const boundSaveSnapshot: (store: any, cache: any) => any;
export declare type EnqueuedMutationEffect<T> = {
    optimisticResponse: object;
    operation: GraphQLRequest;
    update: MutationUpdaterFn<T>;
    updateQueries: MutationQueryReducersMap<T>;
    refetchQueries: ((result: ExecutionResult) => RefetchQueryDescription) | RefetchQueryDescription;
    observer: ZenObservable.SubscriptionObserver<T>;
    fetchPolicy?: FetchPolicy;
};
export declare const offlineEffect: <T extends NormalizedCacheObject>(store: ReduxStore<OfflineCache>, client: ApolloOfflineClient<T>, effect: EnqueuedMutationEffect<any>, action: OfflineAction, callback: OfflineCallback, mutationCacheUpdates: CacheUpdates) => Promise<FetchResult<Record<string, any>, Record<string, any>, Record<string, any>>>;
export declare const discard: (discardCondition: Discard, callback: OfflineCallback) => (error: any, action: OfflineAction, retries: number) => any;
export declare const offlineEffectConfig: {
    enqueueAction: string;
    effect: <T extends NormalizedCacheObject>(store: ReduxStore<OfflineCache>, client: ApolloOfflineClient<T>, effect: EnqueuedMutationEffect<any>, action: OfflineAction, callback: OfflineCallback, mutationCacheUpdates: CacheUpdates) => Promise<FetchResult<Record<string, any>, Record<string, any>, Record<string, any>>>;
    discard: (discardCondition: Discard, callback: OfflineCallback) => (error: any, action: OfflineAction, retries: number) => any;
    reducer: (dataIdFromObject: any) => (state: import("../cache").OfflineSyncMetadataState, action: any) => any;
};
export {};
