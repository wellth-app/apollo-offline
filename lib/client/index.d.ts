import "setimmediate";
import { Middleware } from "redux";
import ApolloClient, { MutationOptions, ApolloClientOptions, OperationVariables, ApolloQueryResult } from "apollo-client";
import { ApolloLink, FetchResult } from "apollo-link";
import { NormalizedCacheObject, ApolloReducerConfig } from "apollo-cache-inmemory";
import { CacheUpdates } from "../links/offline";
import { Discard } from "../effects/discard";
export declare type OfflineCallback = (error: any, success: any) => void;
export interface OfflineConfig {
    discardCondition: Discard;
    callback?: OfflineCallback;
    storage?: any;
    storeCacheRootMutation?: boolean;
    runPersistenceLoadedEffect?: boolean;
}
export interface ApolloOfflineClientOptions {
    disableOffline?: boolean;
    reduxMiddleware?: Middleware[];
    offlineLink?: ApolloLink;
    onlineLink?: ApolloLink;
    offlineConfig?: OfflineConfig;
    cacheOptions?: ApolloReducerConfig;
    mutationCacheUpdates?: CacheUpdates;
}
export default class ApolloOfflineClient extends ApolloClient<NormalizedCacheObject> {
    mutationCacheUpdates: CacheUpdates;
    private reduxStore;
    private hydratedPromise;
    private disableOffline;
    constructor({ disableOffline, reduxMiddleware, offlineLink, onlineLink, cacheOptions, mutationCacheUpdates, offlineConfig: { discardCondition, callback: offlineCallback, storage, storeCacheRootMutation, runPersistenceLoadedEffect, }, }: ApolloOfflineClientOptions, { cache: customCache, link: customLink, ...clientOptions }?: Partial<ApolloClientOptions<NormalizedCacheObject>>);
    hydrated(): Promise<ApolloOfflineClient>;
    isOfflineEnabled(): boolean;
    networkConnected(): boolean;
    reset(): Promise<ApolloQueryResult<any>[]>;
    resetStore(): Promise<ApolloQueryResult<any>[]>;
    clearStore(): Promise<any[]>;
    private resetReduxStore;
    mutate<TData, TVariables = OperationVariables>(options: MutationOptions<TData, TVariables>): Promise<FetchResult<TData>>;
}
export { ApolloOfflineClient, CacheUpdates };
