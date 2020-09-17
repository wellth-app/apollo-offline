import { MutationUpdaterFn } from "apollo-client";
import { Store } from "redux";
import { METADATA_KEY } from "../cache/constants";
import { EnqueuedMutationEffect } from "../links/offline";
import { rootLogger, replaceUsingMap } from "../utils";
import { OfflineCacheShape } from "../cache";
import { ApolloOfflineClient, CacheUpdates } from "../client";
import { QUEUE_OPERATION } from "../actions/queueOperation";

const logger = rootLogger.extend("persistence-loaded-effect");

// Processes all enqueued mutations into the cache as optimistic responses.
export const persistenceLoadedEffect = (
  store: Store<OfflineCacheShape>,
  client: ApolloOfflineClient,
  mutationCacheUpdates: CacheUpdates,
): void => {
  const {
    offline: { outbox: enqueuedMutations },
    [METADATA_KEY]: { idsMap },
  } = store.getState();

  if (!client.queryManager) {
    client.initQueryManager();
  }

  const { queryManager } = client;

  enqueuedMutations
    .filter(({ type }) => [QUEUE_OPERATION].indexOf(type) > -1)
    .forEach(
      ({
        meta: {
          offline: { effect },
        },
      }) => {
        const {
          operation: {
            variables,
            query: document = null,
            context,
            operationName,
          },
          optimisticResponse: originalOptimisticResponse,
          update,
          fetchPolicy,
          attemptId,
        } = effect as EnqueuedMutationEffect<any>;

        // Look up the mutation update function in `mutationCacheUpdates`
        // and mark the mutation as initialized to trigger updates
        // with optimistic responses
        let mutationUpdate: MutationUpdaterFn | undefined = update;
        if (!mutationUpdate && mutationCacheUpdates[operationName]) {
          const contextUpdate = mutationCacheUpdates[operationName];
          mutationUpdate = contextUpdate(context);
        }

        if (fetchPolicy === "no-cache") {
          return;
        }

        logger("Initializing cache with queued mutation", {
          operationName,
          document,
          variables,
        });

        const optimisticResponse = replaceUsingMap(
          { ...originalOptimisticResponse },
          idsMap,
        );

        const result = { data: optimisticResponse };

        queryManager.dataStore.markMutationResult({
          mutationId: attemptId,
          result,
          document,
          variables,
          updateQueries: {},
          update: mutationUpdate,
        });
      },
    );

  queryManager.broadcastQueries();
};

export default persistenceLoadedEffect;
