/// <reference types="zen-observable" />
import { ApolloLink, Operation, NextLink, Observable, GraphQLRequest, ExecutionResult, FetchResult } from "apollo-link";
import { FetchPolicy, MutationUpdaterFn, MutationQueryReducersMap } from "apollo-client";
import { RefetchQueryDescription } from "apollo-client/core/watchQueryOptions";
import { OfflineAction } from "@redux-offline/redux-offline/lib/types";
import { NormalizedCacheObject } from "apollo-cache-inmemory";
import { Store as ReduxStore } from "redux";
import ApolloOfflineClient, { OfflineCallback } from "../client";
import { OfflineCache, OfflineSyncMetadataState } from "../cache";
import { Discard } from "../store";
export declare type DetectNetwork = () => boolean;
declare type Store = ReduxStore<OfflineCache>;
export interface Options {
    store: Store;
}
export declare const isOptimistic: (obj: any) => any;
export default class OfflineLink extends ApolloLink {
    private store;
    constructor(store: Store);
    request(operation: Operation, forward: NextLink): Observable<unknown>;
}
export declare type EnqueuedMutationEffect<T> = {
    optimisticResponse: object;
    operation: GraphQLRequest;
    update: MutationUpdaterFn<T>;
    updateQueries: MutationQueryReducersMap<T>;
    refetchQueries: ((result: ExecutionResult) => RefetchQueryDescription) | RefetchQueryDescription;
    observer: ZenObservable.SubscriptionObserver<T>;
    fetchPolicy?: FetchPolicy;
};
export declare const offlineEffect: <T extends NormalizedCacheObject>(store: ReduxStore<OfflineCache>, client: ApolloOfflineClient<T>, effect: EnqueuedMutationEffect<any>, action: OfflineAction, callback: OfflineCallback) => Promise<FetchResult<Record<string, any>, Record<string, any>, Record<string, any>>>;
export declare const discard: (discardCondition: Discard, callback: OfflineCallback) => (error: any, action: OfflineAction, retries: number) => any;
export declare const offlineEffectConfig: {
    enqueueAction: string;
    effect: <T extends NormalizedCacheObject>(store: ReduxStore<OfflineCache>, client: ApolloOfflineClient<T>, effect: EnqueuedMutationEffect<any>, action: OfflineAction, callback: OfflineCallback) => Promise<FetchResult<Record<string, any>, Record<string, any>, Record<string, any>>>;
    discard: (discardCondition: Discard, callback: OfflineCallback) => (error: any, action: OfflineAction, retries: number) => any;
    reducer: (dataIdFromObject: any) => (state: OfflineSyncMetadataState, action: any) => any;
};
export {};
