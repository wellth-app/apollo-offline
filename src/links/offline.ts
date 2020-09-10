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
import {
  NormalizedCacheObject,
  defaultNormalizedCacheFactory,
  StoreReader,
} from "apollo-cache-inmemory";
import { Store as ReduxStore } from "redux";
import { FieldNode } from "graphql";
import { QUEUE_OPERATION } from "../actions/queueOperation";
import { QUEUE_OPERATION_COMMIT } from "../actions/queueOperationCommit";
import { QUEUE_OPERATION_ROLLBACK } from "../actions/queueOperationRollback";
import saveServerId, { SAVE_SERVER_ID } from "../actions/saveServerId";
import saveSnapshot, { SAVE_SNAPSHOT } from "../actions/saveSnapshot";
import offlineEffectReducer from "../reducers/offlineEffect";
import ApolloOfflineClient, { OfflineCallback } from "../client";
import { OfflineCache, METADATA_KEY, NORMALIZED_CACHE_KEY } from "../cache";
import { rootLogger, getOperationFieldName, replaceUsingMap } from "../utils";
import { Discard } from "../store";

const logger = rootLogger.extend("offline-link");

export type DetectNetwork = () => boolean;

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
  SAVE_SNAPSHOT: SAVE_SNAPSHOT,
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

export interface CacheUpdates {
  [key: string]: (context: any) => MutationUpdaterFn;
}

type Store = ReduxStore<OfflineCache>;

export interface OfflineLinkOptions {
  store: Store;
}

export default class OfflineLink extends ApolloLink {
  private store: Store;

  constructor({ store }: OfflineLinkOptions) {
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
        const data = processOfflineQuery(operation, this.store);
        observer.next({ data });
        observer.complete();
        return () => null;
      }

