import { Store, Middleware } from "redux";
import ApolloClient, {
  MutationOptions,
  ApolloClientOptions,
} from "apollo-client";
import { getOperationDefinition, variablesInOperation } from "apollo-utilities";
import { ApolloLink, Observable, Operation, NextLink } from "apollo-link";
import { NetworkCallback } from "@redux-offline/redux-offline/lib/types";
import OfflineLink, { offlineEffect, discard } from "../links/offline";
import passthroughLink from "../links/passthrough";
import { REHYDRATE_STORE } from "../actions/rehydrateStore";
import { createOfflineStore } from "../store";
import networkConnected from "../selectors/networkConnected";
import { rootLogger } from "../utils";

const logger = rootLogger.extend("client");

const createNetworkLink = (
  store: Store<any>,
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
  // The number of times to retry a request
  maxRetryCount?: number;
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

const RESET_STATE = "Offline/RESET_STATE";

export default class ApolloOfflineClient<T> extends ApolloClient<T> {
  private _store: Store<any>;

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
        maxRetryCount = 10,
        callback: offlineCallback = () => {},
      } = {},
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
    const store: Store<any> = disableOffline
      ? null
      : createOfflineStore({
          middleware: reduxMiddleware,
          persistCallback: () => {
            store.dispatch({ type: REHYDRATE_STORE });
            resolveClient(this);
          },
          effect: (effect) => offlineEffect(this, effect),
          discard: discard(maxRetryCount, offlineCallback),
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
      mutation,
      variables: mutationVariables,
      optimisticResponse,
      context: originalContext = {},
    } = options;
    const { offlineContext: originalOfflineContext = {} } = originalContext;

    const operationDefinition = getOperationDefinition(mutation);
    const operationVariables = variablesInOperation(operationDefinition);
    const variables = [...operationVariables].reduce(
      (object: any, key: string) => ({
        ...object,
        [key]: mutationVariables[key],
      }),
      {},
    );

    const { execute: executeMutation } = originalOfflineContext;
    const { refetchQueries, ...otherOptions } = options;

    const context = {
      ...originalContext,
      offlineContext: {
        ...originalOfflineContext,
        mutation,
        variables,
        optimisticResponse,
        refetchQueries,
      },
    };

    const newOptions = {
      ...otherOptions,
      refetchQueries: executeMutation ? refetchQueries : undefined,
      context,
    };

    return super.mutate(newOptions);
  }
}
