import {
  execute as _execute,
  ApolloLink,
  Operation,
  NextLink,
  Observable,
  GraphQLRequest,
  ExecutionResult,
  FetchResult,
} from "apollo-link";
import {
  getOperationDefinition,
  getMutationDefinition,
  resultKeyNameFromField,
  tryFunctionOrLogError,
} from "apollo-utilities";
import { NormalizedCacheObject } from "apollo-cache-inmemory";
import { Store as ReduxStore } from "redux";
import { FieldNode } from "graphql";
import { QUEUE_OPERATION } from "../actions/queueOperation";
import { QUEUE_OPERATION_COMMIT } from "../actions/queueOperationCommit";
import { QUEUE_OPERATION_ROLLBACK } from "../actions/queueOperationRollback";
import ApolloOfflineClient, { OfflineCallback } from "../client";
import { rootLogger, getOperationFieldName } from "../utils";
import { Discard } from "../store";
import {
  FetchPolicy,
  MutationUpdaterFn,
  MutationQueryReducersMap,
  ApolloError,
} from "apollo-client";
import { RefetchQueryDescription } from "apollo-client/core/watchQueryOptions";
import { OfflineAction } from "@redux-offline/redux-offline/lib/types";
import { State as AppState } from "src/reducers";

const logger = rootLogger.extend("offline-link");

export type DetectNetwork = () => boolean;

type Store = ReduxStore<AppState>;

export interface Options {
  store: Store;
}

const IS_OPTIMISTIC_KEY =
  typeof Symbol !== "undefined" ? Symbol("isOptimistic") : "@@isOptimistic";
const OPERATION_TYPE_MUTATION = "mutation";
const OPERATION_TYPE_QUERY = "query";
const ERROR_STATUS_CODE = 400;

export const isOptimistic = (obj) =>
  typeof obj[IS_OPTIMISTIC_KEY] !== undefined
    ? obj[IS_OPTIMISTIC_KEY]
    : undefined;

const actions = {
  ENQUEUE: QUEUE_OPERATION,
  COMMIT: QUEUE_OPERATION_COMMIT,
  ROLLBACK: QUEUE_OPERATION_ROLLBACK,
};

// !!!: This is to remove the context that is added by the queryManager before a request.
// !!!: Because the request is processed by the queryManager before it gets to the `OfflineLink`,
//      context needs to be trimmed to protect against runaway storage but preserve functionality
//      for links dependent upon context between `OfflineLink` and network execution.
const APOLLO_PRIVATE_CONTEXT_KEYS = ["cache", "getCacheKey", "clientAwareness"];

export default class OfflineLink extends ApolloLink {
  private store: Store;

  constructor(store: Store) {
    super();
    this.store = store;
  }

