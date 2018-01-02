/// @flow
import ApolloClient, {
  MutationOptions,
  ApolloClientOptions,
} from "apollo-client";
import {
  toIdValue,
  getOperationDefinition,
  variablesInOperation,
} from "apollo-utilities";
import { ApolloLink, HttpLink } from "apollo-link-http";
import {
  InMemoryCache,
  IntrospectionFragmentMatcher,
} from "apollo-cache-inmemory";
import type {
  IntrospectionResultData,
  CacheResolverMap,
} from "apollo-cache-inmemory";
import { persistCache } from "apollo-cache-persist";
import { RESET_STATE } from "@redux-offline/redux-offline/lib/constants";
import moment from "moment-timezone";
import OfflineLink, { offlineEffect, discard } from "./links/offline";
import { createOfflineStore } from "./store";

export type Options = {
  /// The uri of the grpahql API.
  uri: string,
  /// Middleware for the redux-offline store.
  middleware?: Middleware[],
  /// Links executed before the offline cache.
  offlineLinks?: ApolloLink[],
  /// Links executed after the offline cache but before the network.
  onlineLinks?: ApolloLink[],
  /// Callback to be invoked when the redux-offline store is rehydrated.
  persistCallback?: () => void,
};

export default class ApolloOfflineClient extends ApolloClient {
  reduxStore: Store;

  constructor(options: Options & ApolloClientOptions) {
    const {
      uri,
      cache,
      persistCallback = () => {},
      middleware = [],
      offlineLinks = [],
      onlineLinks = [],
    } = options;

    const store = createOfflineStore({
      middleware,
      persistCallback: () => {
        store.dispatch({ type: REHYDRATE_STORE });
        persistCallback();
      },
      effect: (effect, action: Action) => offlineEffect(this, effect, action),
      discard,
    });

    const link = ApolloLink.from([
      ...offlineLinks,
      new OfflineLink(store),
      ...onlineLinks,
    ]);

    const newOptions = {
      ...clientOptions,
      link,
      cache,
    };

    super(newOptions);

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
