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
import { NormalizedCacheObject, InMemoryCache } from "apollo-cache-inmemory";
import { NetworkCallback } from "@redux-offline/redux-offline/lib/types";
import OfflineLink, { offlineEffect, discard } from "../links/offline";
import passthroughLink from "../links/passthrough";
import resetState from "../actions/resetState";
import { REHYDRATE_STORE } from "../actions/rehydrateStore";
import { createOfflineStore, Discard } from "../store";
import { rootLogger } from "../utils";
import { State as AppState } from "../reducers";

const logger = rootLogger.extend("client");

const createNetworkLink = (
  store: Store<AppState>,
  disableOffline: boolean = false,
  offlineLink?: ApolloLink,
  onlineLink?: ApolloLink,
) =>
  ApolloLink.from(
    [
      offlineLink,
      disableOffline ? null : new OfflineLink(store),
      onlineLink,
    ].filter(Boolean),
  );

export type OfflineCallback = (error: any, success: any) => void;

export interface OfflineConfig {
  // Condition to evaulate whether an error request should be discarded (default undefined).
  discardCondition: Discard;
  // Callback for successful/failed network requests (default undefined).
  callback?: OfflineCallback;
  // Storage client for persistence (default undefined).
  storage?: any;
  // Manual override for network detection (default undefined).
  detectNetwork?: (callback: NetworkCallback) => void;
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
}

export default class ApolloOfflineClient<
  T extends NormalizedCacheObject
> extends ApolloClient<T> {
  private _store: Store<AppState>;

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
      offlineConfig: {
        discardCondition,
        callback: offlineCallback = undefined,
        storage = undefined,
        detectNetwork = undefined,
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

    const store = disableOffline
      ? null
      : createOfflineStore({
          middleware: reduxMiddleware,
          persistCallback: () => {
            store.dispatch({ type: REHYDRATE_STORE });
            resolveClient(this);
          },
          effect: (effect, action) =>
            offlineEffect(store, this, effect, action, offlineCallback),
          discard: discard(discardCondition, offlineCallback),
          storage,
          detectNetwork,
        });

    // !!!: The "offline cache" mentioned in the comment below doesn't exist
    // TODO: if `disableOffline`, use the provided custom cache, or create an InMemoryCache,
    //       otherwise create a new offline cache.
    // !!!: The default behavior, right now, is to use the provided cache
    // const cache = disableOffline ? (customCache || new InMemoryCache()) : new OfflineCache()
    const cache: ApolloCache<any> = customCache || new InMemoryCache();

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
        : createNetworkLink(store, disableOffline, offlineLink, onlineLink),
    ]);

    super({
      ...clientOptions,
      link,
      cache,
    });

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

export { ApolloOfflineClient };
