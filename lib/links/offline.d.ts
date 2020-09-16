/// <reference types="zen-observable" />
import { ApolloLink, Operation, NextLink, Observable, GraphQLRequest, ExecutionResult, FetchResult } from "apollo-link";
import { FetchPolicy, MutationUpdaterFn, MutationQueryReducersMap } from "apollo-client";
import { RefetchQueryDescription } from "apollo-client/core/watchQueryOptions";
import { NormalizedCacheObject } from "apollo-cache-inmemory";
import { Store as ReduxStore } from "redux";
import { ApolloCache } from "apollo-cache";
import saveSnapshot from "../actions/saveSnapshot";
import { OfflineCacheShape } from "../cache";
export declare type DetectNetwork = () => boolean;
export interface CacheUpdates {
    [key: string]: (context: any) => MutationUpdaterFn;
}
declare type Store = ReduxStore<OfflineCacheShape>;
export declare const boundSaveSnapshot: <CacheShape extends NormalizedCacheObject>(store: Store, cache: ApolloCache<CacheShape>) => ReturnType<typeof saveSnapshot>;
export declare type EnqueuedMutationEffect<T> = {
    optimisticResponse: Record<string, unknown>;
    operation: GraphQLRequest;
    update: MutationUpdaterFn<T>;
    updateQueries: MutationQueryReducersMap<T>;
    refetchQueries: ((result: ExecutionResult) => RefetchQueryDescription) | RefetchQueryDescription;
    observer: ZenObservable.SubscriptionObserver<T>;
    fetchPolicy?: FetchPolicy;
    attemptId: string;
};
export interface OfflineLinkOptions {
    store: Store;
}
export default class OfflineLink extends ApolloLink {
    private store;
    constructor({ store }: OfflineLinkOptions);
    request(operation: Operation, forward: NextLink): Observable<FetchResult>;
    processOfflineQuery: (operation: Operation) => unknown;
    enqueueMutation: <T>(operation: Operation, observer: ZenObservable.SubscriptionObserver<T>) => Record<string, unknown>;
}
export {};