      if (isMutation) {
        const {
          apolloOfflineContext: { execute = false } = {},
          cache,
        } = operation.getContext();

        if (!execute) {
          const {
            [METADATA_KEY]: {
              snapshot: { enqueuedMutations },
            },
          } = this.store.getState();

          if (enqueuedMutations === 0) {
            boundSaveSnapshot(this.store, cache);
          }

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

const boundSaveServerId = (store, optimisticResponse, data) =>
  store.dispatch(saveServerId(optimisticResponse, data));

export const boundSaveSnapshot = (store, cache) =>
  store.dispatch(saveSnapshot(cache));

const processOfflineQuery = (
  { query, variables, getContext }: Operation,
  store: ReduxStore<OfflineCache>,
) => {
  const { [NORMALIZED_CACHE_KEY]: normalizedCache = {} } = store.getState();
  const { cache } = getContext();

  const offlineStore = defaultNormalizedCacheFactory(normalizedCache);

  try {
    const storeReader = cache.storeReader as StoreReader;
    const queryData = storeReader.readQueryFromStore({
      store: offlineStore,
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

type ResultRecord = Record<string, any>;

export const offlineEffect = async <T extends NormalizedCacheObject>(
  store: Store,
  client: ApolloOfflineClient<T>,
  effect: EnqueuedMutationEffect<any>,
  action: OfflineAction,
  callback: OfflineCallback,
  mutationCacheUpdates: CacheUpdates,
): Promise<FetchResult<ResultRecord, ResultRecord>> => {
  const execute = true;
  const {
    optimisticResponse: originalOptimisticResponse,
    operation: {
      variables: originalVariables,
      query: mutation,
      context,
      operationName,
    },
    update,
    fetchPolicy,
    observer,
  } = effect;

  await client.hydrated();

  if (!client.queryManager) {
    client.initQueryManager();
  }

  const queryManager = client.queryManager;
  const dataStore = client.queryManager.dataStore;

  const {
    [METADATA_KEY]: { idsMap },
    offline: {
      outbox: [, ...enqueuedMutations],
    },
  } = store.getState();

  const variables = {
    ...replaceUsingMap({ ...originalVariables }, idsMap),
    // TODO: Add a skip retry?
  };

  const optimisticResponse = replaceUsingMap(
    { ...originalOptimisticResponse },
    idsMap,
  );

  // Look up the mutation update function in `mutationCacheUpdates`
  // and mark the mutation as initialized to trigger updates
  // with optimistic responses
  let mutationUpdate: MutationUpdaterFn | undefined = update;
  if (!mutationUpdate && mutationCacheUpdates[operationName]) {
    const contextUpdate = mutationCacheUpdates[operationName];
    mutationUpdate = contextUpdate(context);
  }

  const mutationId = queryManager.generateQueryId();

  // Track the mutation in the query manager
  const setQueryFunction: Function = (queryManager as any).setQuery;
  setQueryFunction.call(queryManager, mutationId, () => ({
    document: mutation,
  }));

  queryManager.mutationStore.initMutation(mutationId, mutation, variables);

  dataStore.markMutationInit({
    mutationId: mutationId,
    document: mutation,
    variables,
    updateQueries: {},
    update: mutationUpdate,
    optimisticResponse,
  });

  updateCacheWithEnqueuedMutationUpdates(
    enqueuedMutations,
    context,
    idsMap,
    mutationCacheUpdates,
    client,
  );

  // Broadcast queries notifies observers that there have been updates to data
  queryManager.broadcastQueries();

  return new Promise((resolve, reject) => {
    // Get the observable for executing the mutation on the link
    // chain
    const getObservableFromLinkFunction: Function = (queryManager as any)
      .getObservableFromLink;
    const observable: Observable<
      FetchResult<T>
    > = getObservableFromLinkFunction.call(
      queryManager,
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
    );

    // Subscribe to the observable and update the data store as appropriate
    observable.subscribe({
      next: (data) => {
        boundSaveServerId(store, optimisticResponse, data.data);

        const {
          [METADATA_KEY]: {
            idsMap,
            snapshot: { cache: cacheSnapshot },
          },
        } = store.getState();

        client.cache.restore(cacheSnapshot as T);

        queryManager.mutationStore.markMutationResult(mutationId);

        if (fetchPolicy !== "no-cache") {
          dataStore.markMutationResult({
            mutationId,
            result: data,
            document: mutation,
            variables,
            updateQueries: {}, // TODO: populate this?
            update: mutationUpdate,
          });
        }

        boundSaveSnapshot(store, client.cache);

        updateCacheWithEnqueuedMutationUpdates(
          enqueuedMutations,
          context,
          idsMap,
          mutationCacheUpdates,
          client,
        );

        // Broadcast queries notifies observers that there have been updates to data
        queryManager.broadcastQueries();

        // Resolve the promise with the query data
        resolve({ data });

        // If there's an observer, notify the observer that the response
        // is complete
        if (observer.next && !observer.closed) {
          observer.next({ ...data, [IS_OPTIMISTIC_KEY]: false });
          observer.complete();
        }

        // Notify the offline callback (if any) of the completion of the request.
        if (typeof callback === "function") {
          const mutationName = getOperationFieldName(mutation);
          const {
            additionalDataContext: { newVars = variables } = {},
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
        queryManager.mutationStore.markMutationError(mutationId, error);
        dataStore.markMutationComplete({ mutationId, optimisticResponse });
        queryManager.broadcastQueries();

        setQueryFunction.call(queryManager, mutationId, () => ({
          document: null,
        }));

        logger("Error executing link:", error);
        reject(error);
      },
      complete: () => {
        dataStore.markMutationComplete({ mutationId, optimisticResponse });
        queryManager.broadcastQueries();
      },
    });
  });
};

// Iterate through enqueued mutations and execute their update functions
// with their optimistic response updated for the executed query.
// We don't do the same "tracking" in the data/mutation store as above
// because these are just optimistic responses, and will get their own
// tracking when executed via the queue.
const updateCacheWithEnqueuedMutationUpdates = (
  enqueuedMutations,
  context: any,
  idsMap,
  mutationCacheUpdates: CacheUpdates,
  client: ApolloOfflineClient<any>,
) => {
  enqueuedMutations
    .filter(({ type }) => enqueuedActionsFilter.indexOf(type) > -1)
    .forEach(({ meta: { offline: { effect } } }) => {
      const {
        operation: {
          variables = {},
          query: document = null,
          operationName = null,
        } = {},
        update,
        optimisticResponse: originalOptimisticResponse,
        fetchPolicy,
      } = effect as EnqueuedMutationEffect<any>;

      let enqueuedMutationUpdate: MutationUpdaterFn | undefined = update;
      if (!enqueuedMutationUpdate && mutationCacheUpdates[operationName]) {
        const contextUpdate = mutationCacheUpdates[operationName];
        enqueuedMutationUpdate = contextUpdate(context);
      }

      if (typeof enqueuedMutationUpdate !== "function") {
        logger("No update function for mutation", {
          document,
          variables,
        });
        return;
      }

      const result = {
        data: replaceUsingMap({ ...originalOptimisticResponse }, idsMap),
      };

      if (fetchPolicy !== "no-cache") {
        logger("Running update function for mutation", {
          document,
          variables,
          operationName,
        });

        client.queryManager.dataStore.markMutationResult({
          mutationId: null,
          result,
          document,
          variables,
          updateQueries: {},
          update: enqueuedMutationUpdate,
        });
      }
    });
};

export const discard = (
  discardCondition: Discard,
  callback: OfflineCallback,
) => (error: any, action: OfflineAction, retries: number) => {
  const discardResult = shouldDiscard(error, action, retries, discardCondition);

  if (discardResult) {
    // Call observer
    // const {
    //   meta: {
    //     offline: {
    //       effect: { observer },
    //     },
    //   },
    // } = action;

    // if (observer && !observer.closed) {
    //   observer.error(error);
    // }

    // Call global error callback
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
  reducer: offlineEffectReducer,
};

const enqueuedActionsFilter = [offlineEffectConfig.enqueueAction];
