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
import {
  FetchPolicy,
  MutationUpdaterFn,
  MutationQueryReducersMap,
  ApolloError,
} from "apollo-client";
import { RefetchQueryDescription } from "apollo-client/core/watchQueryOptions";
import { OfflineAction } from "@redux-offline/redux-offline/lib/types";
import { PERSIST_REHYDRATE } from "@redux-offline/redux-offline/lib/constants";
import { NormalizedCacheObject } from "apollo-cache-inmemory";
import { Store as ReduxStore } from "redux";
import { FieldNode } from "graphql";
import { QUEUE_OPERATION } from "../actions/queueOperation";
import { QUEUE_OPERATION_COMMIT } from "../actions/queueOperationCommit";
import { QUEUE_OPERATION_ROLLBACK } from "../actions/queueOperationRollback";
import saveServerId, { SAVE_SERVER_ID } from "../actions/saveServerId";
import ApolloOfflineClient, { OfflineCallback } from "../client";
import { OfflineCache, OfflineSyncMetadataState, METADATA_KEY } from "../cache";
import {
  rootLogger,
  getOperationFieldName,
  replaceUsingMap,
  getIds,
} from "../utils";
import { Discard } from "../store";

const logger = rootLogger.extend("offline-link");

export type DetectNetwork = () => boolean;

type Store = ReduxStore<OfflineCache>;

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
  // TODO: Create a new action
  // SAVE_SNAPSHOT: "SAVE_SNAPSHOT",
  ENQUEUE: QUEUE_OPERATION,
  COMMIT: QUEUE_OPERATION_COMMIT,
  ROLLBACK: QUEUE_OPERATION_ROLLBACK,
  SAVE_SERVER_ID: SAVE_SERVER_ID,
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
    optimisticResponse: originalOptimisticResponse,
    operation: { variables, query: mutation, context },
    update,
    // updateQueries,
    // refetchQueries,
    fetchPolicy,
    observer,
  } = effect;

  await client.hydrated();

  const {
    [METADATA_KEY]: { idsMap },
  } = store.getState();

  const optimisticResponse = replaceUsingMap(
    { ...originalOptimisticResponse },
    idsMap,
  );

  return new Promise((resolve, reject) => {
    if (!client.queryManager) {
      client.initQueryManager();
    }

    const getObservableFromLinkFunction: Function = (client.queryManager as any)
      .getObservableFromLink;

    getObservableFromLinkFunction
      .call(
        client.queryManager,
        mutation,
        {
          apolloOfflineContext: {
            execute,
          },
          ...context,
          optimisticResponse,
        },
        variables,
        false,
      )
      .subscribe({
        next: (data) => {
          boundSaveServerId(store, optimisticResponse, data.data);

          const {
            [METADATA_KEY]: {
              idsMap,
              // snapshot: { cache: cacheSnapshot },
            },
            offline: {
              outbox: [, ...enqueuedMutations],
            },
          } = store.getState();

          // client.cache.restore(cacheSnapshot as T);

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

          const enqueuedActionsFilter = [offlineEffectConfig.enqueueAction];

          enqueuedMutations
            .filter(({ type }) => enqueuedActionsFilter.indexOf(type) > -1)
            .forEach(({ meta: { offline: { effect } } }) => {
              const {
                operation: { variables = {}, query: document = null } = {},
                update,
                optimisticResponse: originalOptimisticResponse,
                fetchPolicy,
              } = effect as EnqueuedMutationEffect<any>;

              if (typeof update !== "function") {
                logger("No update function for mutation", {
                  document,
                  variables,
                });
                return;
              }

              const result = {
                data: replaceUsingMap(
                  { ...originalOptimisticResponse },
                  idsMap,
                ),
              };

              if (fetchPolicy !== "no-cache") {
                logger("Running update function for mutation", {
                  document,
                  variables,
                });

                dataStore.markMutationResult({
                  mutationId: null,
                  result,
                  document,
                  variables,
                  updateQueries: {},
                  update,
                });
              }
            });

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

const boundSaveServerId = (store, optimisticResponse, data) =>
  store.dispatch(saveServerId(optimisticResponse, data));

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

export const offlineEffectConfig = {
  enqueueAction: actions.ENQUEUE,
  effect: offlineEffect,
  discard,
  reducer: (dataIdFromObject) => (state: OfflineSyncMetadataState, action) => {
    const { type, payload } = action;
    switch (type) {
      case PERSIST_REHYDRATE:
        const { [METADATA_KEY]: rehydratedState } = payload;
        return rehydratedState || state;
      default:
        const {
          idsMap: originalIdsMap = {},
          snapshot: originalSnapshot = {},
          ...restState
        } = state || {};

        /// Process the snapshot and ID map for the action
        const snapshot = snapshotReducer(originalSnapshot, action);
        const idsMap = idsMapReducer(
          originalIdsMap,
          { ...action, remainingMutations: snapshot.enqueuedMutations },
          dataIdFromObject,
        );

        return {
          ...restState,
          snapshot,
          idsMap,
        };
    }
  },
};

const snapshotReducer = (state, action) => {
  const enqueuedMutations = enqueuedMutationsReducer(
    state && state.enqueuedMutations,
    action,
  );

  return {
    enqueuedMutations,
  };
};

const enqueuedMutationsReducer = (state = 0, { type }) => {
  switch (type) {
    case actions.ENQUEUE:
      return state + 1;
    case actions.COMMIT:
    case actions.ROLLBACK:
      return state - 1;
    default:
      return state;
  }
};

const idsMapReducer = (state = {}, action, dataIdFromObject) => {
  const { type, payload = {} } = action;
  const { optimisticResponse } = payload;

  switch (type) {
    case actions.ENQUEUE:
      const ids = getIds(dataIdFromObject, optimisticResponse);
      const entries = Object.values(ids).reduce(
        (map: { [key: string]: string }, id: string) => ((map[id] = null), map),
        {},
      );
      return {
        ...state,
        ...entries,
      };
    case actions.COMMIT:
      const { remainingMutations } = action;
      return remainingMutations ? state : {};
    case actions.SAVE_SERVER_ID:
      const { data } = payload;
      const oldIds = getIds(dataIdFromObject, optimisticResponse);
      const newIds = getIds(dataIdFromObject, data);

      return {
        ...state,
        ...mapIds(oldIds, newIds),
      };
    default:
      return state;
  }
};

const intersection = <T>(array1: T[], array2: T[]): T[] =>
  array1.filter((v) => array2.indexOf(v) !== -1);

const intersectingKeys = (object1: object, object2: object) => {
  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);

  return intersection(keys1, keys2);
};

const mapIds = (object1: object, object2: object) =>
  intersectingKeys(object1, object2).reduce(
    (map, key) => ((map[object1[key]] = object2[key]), map),
    {},
  );
