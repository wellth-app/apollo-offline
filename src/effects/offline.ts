/* eslint-disable no-shadow */
import { Store } from "redux";
import { MutationUpdaterFn, ApolloError } from "apollo-client";
import { Observable, FetchResult } from "apollo-link";
import { tryFunctionOrLogError } from "apollo-utilities";
import { OfflineAction } from "@redux-offline/redux-offline/lib/types";
import { NormalizedCacheObject } from "apollo-cache-inmemory";
import {
  EnqueuedMutationEffect,
  boundSaveSnapshot,
  CacheUpdates,
} from "../links/offline";
import { METADATA_KEY } from "../cache/constants";
import { OfflineCacheShape } from "../cache";
import {
  replaceUsingMap,
  getOperationFieldName,
  IS_OPTIMISTIC_KEY,
  rootLogger,
} from "../utils";
import { QUEUE_OPERATION } from "../actions/queueOperation";
import saveServerId from "../actions/saveServerId";
import { ApolloOfflineClient, OfflineCallback } from "../client";

const logger = rootLogger.extend("offline-effect");

type ResultRecord = Record<string, any>;

const boundSaveServerId = (
  store: Store<OfflineCacheShape>,
  optimisticResponse,
  data,
): ReturnType<typeof saveServerId> =>
  store.dispatch(saveServerId(optimisticResponse, data));

export const offlineEffect = async (
  store: Store<OfflineCacheShape>,
  client: ApolloOfflineClient,
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
    attemptId,
    observer,
  } = effect;

  await client.hydrated();

  if (!client.queryManager) {
    client.initQueryManager();
  }

  const { queryManager } = client;
  const { dataStore } = client.queryManager;

  const {
    [METADATA_KEY]: { idsMap },
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

  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const getObservableFromLinkFunction = (queryManager as any)
      .getObservableFromLink;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const observable: Observable<FetchResult<
      NormalizedCacheObject
    >> = getObservableFromLinkFunction.call(
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
            idsMap: newIdsMap,
            snapshot: { cache: cacheSnapshot },
          },
          offline: {
            outbox: [, ...enqueuedMutations],
          },
        } = store.getState();

        client.cache.restore(cacheSnapshot);

        if (fetchPolicy !== "no-cache") {
          dataStore.markMutationResult({
            mutationId: attemptId,
            result: data,
            document: mutation,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            variables,
            updateQueries: {}, // TODO: populate this?
            update: mutationUpdate,
          });
        }

        boundSaveSnapshot(store, client.cache);

        enqueuedMutations
          .filter(
            ({ type }) =>
              // eslint-disable-next-line no-use-before-define
              [QUEUE_OPERATION].indexOf(type) > -1,
          )
          .forEach(
            ({
              meta: {
                offline: { effect },
              },
            }) => {
              const {
                operation: {
                  variables = {},
                  query: document = null,
                  operationName = null,
                } = {},
                update,
                optimisticResponse: originalOptimisticResponse,
                fetchPolicy,
                attemptId: enqueuedAttemptId,
              } = effect as EnqueuedMutationEffect<any>;

              let enqueuedMutationUpdate:
                | MutationUpdaterFn
                | undefined = update;
              if (
                !enqueuedMutationUpdate &&
                mutationCacheUpdates[operationName]
              ) {
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

              const enqueuedOptimisticResponse = replaceUsingMap(
                { ...originalOptimisticResponse },
                newIdsMap,
              );

              const result = { data: enqueuedOptimisticResponse };

              if (fetchPolicy !== "no-cache") {
                logger("Running update function for mutation", {
                  operationName,
                  document,
                  variables,
                });

                client.queryManager.dataStore.markMutationResult({
                  mutationId: enqueuedAttemptId,
                  result,
                  document,
                  variables,
                  updateQueries: {},
                  update: enqueuedMutationUpdate,
                });
              }
            },
          );

        // Broadcast queries notifies observers that there have been updates to data
        queryManager.broadcastQueries();

        // Resolve the promise with the query data
        resolve({ data });

        // If there's an observer, notify the it with the response
        if (observer.next && !observer.closed) {
          observer.next({ ...data, [IS_OPTIMISTIC_KEY]: false });
          observer.complete();
        }

        // Notify the offline callback (if any) of the completion of the request.
        if (typeof callback === "function") {
          const mutationName = getOperationFieldName(mutation);
          const {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            additionalDataContext: { newVars = variables } = {},
            ...restContext
          } = data.context || {};

          if (!Object.keys(restContext || {}).length) {
            // eslint-disable-next-line no-param-reassign
            delete data.context;
          } else {
            // eslint-disable-next-line no-param-reassign
            data.context = restContext;
          }

          tryFunctionOrLogError(() => {
            const errors = data.errors
              ? {
                  mutation: mutationName,
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
        // TODO: Mark the mutation for attempt id as failed
        queryManager.broadcastQueries();
        logger("Error executing link:", error);
        reject(error);
      },
      // TODO: Add a completed handler to mark the mutation as finished
    });
  });
};

export default offlineEffect;
