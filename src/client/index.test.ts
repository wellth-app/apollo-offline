import { v4 as uuid } from "uuid";
import { Observable, ApolloLink } from "apollo-link";
import { createHttpLink } from "apollo-link-http";
import { setContext } from "apollo-link-context";
import gql from "graphql-tag";
import { ApolloOfflineClient, ApolloOfflineClientOptions } from "./";
import { isOptimistic } from "../links/offline";
import { GraphQLError } from "graphql";
import { ApolloError } from "apollo-client";

jest.mock("apollo-link-http", () => ({
  createHttpLink: jest.fn(),
}));

let setNetworkOnlineStatus: (online: boolean) => void;
jest.mock(
  "@redux-offline/redux-offline/lib/defaults/detectNetwork",
  () => (callback) => {
    setNetworkOnlineStatus = (online) => {
      callback({ online });
    };

    // Setting initial network online status
    callback({ online: true });
  },
);

const WAIT = 200;

const mockHttpResponse = (responses: any[] | any, delay = 0) => {
  const mock = createHttpLink as jest.Mock;

  const requestMock = jest.fn();

  [].concat(responses).forEach((resp) => {
    requestMock.mockImplementationOnce(
      () =>
        new Observable((observer) => {
          const timer = setTimeout(() => {
            observer.next({ ...resp });
            observer.complete();
          }, delay);

          // On unsubscription, cancel the timer
          return () => clearTimeout(timer);
        }),
    );
  });

  mock.mockImplementation(() => ({
    request: requestMock,
  }));
};

const createGraphQLError = (backendError: GraphQLError): ApolloError =>
  new ApolloError({
    graphQLErrors: [{ ...backendError }],
    networkError: null,
    errorMessage: `GraphQL error: ${backendError.message}`,
  });

const getClient = (options?: Partial<ApolloOfflineClientOptions>) => {
  const defaultOptions: ApolloOfflineClientOptions = {
    onlineLink: createHttpLink({ uri: "some uri" }),
    disableOffline: false,
    storage: new MemoryStorage(),
    offlineConfig: {
      discardCondition: () => false,
      callback: null, //console.warn.bind(console),
    },
  };

  return new ApolloOfflineClient({
    ...defaultOptions,
    ...options,
    offlineConfig: {
      ...defaultOptions.offlineConfig,
      ...options.offlineConfig,
    },
  });
};

class MemoryStorage {
  private storage;
  private logger;
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
      if (callback) callback(null, value);
      resolve(value);
    });
  }

  getItem(key, callback) {
    return new Promise((resolve, reject) => {
      this.log("getItem called with", key);
      const value = this.storage[key];
      if (callback) callback(null, value);
      resolve(value);
    });
  }

  removeItem(key, callback) {
    return new Promise((resolve, reject) => {
      this.log("removeItem called with", key);
      const value = this.storage[key];
      delete this.storage[key];
      if (callback) callback(null, value);
      resolve(value);
    });
  }

  getAllKeys(callback) {
    return new Promise((resolve, reject) => {
      this.log("getAllKeys called");
      const keys = Object.keys(this.storage);
      if (callback) callback(null, keys);
      resolve(keys);
    });
  }
}

