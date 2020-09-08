import "setimmediate";
import { Store, Middleware } from "redux";
import ApolloClient, {
  MutationOptions,
  ApolloClientOptions,
  OperationVariables,
} from "apollo-client";
import {
  ApolloLink,
  Observable,
  Operation,
  NextLink,
  FetchResult,
} from "apollo-link";
import { ApolloCache } from "apollo-cache";
import {
  NormalizedCacheObject,
  InMemoryCache,
  ApolloReducerConfig,
  defaultDataIdFromObject,
} from "apollo-cache-inmemory";
import { offlineEffect, discard, CacheUpdates } from "../links/offline";
import passthroughLink from "../links/passthrough";
import { createNetworkLink } from "../links/createNetworkLink";
import resetState from "../actions/resetState";
import { createOfflineStore, Discard } from "../store";
import { rootLogger } from "../utils";
import {
  default as OfflineCache,
  OfflineCache as OfflineCacheType,
} from "../cache";

const logger = rootLogger.extend("client");

export type OfflineCallback = (error: any, success: any) => void;

export interface OfflineConfig {
  // Condition to evaulate whether an error request should be discarded (default undefined).
  discardCondition: Discard;
  // Callback for successful/failed network requests (default undefined).
  callback?: OfflineCallback;
  // Storage client for persistence (default undefined).
  storage?: any;
  // Whether or not to store the root mutation in the cache (default false).
  storeCacheRootMutation?: boolean;
}

export interface ApolloOfflineClientOptions {
  /// If true, disables offline behavior, and only executes `onlineLink`
  disableOffline?: boolean;
  /// Middleware for the redux-offline store.
  reduxMiddleware?: Middleware[];
  /// Link executed before the offline cache.
  offlineLink?: ApolloLink;
  /// Link executed after the offline cache.
  onlineLink?: ApolloLink;
  /// Configuration for offline behavior.
  offlineConfig?: OfflineConfig;
  cacheOptions?: ApolloReducerConfig;
  mutationCacheUpdates?: CacheUpdates;
}

export default class ApolloOfflineClient<
  T extends NormalizedCacheObject
> extends ApolloClient<T> {
  public mutationCacheUpdates: CacheUpdates;
  private _store: Store<OfflineCacheType>;
  // Resolves when `@redux-offline` rehydrates
  private hydratedPromise: Promise<ApolloOfflineClient<T>>;
  private _disableOffline: boolean;

  hydrated() {
    return this.hydratedPromise;
  }

  constructor(
    {
      disableOffline = false,
      reduxMiddleware = [],
      offlineLink = null,
      onlineLink = null,
      cacheOptions = {},
      mutationCacheUpdates = {},
      offlineConfig: {
        discardCondition,
        callback: offlineCallback = undefined,
        storage = undefined,
        storeCacheRootMutation = false,
      },
    }: ApolloOfflineClientOptions,
    {
      cache: customCache = undefined,
      link: customLink = undefined,
      ...clientOptions
    }: Partial<ApolloClientOptions<T>> = {},
  ) {
    let resolveClient: (
      client: ApolloOfflineClient<T> | PromiseLike<ApolloOfflineClient<T>>,
    ) => void;

    // ???: Should we fail if no `onlineLink` is provided?
    // ???: Should we fail if offline is disabled and no `onlineLink`?

    const dataIdFromObject = disableOffline
      ? () => null
      : cacheOptions.dataIdFromObject || defaultDataIdFromObject;
    const store = disableOffline
      ? null
      : createOfflineStore({
          storage,
          dataIdFromObject,
          middleware: reduxMiddleware,
          persistCallback: () => resolveClient(this),
          effect: (effect, action) =>
            offlineEffect(
              store,
              this,
              effect,
              action,
              offlineCallback,
              mutationCacheUpdates,
            ),
          discard: discard(discardCondition, offlineCallback),
        });

    const cache: ApolloCache<any> = disableOffline
      ? customCache || new InMemoryCache(cacheOptions)
      : new OfflineCache({ store, storeCacheRootMutation }, cacheOptions);

    // !!!: Create the link with a `RehydrateLink` as the first link
    // to ensure requests are queued until rehydration. This will be the first link
    // whether we use `clientOptions.link` or the default link stack.
    const link = ApolloLink.from([
      new ApolloLink((operation: Operation, forward: NextLink) => {
        let handle: ZenObservable.Subscription = null;
        return new Observable((observer) => {
          this.hydratedPromise
            .then(() => {
              handle = passthroughLink(operation, forward).subscribe(observer);
            })
            .catch(observer.error);

          return () => {
            if (handle) {
              handle.unsubscribe;
            }
          };
        });
      }),
      !!customLink
        ? customLink
        : createNetworkLink({ store, disableOffline, offlineLink, onlineLink }),
    ]);

    super({
      ...clientOptions,
      link,
      cache,
    });

    this.mutationCacheUpdates = mutationCacheUpdates;
    this._store = store;
    this._disableOffline = disableOffline;
    this.hydratedPromise = disableOffline
      ? Promise.resolve(this)
      : new Promise((resolve) => {
          resolveClient = resolve;
        });
  }

  isOfflineEnabled() {
    return !this._disableOffline;
  }

  async reset() {
    logger("Resetting client store and cache");
    this._store.dispatch(resetState);
    await this.cache.reset();
    await this.resetStore();
  }

  mutate<T, TVariables = OperationVariables>(
    options: MutationOptions<T, TVariables>,
  ): Promise<FetchResult<T>> {
    if (!this.isOfflineEnabled()) {
      return super.mutate(options);
    }

    const execute = false;
    const {
      optimisticResponse,
      context: originalContext = {},
      update,
      fetchPolicy,
      ...otherOptions
    } = options;

    // Configure context for apollo-offline based on provided options
    const context = {
      ...originalContext,
      apolloOfflineContext: {
        execute,
        update,
        fetchPolicy,
        optimisticResponse,
      },
    };

    return super.mutate({
      optimisticResponse,
      context,
      update,
      fetchPolicy,
      ...otherOptions,
    });
  }
}

export { ApolloOfflineClient, CacheUpdates };
