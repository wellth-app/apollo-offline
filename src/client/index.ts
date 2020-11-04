import "setimmediate";
import { Store, Middleware } from "redux";
import ApolloClient, {
  MutationOptions,
  ApolloClientOptions,
  OperationVariables,
  MutationUpdaterFn,
  ApolloQueryResult,
} from "apollo-client";
import {
  ApolloLink,
  Observable,
  Operation,
  NextLink,
  FetchResult,
} from "apollo-link";
import { getOperationName } from "apollo-utilities";
import { ApolloCache } from "apollo-cache";
import {
  NormalizedCacheObject,
  InMemoryCache,
  ApolloReducerConfig,
  defaultDataIdFromObject,
} from "apollo-cache-inmemory";
import { persistenceLoadedEffect } from "../effects/persistenceLoaded";
import { CacheUpdates } from "../links/offline";
import { offlineEffect } from "../effects/offline";
import { discard, Discard, OfflineAction } from "../effects/discard";
import passthroughLink from "../links/passthrough";
import { createNetworkLink } from "../links/createNetworkLink";
import resetState from "../actions/resetState";
import { createOfflineStore } from "../store";
import { rootLogger } from "../utils";
import OfflineCache, { OfflineCacheShape as OfflineCacheType } from "../cache";

const logger = rootLogger.extend("client");

export type OfflineCallback = (error: any, success: any) => void;
export { Discard, OfflineAction };

export interface OfflineConfig {
  // Condition to evaulate whether an error request should be discarded (default undefined).
  discardCondition: Discard;
  // Callback for successful/failed network requests (default undefined).
  callback?: OfflineCallback;
  // Storage client for persistence (default undefined).
  storage?: any;
  // Whether or not to store the root mutation in the cache (default false).
  storeCacheRootMutation?: boolean;
  // Whether or not to run persistence loaded effect when persistence loads (default false).
  runPersistenceLoadedEffect?: boolean;
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

export default class ApolloOfflineClient extends ApolloClient<
  NormalizedCacheObject
> {
  public mutationCacheUpdates: CacheUpdates;

  private reduxStore: Store<OfflineCacheType>;

  // Resolves when `@redux-offline` rehydrates
  private hydratedPromise: Promise<ApolloOfflineClient>;

  private disableOffline: boolean;

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
        callback: offlineCallback = () => {
          // !!!: Do nothing by default
        },
        storage = undefined,
        storeCacheRootMutation = false,
        runPersistenceLoadedEffect = false,
      },
    }: ApolloOfflineClientOptions,
    {
      cache: customCache = undefined,
      link: customLink = undefined,
      ...clientOptions
    }: Partial<ApolloClientOptions<NormalizedCacheObject>> = {},
  ) {
    let resolveClient: (
      client: ApolloOfflineClient | PromiseLike<ApolloOfflineClient>,
    ) => void;

    // ???: Should we fail if no `onlineLink` is provided?
    // ???: Should we fail if offline is disabled and no `onlineLink`?

    const dataIdFromObject = disableOffline
      ? () => null
      : cacheOptions.dataIdFromObject || defaultDataIdFromObject;
    const store: Store<OfflineCacheType> = disableOffline
      ? null
      : createOfflineStore({
          storage,
          dataIdFromObject,
          middleware: reduxMiddleware,
          persistCallback: () => {
            if (runPersistenceLoadedEffect) {
              persistenceLoadedEffect(store, this, mutationCacheUpdates);
            }

            resolveClient(this);
          },
          effect: (effect, action) =>
            offlineEffect(
              store,
              this,
              effect,
              action,
              offlineCallback,
              mutationCacheUpdates,
            ),
          discard: discard(discardCondition, (error) =>
            offlineCallback(error, null),
          ),
        });

    const cache: ApolloCache<NormalizedCacheObject> = disableOffline
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
            .catch(observer.error.bind(observer));

          return () => {
            if (handle) {
              handle.unsubscribe();
            }
          };
        });
      }),
      customLink ||
        createNetworkLink({ store, disableOffline, offlineLink, onlineLink }),
    ]);

    super({
      ...clientOptions,
      link,
      cache,
    });

    this.mutationCacheUpdates = mutationCacheUpdates;
    this.reduxStore = store;
    this.disableOffline = disableOffline;
    this.hydratedPromise = disableOffline
      ? Promise.resolve(this)
      : new Promise((resolve) => {
          resolveClient = resolve;
        });
  }

  hydrated(): Promise<ApolloOfflineClient> {
    return this.hydratedPromise;
  }

  isOfflineEnabled(): boolean {
    return !this.disableOffline;
  }

  reduxState(): OfflineCacheType {
    return this.reduxStore.getState();
  }

  networkConnected(): boolean {
    return this.reduxState().offline.online;
  }

  reset(): Promise<ApolloQueryResult<any>[]> {
    // eslint-disable-next-line no-console
    console.info(
      "ApolloOfflineClient.reset() is deprecated and will be removed in future versions. Use `resetStore` or `clearStore` instead.",
    );

    return this.resetStore();
  }

  resetStore(): Promise<ApolloQueryResult<any>[]> {
    this.resetReduxStore();
    return super.resetStore();
  }

  clearStore(): Promise<any[]> {
    this.resetReduxStore();
    return super.clearStore();
  }

  private resetReduxStore(): void {
    logger("Resetting redux store");
    this.reduxStore.dispatch(resetState);
  }

  mutate<TData, TVariables = OperationVariables>(
    options: MutationOptions<TData, TVariables>,
  ): Promise<FetchResult<TData>> {
    if (!this.isOfflineEnabled()) {
      return super.mutate(options);
    }

    const execute = false;
    const {
      optimisticResponse,
      context: originalContext,
      update,
      fetchPolicy,
      ...otherOptions
    } = options;

    const operationName = getOperationName(options.mutation);
    let mutationUpdate: MutationUpdaterFn<TData> | undefined = update;
    if (!mutationUpdate && this.mutationCacheUpdates[operationName]) {
      const contextUpdate = this.mutationCacheUpdates[operationName];
      mutationUpdate = contextUpdate(originalContext);
    }

    // Configure context for apollo-offline based on provided options
    const context = {
      ...originalContext,
      apolloOfflineContext: {
        execute,
        update: mutationUpdate,
        fetchPolicy,
        optimisticResponse,
      },
    };

    return super.mutate({
      optimisticResponse,
      context,
      update: mutationUpdate,
      fetchPolicy,
      ...otherOptions,
    });
  }
}

export { ApolloOfflineClient, CacheUpdates };
