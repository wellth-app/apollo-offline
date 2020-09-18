"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistenceLoadedEffect = void 0;
const constants_1 = require("../cache/constants");
const utils_1 = require("../utils");
const queueOperation_1 = require("../actions/queueOperation");
const logger = utils_1.rootLogger.extend("persistence-loaded-effect");
exports.persistenceLoadedEffect = (store, client, mutationCacheUpdates) => {
    const { offline: { outbox: enqueuedMutations }, [constants_1.METADATA_KEY]: { idsMap }, } = store.getState();
    if (!client.queryManager) {
        client.initQueryManager();
    }
    const { queryManager } = client;
    enqueuedMutations
        .filter(({ type }) => [queueOperation_1.QUEUE_OPERATION].indexOf(type) > -1)
        .forEach(({ meta: { offline: { effect }, }, }) => {
        const { operation: { variables, query: document = null, context, operationName, }, optimisticResponse: originalOptimisticResponse, update, fetchPolicy, attemptId, } = effect;
        let mutationUpdate = update;
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
        const optimisticResponse = utils_1.replaceUsingMap(Object.assign({}, originalOptimisticResponse), idsMap);
        const result = { data: optimisticResponse };
        queryManager.dataStore.markMutationResult({
            mutationId: attemptId,
            result,
            document,
            variables,
            updateQueries: {},
            update: mutationUpdate,
        });
    });
    queryManager.broadcastQueries();
};
exports.default = exports.persistenceLoadedEffect;
//# sourceMappingURL=persistenceLoaded.js.map