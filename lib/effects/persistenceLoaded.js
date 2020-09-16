"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistenceLoadedEffect = void 0;
const utils_1 = require("../utils");
const queueOperation_1 = require("../actions/queueOperation");
const logger = utils_1.rootLogger.extend("persistence-loaded-effect");
exports.persistenceLoadedEffect = (store, client, mutationCacheUpdates) => {
    const { offline: { outbox: enqueuedMutations }, } = store.getState();
    if (!client.queryManager) {
        client.initQueryManager();
    }
    const { queryManager } = client;
    const { mutationStore } = queryManager;
    enqueuedMutations
        .filter(({ type }) => [queueOperation_1.QUEUE_OPERATION].indexOf(type) > -1)
        .forEach(({ meta: { offline: { effect }, }, }) => {
        const { operation: { variables, query: document = null, context, operationName, }, optimisticResponse, update, fetchPolicy, attemptId, } = effect;
        if (fetchPolicy === "no-cache") {
            return;
        }
        logger("Initializing cache with queued mutation", {
            operationName,
            document,
            variables,
        });
        let mutationUpdate = update;
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
    });
    queryManager.broadcastQueries();
};
exports.default = exports.persistenceLoadedEffect;
//# sourceMappingURL=persistenceLoaded.js.map