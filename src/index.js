// @flow
import { Action, Store, Middleware } from "redux";
import ApolloClient, {
  MutationOptions,
  ApolloClientOptions,
} from "apollo-client";
import {
  toIdValue,
  getOperationDefinition,
  variablesInOperation,
} from "apollo-utilities";
import { ApolloLink } from "apollo-link";
import { RESET_STATE } from "@redux-offline/redux-offline/lib/constants";
import type { NetworkCallback } from "@redux-offline/redux-offline";
import OfflineLink, { offlineEffect, discard } from "./links/offline";
import { REHYDRATE_STORE } from "./actions/rehydrateStore";
import { createOfflineStore } from "./store";
import networkConnected from "./selectors/networkConnected";

export type Input = {
  /// Middleware for the redux-offline store.
  middleware?: Middleware[],
  /// Links executed before the offline cache.
  offlineLinks?: ApolloLink[],
  /// Links executed after the offline cache but before the network.
  onlineLinks?: ApolloLink[],
  /// Callback to be invoked when the redux-offline store is rehydrated.
  persistCallback?: () => void,
  detectNetwork?: (callback: NetworkCallback) => void,
};

export type Options = Input & ApolloClientOptions;

export default class ApolloOfflineClient extends ApolloClient {
  reduxStore: Store;

  constructor(options: Options) {
    const {
      persistCallback = () => {},
      detectNetwork,
      middleware = [],
      offlineLinks = [],
      onlineLinks = [],
      ...clientOptions
    } = options;
    const { cache } = clientOptions;

    const store = createOfflineStore({
      middleware,
      persistCallback: () => {
        store.dispatch({ type: REHYDRATE_STORE });
        persistCallback();
      },
      effect: (effect, action: Action) => offlineEffect(this, effect, action),
      discard,
      detectNetwork,
    });

    super({
      ...clientOptions,
      link: ApolloLink.from([
        ...offlineLinks,
        new OfflineLink({
          store,
          cache,
          detectNetwork: () => networkConnected(store.getState()),
        }),
        ...onlineLinks,
      ]),
    });

    this.reduxStore = store;
  }

  reset = async () => {
    this.reduxStore.dispatch({ type: RESET_STATE });

    await this.cache.reset();
    await this.resetStore();
  };

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
    const variables = [...operationVariables].reduce((object, key) => {
      object[key] = mutationVariables[key];
      return object;
    }, {});

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
