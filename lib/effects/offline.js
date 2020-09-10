"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("cache/constants");
const apollo_client_1 = require("apollo-client");
const apollo_utilities_1 = require("apollo-client/node_modules/apollo-link/node_modules/apollo-utilities");
const offline_1 = require("links/offline");
const utils_1 = require("utils");
const queueOperation_1 = require("../actions/queueOperation");
const saveServerId_1 = require("../actions/saveServerId");
const utils_2 = require("../utils");
const logger = utils_2.rootLogger.extend("offline-effect");
const boundSaveServerId = (store, optimisticResponse, data) => store.dispatch(saveServerId_1.default(optimisticResponse, data));
exports.offlineEffect = (store, client, effect, action, callback, mutationCacheUpdates) => __awaiter(this, void 0, void 0, function* () {
    const execute = true;
    const { optimisticResponse: originalOptimisticResponse, operation: { variables: originalVariables, query: mutation, context, operationName, }, update, fetchPolicy, observer, } = effect;
    yield client.hydrated();
    if (!client.queryManager) {
        client.initQueryManager();
    }
    const { queryManager } = client;
    const { dataStore, mutationStore } = client.queryManager;
    console.log(mutationStore.getStore());
    const { [constants_1.METADATA_KEY]: { idsMap }, offline: { outbox: enqueuedMutations }, } = store.getState();
    const variables = Object.assign({}, utils_1.replaceUsingMap(Object.assign({}, originalVariables), idsMap));
    const optimisticResponse = utils_1.replaceUsingMap(Object.assign({}, originalOptimisticResponse), idsMap);
    let mutationUpdate = update;
    if (!mutationUpdate && mutationCacheUpdates[operationName]) {
        const contextUpdate = mutationCacheUpdates[operationName];
        mutationUpdate = contextUpdate(context);
    }
    return new Promise((resolve, reject) => {
        const getObservableFromLinkFunction = queryManager
            .getObservableFromLink;
        const observable = getObservableFromLinkFunction.call(queryManager, mutation, Object.assign({ apolloOfflineContext: {
                execute,
            } }, context, { optimisticResponse }), variables, false);
        observable.subscribe({
            next: (data) => {
                boundSaveServerId(store, optimisticResponse, data.data);
                const { [constants_1.METADATA_KEY]: { idsMap: newIdsMap, snapshot: { cache: cacheSnapshot }, }, } = store.getState();
                client.cache.restore(cacheSnapshot);
                if (fetchPolicy !== "no-cache") {
                    dataStore.markMutationResult({
                        mutationId: null,
                        result: data,
                        document: mutation,
                        variables,
                        updateQueries: {},
                        update: mutationUpdate,
                    });
                }
                offline_1.boundSaveSnapshot(store, client.cache);
                enqueuedMutations
                    .filter(({ type }) => [queueOperation_1.QUEUE_OPERATION].indexOf(type) > -1)
                    .forEach(({ meta: { offline: { effect }, }, }) => {
                    const { operation: { variables = {}, query: document = null, operationName = null, } = {}, update, optimisticResponse: originalOptimisticResponse, fetchPolicy, } = effect;
                    let enqueuedMutationUpdate = update;
                    if (!enqueuedMutationUpdate &&
                        mutationCacheUpdates[operationName]) {
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
                        data: utils_1.replaceUsingMap(Object.assign({}, originalOptimisticResponse), newIdsMap),
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
                queryManager.broadcastQueries();
                resolve({ data });
                if (observer.next && !observer.closed) {
                    observer.next(Object.assign({}, data, { [utils_1.IS_OPTIMISTIC_KEY]: false }));
                    observer.complete();
                }
                if (typeof callback === "function") {
                    const mutationName = utils_1.getOperationFieldName(mutation);
                    const _a = data.context || {}, { additionalDataContext: { newVars = variables } = {} } = _a, restContext = __rest(_a, ["additionalDataContext"]);
                    if (!Object.keys(restContext || {}).length) {
                        delete data.context;
                    }
                    else {
                        data.context = restContext;
                    }
                    apollo_utilities_1.tryFunctionOrLogError(() => {
                        const errors = data.errors
                            ? {
                                mutation: mutationName,
                                variables: newVars,
                                error: new apollo_client_1.ApolloError({
                                    graphQLErrors: [...data.errors],
                                }),
                                notified: !!observer.next,
                            }
                            : null;
                        const success = errors === null
                            ? Object.assign({ mutation: mutationName, variables: newVars }, data, { notified: !!observer.next }) : null;
                        callback(errors, success);
                    });
                }
            },
            error: (error) => {
                queryManager.broadcastQueries();
                logger("Error executing link:", error);
                reject(error);
            },
        });
    });
});
exports.default = exports.offlineEffect;
//# sourceMappingURL=offline.js.map