import "setimmediate";
import { Middleware } from "redux";
import ApolloClient, { MutationOptions, ApolloClientOptions, OperationVariables } from "apollo-client";
import { ApolloLink, FetchResult } from "apollo-link";
import { NormalizedCacheObject, ApolloReducerConfig } from "apollo-cache-inmemory";
import { CacheUpdates } from "../links/offline";
import { Discard } from "../store";
export declare type OfflineCallback = (error: any, success: any) => void;
export interface OfflineConfig {
    discardCondition: Discard;
    callback?: OfflineCallback;
    storage?: any;
    storeCacheRootMutation?: boolean;
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
export default class ApolloOfflineClient<T extends NormalizedCacheObject> extends ApolloClient<T> {
    mutationCacheUpdates: CacheUpdates;
    private _store;
    private hydratedPromise;
    private _disableOffline;
    hydrated(): Promise<ApolloOfflineClient<T>>;
    constructor({ disableOffline, reduxMiddleware, offlineLink, onlineLink, cacheOptions, mutationCacheUpdates, offlineConfig: { discardCondition, callback: offlineCallback, storage, storeCacheRootMutation, }, }: ApolloOfflineClientOptions, { cache: customCache, link: customLink, ...clientOptions }?: Partial<ApolloClientOptions<T>>);
    isOfflineEnabled(): boolean;
    reset(): Promise<void>;
    mutate<T, TVariables = OperationVariables>(options: MutationOptions<T, TVariables>): Promise<FetchResult<T>>;
}
export { ApolloOfflineClient };