  request(operation: Operation, forward: NextLink) {
    const { requireOnline = false } = operation.getContext();
    if (requireOnline) {
      return forward(operation);
    }

    return new Observable((observer) => {
      // Get the network connection state from the store
      const {
        offline: { online },
      } = this.store.getState();

      const { operation: operationType } = getOperationDefinition(
        operation.query,
      );

      const isMutation = operationType === OPERATION_TYPE_MUTATION;
      const isQuery = operationType === OPERATION_TYPE_QUERY;

      if (!online && isQuery) {
        const data = processOfflineQuery(operation);
        observer.next({ data });
        observer.complete();
        return () => null;
      }

      if (isMutation) {
        const {
          apolloOfflineContext: { execute = false } = {},
        } = operation.getContext();

        if (!execute) {
          const data = enqueueMutation(operation, this.store, observer);

          if (!online) {
            observer.next({ data, [IS_OPTIMISTIC_KEY]: true });
            observer.complete();
          }

          return () => null;
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

export type EnqueuedMutationEffect<T> = {
  optimisticResponse: object;
  operation: GraphQLRequest;
  update: MutationUpdaterFn<T>;
  updateQueries: MutationQueryReducersMap<T>;
  refetchQueries:
    | ((result: ExecutionResult) => RefetchQueryDescription)
    | RefetchQueryDescription;
  observer: ZenObservable.SubscriptionObserver<T>;
  fetchPolicy?: FetchPolicy;
};

const enqueueMutation = <T>(
  operation: Operation,
  store: Store,
  observer: ZenObservable.SubscriptionObserver<T>,
) => {
  const { query: mutation, variables } = operation;
  const {
    apolloOfflineContext: {
      optimisticResponse: originalOptimisticResponse,
      update,
      updateQueries,
      refetchQueries,
      fetchPolicy,
    },
    ...operationContext
  } = operation.getContext();

  const optimisticResponse =
    typeof originalOptimisticResponse === "function"
      ? originalOptimisticResponse(variables)
      : originalOptimisticResponse;

  setImmediate(() => {
    const effect: EnqueuedMutationEffect<any> = {
      operation: {
        ...operation,
        // Ensure things like `cache`, `getCacheKey`, and `clientAwareness` (keys added by apollo-client)
        // are not included in the persisted context.
        context: Object.keys(operationContext)
          .filter((key) => APOLLO_PRIVATE_CONTEXT_KEYS.indexOf(key) < 0)
          .reduce(
            (newObj, key) =>
              Object.assign(newObj, { [key]: operationContext[key] }),
            {},
          ),
      },
      optimisticResponse,
      update,
      updateQueries,
      refetchQueries,
      fetchPolicy,
      observer,
    };

    store.dispatch({
      type: actions.ENQUEUE,
      payload: { optimisticResponse },
      meta: {
        offline: {
          effect,
          commit: { type: actions.COMMIT, meta: null },
          rollback: { type: actions.ROLLBACK, meta: null },
        },
      },
    });
  });

  // If we have an optimistic response, return it.
  if (optimisticResponse) {
    return optimisticResponse;
  }

  // Accumulate a `null` object based on the mutation definition.
  const mutationDefinition = getMutationDefinition(mutation);
  return mutationDefinition.selectionSet.selections.reduce(
    (response: any, elem: FieldNode) => {
      response[resultKeyNameFromField(elem)] = null;
      return response;
    },
    {},
  );
};

export const offlineEffect = async <T extends NormalizedCacheObject>(
  store: Store,
  client: ApolloOfflineClient<T>,
  effect: EnqueuedMutationEffect<any>,
  action: OfflineAction,
  callback: OfflineCallback,
): Promise<FetchResult<Record<string, any>, Record<string, any>>> => {
  const execute = true;
  const {
    optimisticResponse,
    operation: { variables, query: mutation, context },
    update,
    // updateQueries,
    // refetchQueries,
    fetchPolicy,
    observer,
  } = effect;

  await client.hydrated();

  return new Promise((resolve, reject) => {
    if (!client.queryManager) {
      client.initQueryManager();
    }

    // !!!: Probably not super legit but AWS does it so we must be ok
    const buildOperationForLink: Function = (client.queryManager as any)
      .buildOperationForLink;
    const extraContext = {
      apolloOfflineContext: {
        execute,
      },
      ...context,
      optimisticResponse,
    };

    // Reconstruct the context of the operation
    const operation = buildOperationForLink.call(
      client.queryManager,
      mutation,
      variables,
      extraContext,
    );

    logger("Executing link", operation);
    _execute(client.link, operation).subscribe({
      next: (data) => {
        const dataStore = client.queryManager.dataStore;

        if (fetchPolicy !== "no-cache") {
          dataStore.markMutationResult({
            mutationId: null,
            result: data,
            document: mutation,
            variables,
            updateQueries: {}, // TODO: populate this?
            update,
          });
        }

        // TODO: Update existing operations in the cache with the new IDs from the recieved request

        client.queryManager.broadcastQueries();
        resolve({ data });

        if (observer.next && !observer.closed) {
          observer.next({ ...data, [IS_OPTIMISTIC_KEY]: false });
          observer.complete();
        }

        if (typeof callback === "function") {
          const mutationName = getOperationFieldName(mutation);
          const {
            additionalDataContext: { newVars = operation.variables } = {},
            ...restContext
          } = data.context || {};

          if (!Object.keys(restContext || {}).length) {
            delete data.context;
          } else {
            data.context = restContext;
          }

          tryFunctionOrLogError(() => {
            const errors = data.errors
              ? {
                  mutation: mutationName,
                  variables: newVars,
                  error: new ApolloError({
                    graphQLErrors: [...data.errors],
                  }),
                  notified: !!observer.next,
                }
              : null;
            const success =
              errors === null
                ? {
                    mutation: mutationName,
                    variables: newVars,
                    ...data,
                    notified: !!observer.next,
                  }
                : null;
            callback(errors, success);
          });
        }
      },
      error: (error) => {
        logger("Error executing link:", error);
        reject(error);
      },
    });
  });
};

export const discard = (
  discardCondition: Discard,
  callback: OfflineCallback,
) => (error: any, action: OfflineAction, retries: number) => {
  const discardResult = shouldDiscard(error, action, retries, discardCondition);

  if (discardResult) {
    if (typeof callback === "function") {
      tryFunctionOrLogError(() => {
        callback({ error }, null);
      });
    }
  }

  return discardResult;
};

const shouldDiscard = (
  error: any,
  action: OfflineAction,
  retries: number,
  discardCondition: Discard,
) => {
  const { graphQLErrors = [], networkError, permanent } = error;
  // If there are GraphQL errors, discard the request
  if (graphQLErrors.length) {
    logger("Discarding action due to GraphQL errors", action, graphQLErrors);
    return true;
  }

  // If the network error status code >= 400, discard the request
  if (networkError && networkError.statusCode >= ERROR_STATUS_CODE) {
    logger("Discarding action due to >= 400 status code", action, networkError);
    return true;
  }

  // If the error is permanent or the consumer says so, discard the request
  return permanent || discardCondition(error, action, retries);
};
