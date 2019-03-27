import { v4 as uuid } from "uuid";
import { Observable } from "apollo-link";
import { createHttpLink } from "apollo-link-http";
import gql from "graphql-tag";
import { ApolloOfflineClient, ApolloOfflineClientOptions } from "./";
import { isOptimistic } from "../links/offline";

jest.mock("apollo-link-http", () => ({
  createHttpLink: jest.fn(),
}));

let setNetworkOnlineStatus: (online: boolean) => void;
jest.mock(
  "@redux-offline/redux-offline/lib/defaults/detectNetwork",
  () => (callback) => {
    setNetworkOnlineStatus = (online) => {
      setTimeout(() => callback({ online }), 0);
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

    it("updates the cache with the server response", async () => {
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
    });
  });

  describe("Offline enabled", () => {
    const disableOffline = false;
    let client: ApolloOfflineClient<any>;
    beforeEach(() => {
      mockHttpResponse({ data: serverResponse });
      client = getClient({ disableOffline });
    });

    it("updates the cache with the server response", async () => {
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
    });

    describe("Online", () => {
      beforeEach(() => {
        setNetworkOnlineStatus(true);
      });

      it("updates the cache with the optimistic response", async () => {
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
        it("properly updates the cache", () => {
          // TODO: Mock an error HTTP request
          // TODO: Ensure the optimistic response is added to the cache before the request is executed
          // TODO: Execute the request
          // TODO: Ensure the error was thrown
          // TODO: Ensure the optimistic response has been removed from the cache
        });
      });
    });

    describe("Offline", () => {
      beforeEach(() => {
        setNetworkOnlineStatus(false);
      });

      it("updates the cache with the optimistic response", async () => {
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
