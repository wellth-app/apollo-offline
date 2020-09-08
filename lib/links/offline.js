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
const apollo_link_1 = require("apollo-link");
const apollo_utilities_1 = require("apollo-utilities");
const apollo_client_1 = require("apollo-client");
const constants_1 = require("@redux-offline/redux-offline/lib/constants");
const queueOperation_1 = require("../actions/queueOperation");
const queueOperationCommit_1 = require("../actions/queueOperationCommit");
const queueOperationRollback_1 = require("../actions/queueOperationRollback");
const saveServerId_1 = require("../actions/saveServerId");
const cache_1 = require("../cache");
const utils_1 = require("../utils");
const logger = utils_1.rootLogger.extend("offline-link");
const IS_OPTIMISTIC_KEY = typeof Symbol !== "undefined" ? Symbol("isOptimistic") : "@@isOptimistic";
const OPERATION_TYPE_MUTATION = "mutation";
const OPERATION_TYPE_QUERY = "query";
const ERROR_STATUS_CODE = 400;
exports.isOptimistic = (obj) => typeof obj[IS_OPTIMISTIC_KEY] !== undefined
    ? obj[IS_OPTIMISTIC_KEY]
    : undefined;
const actions = {
    ENQUEUE: queueOperation_1.QUEUE_OPERATION,
    COMMIT: queueOperationCommit_1.QUEUE_OPERATION_COMMIT,
    ROLLBACK: queueOperationRollback_1.QUEUE_OPERATION_ROLLBACK,
    SAVE_SERVER_ID: saveServerId_1.SAVE_SERVER_ID,
};
const APOLLO_PRIVATE_CONTEXT_KEYS = ["cache", "getCacheKey", "clientAwareness"];
class OfflineLink extends apollo_link_1.ApolloLink {
    constructor({ store }) {
        super();
        this.store = store;
    }
    request(operation, forward) {
        const { requireOnline = false } = operation.getContext();
        if (requireOnline) {
            return forward(operation);
        }
        return new apollo_link_1.Observable((observer) => {
            const { offline: { online }, } = this.store.getState();
            const { operation: operationType } = apollo_utilities_1.getOperationDefinition(operation.query);
            const isMutation = operationType === OPERATION_TYPE_MUTATION;
            const isQuery = operationType === OPERATION_TYPE_QUERY;
            if (!online && isQuery) {
                const data = processOfflineQuery(operation);
                observer.next({ data });
                observer.complete();
                return () => null;
            }
            if (isMutation) {
                const { apolloOfflineContext: { execute = false } = {}, } = operation.getContext();
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
                if (handle)
                    handle.unsubscribe();
            };
        });
    }
}
exports.default = OfflineLink;
const processOfflineQuery = ({ query, variables, getContext }) => {
    const { cache } = getContext();
    try {
        const queryData = cache.readQuery({
            query,
            variables,
        });
        return queryData;
    }
    catch (error) {
        return null;
    }
};
const enqueueMutation = (operation, store, observer) => {
    const { query: mutation, variables } = operation;
    const _a = operation.getContext(), { apolloOfflineContext: { optimisticResponse: originalOptimisticResponse, update, updateQueries, refetchQueries, fetchPolicy, } } = _a, operationContext = __rest(_a, ["apolloOfflineContext"]);
    const optimisticResponse = typeof originalOptimisticResponse === "function"
        ? originalOptimisticResponse(variables)
        : originalOptimisticResponse;
    setImmediate(() => {
        const effect = {
            operation: Object.assign({}, operation, { context: Object.keys(operationContext)
                    .filter((key) => APOLLO_PRIVATE_CONTEXT_KEYS.indexOf(key) < 0)
                    .reduce((newObj, key) => Object.assign(newObj, { [key]: operationContext[key] }), {}) }),
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
    if (optimisticResponse) {
        return optimisticResponse;
    }
    const mutationDefinition = apollo_utilities_1.getMutationDefinition(mutation);
    return mutationDefinition.selectionSet.selections.reduce((response, elem) => {
        response[apollo_utilities_1.resultKeyNameFromField(elem)] = null;
        return response;
    }, {});
};
exports.offlineEffect = (store, client, effect, action, callback, mutationCacheUpdates) => __awaiter(this, void 0, void 0, function* () {
    const execute = true;
    const { optimisticResponse: originalOptimisticResponse, operation: { variables, query: mutation, context, operationName }, update, fetchPolicy, observer, } = effect;
    yield client.hydrated();
    const { [cache_1.METADATA_KEY]: { idsMap }, } = store.getState();
    const optimisticResponse = utils_1.replaceUsingMap(Object.assign({}, originalOptimisticResponse), idsMap);
    return new Promise((resolve, reject) => {
        if (!client.queryManager) {
            client.initQueryManager();
        }
        const getObservableFromLinkFunction = client.queryManager
            .getObservableFromLink;
        const observable = getObservableFromLinkFunction.call(client.queryManager, mutation, Object.assign({ apolloOfflineContext: {
                execute,
            } }, context, { optimisticResponse }), variables, false);
        observable.subscribe({
            next: (data) => {
                boundSaveServerId(store, optimisticResponse, data.data);
                const { [cache_1.METADATA_KEY]: { idsMap, }, offline: { outbox: [, ...enqueuedMutations], }, } = store.getState();
                const dataStore = client.queryManager.dataStore;
                const mutationUpdate = update || mutationCacheUpdates[operationName];
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
                const enqueuedActionsFilter = [exports.offlineEffectConfig.enqueueAction];
                enqueuedMutations
                    .filter(({ type }) => enqueuedActionsFilter.indexOf(type) > -1)
                    .forEach(({ meta: { offline: { effect } } }) => {
                    const { operation: { variables = {}, query: document = null, operationName = null, } = {}, update, optimisticResponse: originalOptimisticResponse, fetchPolicy, } = effect;
                    const enqueuedMutationUpdate = update || mutationCacheUpdates[operationName];
                    if (typeof enqueuedMutationUpdate !== "function") {
                        logger("No update function for mutation", {
                            document,
                            variables,
                        });
                        return;
                    }
                    const result = {
                        data: utils_1.replaceUsingMap(Object.assign({}, originalOptimisticResponse), idsMap),
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
                            update: enqueuedMutationUpdate,
                        });
                    }
                });
                client.queryManager.broadcastQueries();
                resolve({ data });
                if (observer.next && !observer.closed) {
                    observer.next(Object.assign({}, data, { [IS_OPTIMISTIC_KEY]: false }));
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
                logger("Error executing link:", error);
                reject(error);
            },
        });
    });
});
const boundSaveServerId = (store, optimisticResponse, data) => store.dispatch(saveServerId_1.default(optimisticResponse, data));
exports.discard = (discardCondition, callback) => (error, action, retries) => {
    const discardResult = shouldDiscard(error, action, retries, discardCondition);
    if (discardResult) {
        if (typeof callback === "function") {
            apollo_utilities_1.tryFunctionOrLogError(() => {
                callback({ error }, null);
            });
        }
    }
    return discardResult;
};
const shouldDiscard = (error, action, retries, discardCondition) => {
    const { graphQLErrors = [], networkError, permanent } = error;
    if (graphQLErrors.length) {
        logger("Discarding action due to GraphQL errors", action, graphQLErrors);
        return true;
    }
    if (networkError && networkError.statusCode >= ERROR_STATUS_CODE) {
        logger("Discarding action due to >= 400 status code", action, networkError);
        return true;
    }
    return permanent || discardCondition(error, action, retries);
};
exports.offlineEffectConfig = {
    enqueueAction: actions.ENQUEUE,
    effect: exports.offlineEffect,
    discard: exports.discard,
    reducer: (dataIdFromObject) => (state, action) => {
        const { type, payload } = action;
        switch (type) {
            case constants_1.PERSIST_REHYDRATE:
                const { [cache_1.METADATA_KEY]: rehydratedState } = payload;
                return rehydratedState || state;
            default:
                const _a = state || {}, { idsMap: originalIdsMap = {}, snapshot: originalSnapshot = {} } = _a, restState = __rest(_a, ["idsMap", "snapshot"]);
                const snapshot = snapshotReducer(originalSnapshot, action);
                const idsMap = idsMapReducer(originalIdsMap, Object.assign({}, action, { remainingMutations: snapshot.enqueuedMutations }), dataIdFromObject);
                return Object.assign({}, restState, { snapshot,
                    idsMap });
        }
    },
};
const snapshotReducer = (state, action) => {
    const enqueuedMutations = enqueuedMutationsReducer(state && state.enqueuedMutations, action);
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
            const ids = utils_1.getIds(dataIdFromObject, optimisticResponse);
            const entries = Object.values(ids).reduce((map, id) => ((map[id] = null), map), {});
            return Object.assign({}, state, entries);
        case actions.COMMIT:
            const { remainingMutations } = action;
            return remainingMutations ? state : {};
        case actions.SAVE_SERVER_ID:
            const { data } = payload;
            const oldIds = utils_1.getIds(dataIdFromObject, optimisticResponse);
            const newIds = utils_1.getIds(dataIdFromObject, data);
            return Object.assign({}, state, mapIds(oldIds, newIds));
        default:
            return state;
    }
};
const intersection = (array1, array2) => array1.filter((v) => array2.indexOf(v) !== -1);
const intersectingKeys = (object1, object2) => {
    const keys1 = Object.keys(object1);
    const keys2 = Object.keys(object2);
    return intersection(keys1, keys2);
};
const mapIds = (object1, object2) => intersectingKeys(object1, object2).reduce((map, key) => ((map[object1[key]] = object2[key]), map), {});
//# sourceMappingURL=offline.js.map