import { MutationUpdaterFn } from "apollo-client";
import { Store } from "redux";
import { EnqueuedMutationEffect } from "../links/offline";
import { rootLogger } from "../utils";
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
  } = store.getState();

  if (!client.queryManager) {
    client.initQueryManager();
  }

  const { queryManager } = client;
  const { mutationStore } = queryManager;

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
          optimisticResponse,
          update,
          fetchPolicy,
          attemptId,
        } = effect as EnqueuedMutationEffect<any>;

        if (fetchPolicy === "no-cache") {
          return;
        }

        logger("Initializing cache with queued mutation", {
          operationName,
          document,
          variables,
        });

        // Look up the mutation update function in `mutationCacheUpdates`
        // and mark the mutation as initialized to trigger updates
        // with optimistic responses
        let mutationUpdate: MutationUpdaterFn | undefined = update;
        if (!mutationUpdate && mutationCacheUpdates[operationName]) {
          const contextUpdate = mutationCacheUpdates[operationName];
          mutationUpdate = contextUpdate(context);
        }

        mutationStore.initMutation(attemptId, document, variables);
        queryManager.dataStore.markMutationInit({
          mutationId: attemptId,
          document,
          variables,
          updateQueries: {},
          update: mutationUpdate,
          optimisticResponse,
        });
      },
    );

  queryManager.broadcastQueries();
};

export default persistenceLoadedEffect;
