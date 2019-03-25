import { ApolloLink, Operation, NextLink, Observable } from "apollo-link";
import { getOperationDefinition } from "apollo-utilities";
import { Action, Store as ReduxStore } from "redux";
import { print } from "graphql/language/printer";
import { QUEUE_OPERATION } from "../actions/queueOperation";
import { QUEUE_OPERATION_COMMIT } from "../actions/queueOperationCommit";
import { QUEUE_OPERATION_ROLLBACK } from "../actions/queueOperationRollback";
import ApolloOfflineClient, { OfflineCallback } from "../client";
import { rootLogger } from "../utils";

const logger = rootLogger.extend("offline-link");

export type DetectNetwork = () => boolean;

type Store = ReduxStore<any>;

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

      logger("Executing operation on network", {
        query: print(operation.query),
        variables: operation.variables,
      });

      const handle = forward(operation).subscribe(observer);

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

  const effect = {
    mutation,
    variables,
    refetchQueries,
    context,
    execute: true,
  };

  logger("Enqueing mutation and returning optimistic response", {
    variables,
    optimisticResponse,
    mutation: print(mutation),
  });

  store.dispatch({
    type: QUEUE_OPERATION,
    payload: {},
    meta: {
      offline: {
        effect,
        commit: { type: QUEUE_OPERATION_COMMIT, meta: null },
        rollback: { type: QUEUE_OPERATION_ROLLBACK, meta: null },
      },
    },
  });

  return data;
};

export const offlineEffect = async <T>(
  client: ApolloOfflineClient<T>,
  // TODO: Typings...
  {
    mutation,
    variables,
    refetchQueries,
    execute,
    context: originalContext,
  }: any,
) => {
  await client.hydrated();
  return client.mutate({
    mutation,
    variables,
    refetchQueries,
    context: {
      ...originalContext,
      offlineContext: {
        execute,
      },
    },
  });
};

export const discard = (maxRetryCount: number, callback: OfflineCallback) => (
  error: any,
  action: Action,
  retries: number,
) => {
  const discardResult = shouldDiscard(error, action, retries, maxRetryCount);

  if (discardResult) {
    callback(error, null);
  }

  return discardResult;
};

const shouldDiscard = (
  { graphQLErrors = [], networkError, permanent }: any,
  action: Action,
  retries: number,
  maxRetryCount: number,
) => {
  // If there are GraphQL errors, discard the request
  if (graphQLErrors.length) {
    logger("Discarding action due to GraphQL errors", action, graphQLErrors);
    return true;
  }

  // If the network error status code >= 400, discard the request
  if (networkError.statusCode >= ERROR_STATUS_CODE) {
    logger(
      "Discarding action due to >= 400 status code",
      action,
      networkError.statusCode,
    );

    return true;
  }

  // If the error is permanent or we've reached max retries, discard the request
  return permanent || retries > maxRetryCount;
};