describe("ApolloOfflineClient", () => {
  const localId = uuid();
  const serverId = uuid();

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

  const mutation = gql`
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
    let client: ApolloOfflineClient<any>;
    beforeEach(() => {
      mockHttpResponse({ data: serverResponse });
      client = getClient({ disableOffline });
    });

    it("updates the cache with the server response", async (done) => {
      const result = await client.mutate({
        mutation,
        variables,
        optimisticResponse,
      });

      expect(result).toMatchObject({ data: { ...serverResponse } });

      // The server response is present in the cache
      expect(client.cache.extract(false)).toMatchObject({
        [`Todo:${serverId}`]: serverResponse.addTodo,
      });

      done();
    });
  });

  describe("Offline enabled", () => {
    const disableOffline = false;
    let client: ApolloOfflineClient<any>;
    beforeEach(() => {
      mockHttpResponse({ data: serverResponse });
      client = getClient({ disableOffline });
    });

    it("updates the cache with the server response", async (done) => {
      setNetworkOnlineStatus(true);

      const result = await client.mutate({
        mutation,
        variables,
        optimisticResponse,
      });

      // Give it some time
      await new Promise((r) => setTimeout(r, WAIT));

      expect(result).toMatchObject({ data: { ...serverResponse } });

      // The server response is present in the cache
      expect(client.cache.extract(false)).toMatchObject({
        [`Todo:${serverId}`]: serverResponse.addTodo,
      });

      expect(isOptimistic(result)).toBe(false);

      done();
    });

    describe("enqueued effects", () => {
      describe("context", () => {
        it("preserves an operation's custom context applied via link", async (done) => {
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
            // Configure a link that's executed before the `OfflineLink` that
            // extends context
            offlineLink: setContext(() => context),
            onlineLink: new ApolloLink((operation, forward) => {
              operationContext = operation.getContext();
              return forward(operation);
            }).concat(createHttpLink({ uri: "some uri" })),
          });

          await client.mutate({
            mutation,
            variables,
            optimisticResponse,
          });

          expect(operationContext).toMatchObject({ ...context });
          done();
        });

        it("preserves an operation's custom context applied via mutate options", async (done) => {
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
            onlineLink: new ApolloLink((operation, forward) => {
              operationContext = operation.getContext();
              return forward(operation);
            }).concat(createHttpLink({ uri: "some uri" })),
          });

          await client.mutate({
            mutation,
            variables,
            optimisticResponse,
            context,
          });

          expect(operationContext).toMatchObject({ ...context });
          done();
        });
      });
    });

    describe("Online", () => {
      beforeEach(() => {
        setNetworkOnlineStatus(true);
      });

      it("updates the cache with the optimistic response", () => {
        client.mutate({
          mutation,
          variables,
          optimisticResponse,
        });

        // The optimistic response is present in the cache
        expect(client.cache.extract(true)).toMatchObject({
          [`Todo:${localId}`]: optimisticResponse.addTodo,
        });
      });

      describe("error handling", () => {
        it("properly updates the cache", async () => {
          const errorMock = {
            type: "GraphQLError",
            message: "Some specific error message.",
            code: 1001,
          };

          const graphQLError = createGraphQLError(errorMock);

          mockHttpResponse({
            data: optimisticResponse,
            errors: [errorMock],
          });

          const offlineCallback = jest.fn();
          const client = getClient({
            disableOffline,
            offlineConfig: {
              callback: offlineCallback,
              discardCondition: () => false,
            },
          });

          const resultPromise = client.mutate({
            mutation,
            variables,
            optimisticResponse,
          });

          // Ensure the optimistic response is added to the cache before the request is executed
          expect(client.cache.extract(true)).toMatchObject({
            [`Todo:${localId}`]: optimisticResponse.addTodo,
          });

          // Execute the request
          try {
            await resultPromise;
            fail("Error wasn't thrown!");
          } catch (error) {
            expect(error).toMatchObject(graphQLError);
          }

          // Ensure that the callback provided to the client is notified of the request
          // being discarded for error reasons
          expect(offlineCallback).toHaveBeenCalledTimes(1);
          expect(offlineCallback).toBeCalledWith(
            {
              mutation: "addTodo",
              variables,
              error: new ApolloError({ graphQLErrors: [errorMock] }),
              notified: true,
            },
            null,
          );

          // Ensure the optimistic response has been removed from the cache
          const cacheState = client.cache.extract(true);
          expect(cacheState).toEqual({});
          expect({}).not.toMatchObject({
            [`Todo:${localId}`]: optimisticResponse.addTodo,
          });
          // ???: This test fails if the cache is empty...
          // expect(cacheState).not.toMatchObject({
          //   [`Todo:${localId}`]: optimisticResponse.addTodo,
          // });
        });
      });
    });

    describe("Offline", () => {
      it("updates the cache with the optimistic response", () => {
        setNetworkOnlineStatus(false);

        client.mutate({
          mutation,
          variables,
          optimisticResponse,
        });

        // The optimistic response is present in the cache
        expect(client.cache.extract(true)).toMatchObject({
          [`Todo:${localId}`]: optimisticResponse.addTodo,
        });
      });
    });
  });
});
