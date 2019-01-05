import { Store, Middleware } from "redux";
import ApolloClient, {
  MutationOptions,
  ApolloClientOptions,
} from "apollo-client";
import { getOperationDefinition, variablesInOperation } from "apollo-utilities";
import { ApolloLink } from "apollo-link";
import { NetworkCallback } from "@redux-offline/redux-offline/lib/types";
import OfflineLink, { offlineEffect, discard } from "../links/offline";
import { REHYDRATE_STORE } from "../actions/rehydrateStore";
import { createOfflineStore } from "../store";
import networkConnected from "../selectors/networkConnected";

export interface Options {
  // disableOffline?: boolean;
  /// Middleware for the redux-offline store.
  middleware?: Middleware[];
  /// Link executed before the offline cache.
  offlineLink?: ApolloLink;
  /// Link executed after the offline cache.
  onlineLink?: ApolloLink;
  /// Callback to be invoked when the redux-offline store is rehydrated.
  persistCallback?: () => void;
  detectNetwork?: (callback: NetworkCallback) => void;
}

const RESET_STATE = "Offline/RESET_STATE";

export default class ApolloOfflineClient<T> extends ApolloClient<T> {
  private _store: Store;
  // private _disableOffline: boolean;

  constructor(
    {
      // !!!: Unused right now... Will be used for selective cache and link creation
      // disableOffline = false,
      persistCallback = () => {},
      detectNetwork,
      middleware = [],
      offlineLink = null,
      onlineLink = null,
    }: Options,
    clientOptions?: Partial<ApolloClientOptions<T>>,
  ) {
    const store: Store = createOfflineStore({
      middleware,
      persistCallback: () => {
        store.dispatch({ type: REHYDRATE_STORE });
        persistCallback();
      },
      effect: (effect) => offlineEffect(this, effect),
      discard,
      detectNetwork,
    });

    // TODO: Extend for custom cache strategies; the cache is provided in `clientOptions`, but can be null.

    super({
      ...clientOptions,
      cache: clientOptions.cache,
      link: ApolloLink.from(
        [
          offlineLink,
          new OfflineLink({
            store,
            detectNetwork: () => networkConnected(store.getState()),
          }),
          onlineLink,
        ].filter((link) => link as ApolloLink),
      ),
    });

    this._store = store;
    // this._disableOffline = disableOffline;
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
