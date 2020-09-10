"use strict";
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
const apollo_cache_inmemory_1 = require("apollo-cache-inmemory");
const isOptimistic_1 = require("../utils/isOptimistic");
const queueOperation_1 = require("../actions/queueOperation");
const queueOperationCommit_1 = require("../actions/queueOperationCommit");
const queueOperationRollback_1 = require("../actions/queueOperationRollback");
const saveServerId_1 = require("../actions/saveServerId");
const saveSnapshot_1 = require("../actions/saveSnapshot");
const constants_1 = require("../cache/constants");
const OPERATION_TYPE_MUTATION = "mutation";
const OPERATION_TYPE_QUERY = "query";
const actions = {
    SAVE_SNAPSHOT: saveSnapshot_1.SAVE_SNAPSHOT,
    ENQUEUE: queueOperation_1.QUEUE_OPERATION,
    COMMIT: queueOperationCommit_1.QUEUE_OPERATION_COMMIT,
    ROLLBACK: queueOperationRollback_1.QUEUE_OPERATION_ROLLBACK,
    SAVE_SERVER_ID: saveServerId_1.SAVE_SERVER_ID,
};
const APOLLO_PRIVATE_CONTEXT_KEYS = ["cache", "getCacheKey", "clientAwareness"];
exports.boundSaveSnapshot = (store, cache) => store.dispatch(saveSnapshot_1.default(cache));
class OfflineLink extends apollo_link_1.ApolloLink {
    constructor({ store }) {
        super();
        this.processOfflineQuery = (operation) => {
            const { [constants_1.NORMALIZED_CACHE_KEY]: normalizedCache = {}, } = this.store.getState();
            const { query, variables, getContext } = operation;
            const { cache } = getContext();
            const offlineStore = apollo_cache_inmemory_1.defaultNormalizedCacheFactory(normalizedCache);
            const storeReader = cache.storeReader;
            const queryData = storeReader.readQueryFromStore({
                store: offlineStore,
                query,
                variables,
            });
            return queryData;
        };
        this.enqueueMutation = (operation, observer) => {
            const { query: mutation, variables, getContext } = operation;
            const _a = getContext(), { apolloOfflineContext: { optimisticResponse: originalOptimisticResponse, update, updateQueries, refetchQueries, fetchPolicy, } } = _a, operationContext = __rest(_a, ["apolloOfflineContext"]);
            const optimisticResponse = typeof originalOptimisticResponse === "function"
                ? originalOptimisticResponse(variables)
                : originalOptimisticResponse;
            const normalizedContext = Object.keys(operationContext)
                .filter((key) => APOLLO_PRIVATE_CONTEXT_KEYS.indexOf(key) < 0)
                .reduce((newObj, key) => Object.assign(newObj, { [key]: operationContext[key] }), {});
            setImmediate(() => {
                const effect = {
                    operation: Object.assign({}, operation, { context: normalizedContext }),
                    optimisticResponse,
                    update,
                    updateQueries,
                    refetchQueries,
                    fetchPolicy,
                    observer,
                };
                this.store.dispatch({
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
                const data = this.processOfflineQuery(operation);
                observer.next({ data });
                observer.complete();
                return () => null;
            }
            if (isMutation) {
                const { apolloOfflineContext: { execute = false } = {}, cache, } = operation.getContext();
                if (!execute) {
                    const { [constants_1.METADATA_KEY]: { snapshot: { enqueuedMutations }, }, } = this.store.getState();
                    if (enqueuedMutations === 0) {
                        exports.boundSaveSnapshot(this.store, cache);
                    }
                    const data = this.enqueueMutation(operation, observer);
                    if (!online) {
                        observer.next({ data, [isOptimistic_1.IS_OPTIMISTIC_KEY]: true });
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
//# sourceMappingURL=offline.js.map