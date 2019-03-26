import "setimmediate";
import { Store, Middleware } from "redux";
import ApolloClient, {
  MutationOptions,
  ApolloClientOptions,
} from "apollo-client";
import { ApolloLink, Observable, Operation, NextLink } from "apollo-link";
import { NormalizedCacheObject } from "apollo-cache-inmemory";
import { NetworkCallback } from "@redux-offline/redux-offline/lib/types";
import OfflineLink, { offlineEffect, discard } from "../links/offline";
import passthroughLink from "../links/passthrough";
import { REHYDRATE_STORE } from "../actions/rehydrateStore";
import { createOfflineStore, Discard } from "../store";
import networkConnected from "../selectors/networkConnected";
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
      disableOffline
        ? null
        : new OfflineLink({
            store,
            detectNetwork: () => networkConnected(store.getState()),
          }),
      onlineLink,
    ].filter(Boolean),
  );

export type OfflineCallback = (error: any, success: any) => void;

export interface OfflineConfig {
  discardCondition: Discard;
  callback?: OfflineCallback;
}

export interface Options {
  /// If true, disables offline behavior, and only executes `onlineLink`
  disableOffline?: boolean;
  /// Middleware for the redux-offline store.
  reduxMiddleware?: Middleware[];
  /// Link executed before the offline cache.
  offlineLink?: ApolloLink;
  /// Link executed after the offline cache.
  onlineLink?: ApolloLink;
  /// Callback utilized for detecting network connectivity.
  detectNetwork?: (callback: NetworkCallback) => void;
  /// Storage client for persistence (default undefined)
  storage?: any;
  /// Configuration for offline behavior.
  offlineConfig?: OfflineConfig;
}

const DEFAULT_OFFLINE_CONFIG: OfflineConfig = {
  // Discard a request after 100 attempts
  discardCondition: (error, action, retries) => retries > 100,
};

const RESET_STATE = "Offline/RESET_STATE";

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
      detectNetwork,
      reduxMiddleware = [],
      offlineLink = null,
      onlineLink = null,
      storage = undefined,
      offlineConfig: {
        discardCondition,
        callback: offlineCallback,
      } = DEFAULT_OFFLINE_CONFIG,
    }: Options,
    {
      cache: customCache = undefined,
      link: customLink = undefined,
      ...clientOptions
    }: Partial<ApolloClientOptions<T>> = {},
  ) {
    let resolveClient: (
      client: ApolloOfflineClient<T> | PromiseLike<ApolloOfflineClient<T>>,
    ) => void;

    // If no `onlineLink` is provided, the operation will not be forwarded
    // to the network becuase this library does not provide a "terminating"
    // link for the online scenario...

    // ???: Should we fail if no `onlineLink` is provided?
    // ???: Should we fail if offline is disabled and no `onlineLink`?

    // TODO: if `disableOffline`, don't create the store
    const store: Store<AppState> = disableOffline
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
          detectNetwork,
          storage,
        });

    // !!!: The "offline cache" mentioned in the comment below doesn't exist
    // TODO: if `disableOffline`, use the provided custom cache, or create an InMemoryCache,
    //       otherwise create a new offline cache.
    // !!!: The default behavior, right now, is to use the provided cache
    // const cache = disableOffline ? (customCache || new InMemoryCache()) : new OfflineCache()
    const cache = customCache;

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
    this._store.dispatch({ type: RESET_STATE });
    await this.cache.reset();
    await this.resetStore();
  }

  mutate(options: MutationOptions) {
    if (this._disableOffline) {
      return super.mutate(options);
    }

    const {
      optimisticResponse,
      context: originalContext = {},
      update,
      fetchPolicy,
      ...otherOptions
    } = options;

    const context = {
      ...originalContext,
      apolloOfflineContext: {
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
