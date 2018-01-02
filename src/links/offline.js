// @flow
import { ApolloLink, Operation, NextLink, Observable } from "apollo-link";
import {
  readQueryFromStore,
  defaultNormalizedCacheFactory,
} from "apollo-cache-inmemory";
import { getOperationDefinition, getOperationName } from "apollo-utilities";
import { Action, Store } from "redux";
import { QUEUE_OPERATION } from "../actions/queueOperation";
import { QUEUE_OPERATION_COMMIT } from "../actions/queueOperationCommit";
import { QUEUE_OPERATION_ROLLBACK } from "../actions/queueOperationRollback";

import { NORMALIZED_CACHE_KEY } from "../cache";

export default class OfflineLink extends ApolloLink {
  store: Store;

  constructor(store: Store, options: ApolloLink.Options) {
    super((operation: Operation, forward: NextLink) => {
      return new Observable(observer => {
        const finish = data => {
          observer.next({ data });
          observer.complete();
          return () => null;
        };

        const { offline: { online } } = store.getState();
        const { operation: operationType } = getOperationDefinition(
          operation.query
        );
        const isMutation = operationType === "mutation";
        const isQuery = operationType === "query";

        if (!online && isQuery) {
          const data = processOfflineQuery(operation, store);
          return finish(data);
        }

        if (isMutation) {
          const data = processMutation(operation, store);

          if (data) {
            return finish(data);
          }
        }

        const handle = forward(operation).subscribe({
          next: observer.next.bind(observer),
          error: observer.error.bind(observer),
          complete: observer.complete.bind(observer),
        });

        return () => {
          if (handle) handle.unsubscribe();
        };
      });
    });
  }
}

const processOfflineQuery = (operation, store) => {
  const { [NORMALIZED_CACHE_KEY]: normalizedCache = {} } = store.getState();
  const { query, variables } = operation;
  const cacheStore = defaultNormalizedCacheFactory(normalizedCache);

  try {
    const queryData = readQueryFromStore({
      store: cacheStore,
      query,
      variables,
    });

    return queryData;
  } catch (error) {
    return null;
  }
};

const processMutation = (operation, store) => {
  const { offlineContext, ...context } = operation.getContext();
  const {
    mutation,
    variables,
    optimisticResponse,
    refetchQueries,
    execute,
  } = offlineContext;

  if (execute) {
    return;
  }

  const data =
    (optimisticResponse &&
      (typeof optimisticResponse === "function"
        ? { ...optimisticResponse(variables) }
        : optimisticResponse)) ||
    null;

  store.dispatch({
    type: QUEUE_OPERATION,
    payload: {},
    meta: {
      offline: {
        effect: {
          mutation,
          variables,
          refetchQueries,
          context,
          execute: true,
        },
        commit: { type: QUEUE_OPERATION_COMMIT, meta: null },
        rollback: { type: QUEUE_OPERATION_ROLLBACK, meta: null },
      },
    },
  });

  return data;
};

export const offlineEffect = (client, effect, action: Action) => {
  const { type } = action;
  const {
    mutation,
    variables,
    refetchQueries,
    execute,
    context: originalContext,
  } = effect;

  const context = {
    ...originalContext,
    offlineContext: {
      execute,
    },
  };

  const options = {
    mutation,
    variables,
    refetchQueries,
    context,
  };

  return client.mutate(options);
};

export const discard = (error, action: Action, retries: number) => {
  const { graphQLErrors = [] } = error;
  if (graphQLErrors.length) {
    return true;
  } else {
    if (error.networkError.statusCode >= 400) {
      return true;
    }
  }

  return error.permanent || retries > 10;
};
