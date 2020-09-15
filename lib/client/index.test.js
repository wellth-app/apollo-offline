"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const apollo_link_1 = require("apollo-link");
const apollo_link_http_1 = require("apollo-link-http");
const apollo_link_context_1 = require("apollo-link-context");
const graphql_tag_1 = require("graphql-tag");
const graphql_1 = require("graphql");
const apollo_client_1 = require("apollo-client");
const isOptimistic_1 = require("../utils/isOptimistic");
const _1 = require(".");
jest.mock("apollo-link-http", () => ({
    createHttpLink: jest.fn(),
}));
let setNetworkOnlineStatus;
jest.mock("@redux-offline/redux-offline/lib/defaults/detectNetwork", () => (callback) => {
    setNetworkOnlineStatus = (online) => {
        callback({ online });
    };
    callback({ online: true });
});
const WAIT = 200;
const mockHttpResponse = (responses, delay = 0) => {
    const mock = apollo_link_http_1.createHttpLink;
    const requestMock = jest.fn();
    [].concat(responses).forEach((resp) => {
        requestMock.mockImplementationOnce(() => new apollo_link_1.Observable((observer) => {
            const timer = setTimeout(() => {
                observer.next(Object.assign({}, resp));
                observer.complete();
            }, delay);
            return () => clearTimeout(timer);
        }));
    });
    mock.mockImplementation(() => ({
        request: requestMock,
    }));
};
const createGraphQLError = (backendError) => new apollo_client_1.ApolloError({
    graphQLErrors: [Object.assign({}, backendError)],
    networkError: null,
    errorMessage: `GraphQL error: ${backendError.message}`,
});
const getClient = (options) => {
    const defaultOptions = {
        onlineLink: apollo_link_http_1.createHttpLink({ uri: "some uri" }),
        disableOffline: false,
        offlineConfig: {
            storage: new MemoryStorage(),
            discardCondition: () => false,
            callback: null,
        },
    };
    return new _1.ApolloOfflineClient(Object.assign(Object.assign(Object.assign({}, defaultOptions), options), { offlineConfig: Object.assign(Object.assign({}, defaultOptions.offlineConfig), options.offlineConfig) }));
};
class MemoryStorage {
    constructor({ logger = null, initialState = {} } = {}) {
        this.storage = Object.assign({}, initialState);
        this.logger = logger;
    }
    log(...args) {
        if (this.logger && typeof this.logger === "function") {
            this.logger(...args);
        }
    }
    setItem(key, value, callback) {
        return new Promise((resolve, reject) => {
            this.storage[key] = value;
            this.log("setItem called with", key, value);
            if (callback)
                callback(null, value);
            resolve(value);
        });
    }
    getItem(key, callback) {
        return new Promise((resolve, reject) => {
            this.log("getItem called with", key);
            const value = this.storage[key];
            if (callback)
                callback(null, value);
            resolve(value);
        });
    }
    removeItem(key, callback) {
        return new Promise((resolve, reject) => {
            this.log("removeItem called with", key);
            const value = this.storage[key];
            delete this.storage[key];
            if (callback)
                callback(null, value);
            resolve(value);
        });
    }
    getAllKeys(callback) {
        return new Promise((resolve, reject) => {
            this.log("getAllKeys called");
            const keys = Object.keys(this.storage);
            if (callback)
                callback(null, keys);
            resolve(keys);
        });
    }
}
describe("ApolloOfflineClient", () => {
    const localId = uuid_1.v4();
    const serverId = uuid_1.v4();
    const optimisticResponse = {
        addTodo: {
            __typename: "Todo",
            id: localId,
            title: "Take out trash",
        },
    };
    const serverResponse = {
        addTodo: {
            __typename: "Todo",
            id: serverId,
            title: "Take out trash",
        },
    };
    const mutation = graphql_tag_1.default `
    mutation($title: String!) {
      addTodo(title: $title) {
        id
        title
      }
    }
  `;
    const variables = {
        title: "Take out trash",
    };
    describe("Offline disabled", () => {
        const disableOffline = true;
        let client;
        beforeEach(() => {
            mockHttpResponse({ data: serverResponse });
            client = getClient({ disableOffline });
        });
        it("updates the cache with the server response", (done) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield client.mutate({
                mutation,
                variables,
                optimisticResponse,
            });
            expect(result).toMatchObject({ data: Object.assign({}, serverResponse) });
            expect(client.cache.extract(false)).toMatchObject({
                [`Todo:${serverId}`]: serverResponse.addTodo,
            });
            done();
        }));
    });
    describe("Offline enabled", () => {
        const disableOffline = false;
        let client;
        beforeEach(() => {
            mockHttpResponse({ data: serverResponse });
            client = getClient({ disableOffline });
        });
        it("updates the cache with the server response", (done) => __awaiter(void 0, void 0, void 0, function* () {
            setNetworkOnlineStatus(true);
            const result = yield client.mutate({
                mutation,
                variables,
                optimisticResponse,
            });
            yield new Promise((r) => setTimeout(r, WAIT));
            expect(result).toMatchObject({ data: Object.assign({}, serverResponse) });
            expect(client.cache.extract(false)).toMatchObject({
                [`Todo:${serverId}`]: serverResponse.addTodo,
            });
            expect(isOptimistic_1.isOptimistic(result)).toBe(false);
            done();
        }));
        describe("enqueued effects", () => {
            describe("context", () => {
                it("preserves an operation's custom context applied via link", (done) => __awaiter(void 0, void 0, void 0, function* () {
                    setNetworkOnlineStatus(true);
                    const context = {
                        customContext: {
                            key: "Value",
                        },
                        otherCustomContext: "customContextValue",
                    };
                    let operationContext = null;
                    client = getClient({
                        disableOffline,
                        offlineLink: apollo_link_context_1.setContext(() => context),
                        onlineLink: new apollo_link_1.ApolloLink((operation, forward) => {
                            operationContext = operation.getContext();
                            return forward(operation);
                        }).concat(apollo_link_http_1.createHttpLink({ uri: "some uri" })),
                    });
                    yield client.mutate({
                        mutation,
                        variables,
                        optimisticResponse,
                    });
                    expect(operationContext).toMatchObject(Object.assign({}, context));
                    done();
                }));
                it("preserves an operation's custom context applied via mutate options", (done) => __awaiter(void 0, void 0, void 0, function* () {
                    setNetworkOnlineStatus(true);
                    const context = {
                        customContextKey: {
                            deepNestedObject: {
                                key: "value",
                            },
                        },
                        string: "value",
                    };
                    let operationContext = null;
                    client = getClient({
                        disableOffline,
                        onlineLink: new apollo_link_1.ApolloLink((operation, forward) => {
                            operationContext = operation.getContext();
                            return forward(operation);
                        }).concat(apollo_link_http_1.createHttpLink({ uri: "some uri" })),
                    });
                    yield client.mutate({
                        mutation,
                        variables,
                        optimisticResponse,
                        context,
                    });
                    expect(operationContext).toMatchObject(Object.assign({}, context));
                    done();
                }));
            });
        });
        describe("Online", () => {
            beforeEach(() => {
                setNetworkOnlineStatus(true);
            });
            it("updates the cache with the optimistic response", (done) => __awaiter(void 0, void 0, void 0, function* () {
                yield client.mutate({
                    mutation,
                    variables,
                    optimisticResponse,
                });
                expect(client.cache.extract(true)).toMatchObject({
                    [`Todo:${localId}`]: optimisticResponse.addTodo,
                });
                done();
            }));
            describe("error handling", () => {
                it("removes optimistic responses from the cache if the request is to be discarded (GraphQLErrors)", () => __awaiter(void 0, void 0, void 0, function* () {
                    const errorMock = new graphql_1.GraphQLError("Some specific error message");
                    const graphQLError = createGraphQLError(errorMock);
                    mockHttpResponse({
                        data: optimisticResponse,
                        errors: [errorMock],
                    });
                    const offlineCallback = jest.fn();
                    client = getClient({
                        disableOffline,
                        offlineConfig: {
                            callback: offlineCallback,
                            discardCondition: () => false,
                        },
                    });
                    try {
                        yield client.mutate({
                            mutation,
                            variables,
                            optimisticResponse,
                        });
                        fail("Error wasn't thrown!");
                    }
                    catch (error) {
                        expect(error).toMatchObject(graphQLError);
                    }
                    expect(offlineCallback).toHaveBeenCalledTimes(1);
                    expect(offlineCallback).toBeCalledWith({
                        mutation: "addTodo",
                        variables,
                        error: new apollo_client_1.ApolloError({ graphQLErrors: [errorMock] }),
                        notified: true,
                    }, null);
                    const cacheState = client.cache.extract(true);
                    expect(cacheState).toEqual({});
                }));
            });
        });
        describe("Offline", () => {
            it("updates the cache with the optimistic response", (done) => __awaiter(void 0, void 0, void 0, function* () {
                setNetworkOnlineStatus(false);
                yield client.mutate({
                    mutation,
                    variables,
                    optimisticResponse,
                });
                expect(client.cache.extract(true)).toMatchObject({
                    [`Todo:${localId}`]: optimisticResponse.addTodo,
                });
                done();
            }));
        });
    });
});
//# sourceMappingURL=index.test.js.map