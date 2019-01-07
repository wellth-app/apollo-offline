import { Store, Middleware } from "redux";
import ApolloClient, {
  MutationOptions,
  ApolloClientOptions,
} from "apollo-client";
import { getOperationDefinition, variablesInOperation } from "apollo-utilities";
import { ApolloLink, Observable } from "apollo-link";
import { NetworkCallback } from "@redux-offline/redux-offline/lib/types";
import OfflineLink, { offlineEffect, discard } from "../links/offline";
import passthroughLink from "../links/passthrough";
import { REHYDRATE_STORE } from "../actions/rehydrateStore";
import { createOfflineStore } from "../store";
import networkConnected from "../selectors/networkConnected";

export interface Options {
  // disableOffline?: boolean;
  /// Middleware for the redux-offline store.
  reduxMiddleware?: Middleware[];
  /// Link executed before the offline cache.
  offlineLink?: ApolloLink;
  /// Link executed after the offline cache.
  onlineLink?: ApolloLink;
  /// Callback to be invoked when the redux-offline store is rehydrated.
  persistCallback?: () => void;
  /// Callback utilized for detecting network connectivity.
  detectNetwork?: (callback: NetworkCallback) => void;
}

const RESET_STATE = "Offline/RESET_STATE";

export default class ApolloOfflineClient<T> extends ApolloClient<T> {
  private _store: Store<any>;

  // Resolves when `@redux-offline` rehydrates
  private hydratedPromise: Promise<ApolloOfflineClient<T>>;
  // private _disableOffline: boolean;

  hydrated() {
    return this.hydratedPromise;
  }

  constructor(
    {
      // disableOffline = false,
      persistCallback = () => {},
      detectNetwork,
      reduxMiddleware = [],
      offlineLink = null,
      onlineLink = null,
    }: Options,
    clientOptions?: Partial<ApolloClientOptions<T>>,
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
    const store: Store<any> = createOfflineStore({
      middleware: reduxMiddleware,
      persistCallback: () => {
        store.dispatch({ type: REHYDRATE_STORE });
        resolveClient(this);
        persistCallback();
      },
      effect: (effect) => offlineEffect(this, effect),
      discard,
      detectNetwork,
    });

    // !!!: The "offline cache" mentioned in the comment below doesn't exist
    // TODO: if `disableOffline`, use the provided custom cache, or create an InMemoryCache,
    //       otherwise create a new offline cache.
    const cache = clientOptions.cache;

    // Create the link with a `RehydrateLink` as the first link
    // to ensure requests are queued until rehydration
    const link = ApolloLink.from([
      new ApolloLink((operation, forward) => {
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
      offlineLink,
      new OfflineLink({
        store,
        detectNetwork: () => networkConnected(store.getState()),
      }),
      onlineLink,
    ]);

    super({
      ...clientOptions,
      link,
      cache,
    });

    this._store = store;
    this.hydratedPromise = new Promise((resolve) => {
      resolveClient = resolve;
    });
  }

  // isOfflineEnabled() {
  //   return !this._disableOffline;
  // }

  async reset() {
    this._store.dispatch({ type: RESET_STATE });
    await this.cache.reset();
    await this.resetStore();
  }

  mutate(options: MutationOptions) {
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
      (object: any, key: string) => {
        object[key] = mutationVariables[key];
        return object;
      },
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
