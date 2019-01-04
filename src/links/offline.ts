// @flow
import { ApolloLink, Operation, NextLink, Observable } from "apollo-link";
import { getOperationDefinition } from "apollo-utilities";
import { Action, Store } from "redux";
import { QUEUE_OPERATION } from "../actions/queueOperation";
import { QUEUE_OPERATION_COMMIT } from "../actions/queueOperationCommit";
import { QUEUE_OPERATION_ROLLBACK } from "../actions/queueOperationRollback";
import ApolloOfflineClient from "../client";

type DetectNetwork = () => boolean;

export interface Options {
  store: Store;
  detectNetwork: DetectNetwork;
}

const OPERATION_TYPE_MUTATION = "mutation";
const OPERATION_TYPE_QUERY = "query";
const ERROR_STATUS_CODE = 400;

export default class OfflineLink extends ApolloLink {
  private store: Store;
  private detectNetwork: DetectNetwork;

  constructor({ store, detectNetwork }: Options) {
    super();
    this.store = store;
    this.detectNetwork = detectNetwork;
  }

  request(operation: Operation, forward: NextLink) {
    const { requireOnline = false } = operation.getContext();
    if (requireOnline) {
      return forward(operation);
    }

    return new Observable((observer) => {
      const finish = (data: any): (() => void) => {
        observer.next({ data });
        observer.complete();
        return () => null;
      };

      const online = this.detectNetwork();
      const { operation: operationType } = getOperationDefinition(
        operation.query,
      );

      const isMutation = operationType === OPERATION_TYPE_MUTATION;
      const isQuery = operationType === OPERATION_TYPE_QUERY;

      if (!online && isQuery) {
        const data = processOfflineQuery(operation);
        return finish(data);
      }

      if (isMutation) {
        const data = processMutation(operation, this.store);
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
  }
}

const processOfflineQuery = ({ query, variables, getContext }: Operation) => {
  const { cache } = getContext();

  try {
    const queryData = cache.readQuery({
      query,
      variables,
    });

    return queryData;
  } catch (error) {
    return null;
  }
};

const processMutation = (operation: Operation, store: Store) => {
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

export const offlineEffect = async <T>(
  client: ApolloOfflineClient<T>,
  effect: any,
) => {
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

export const discard = (error: any, action: Action) => {
  const { graphQLErrors = [] } = error;
  if (graphQLErrors.length) {
    return true;
  } else {
    if (error.networkError.statusCode >= ERROR_STATUS_CODE) {
      return true;
    }
  }

  return error.permanent;
};
