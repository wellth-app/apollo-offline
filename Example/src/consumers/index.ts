import ApolloOfflineClient from "@wellth/apollo-offline";
import { ApolloLink } from "apollo-link";
import {
  InMemoryCache,
  IntrospectionFragmentMatcher,
  defaultDataIdFromObject,
} from "apollo-cache-inmemory";
import { HttpLink } from "apollo-link-http";
import Logger from "apollo-link-logger";
import AuthenticationLink from "../links/authentication";
import introspectionQueryResultData from "../config/fragmentTypes.json";
import uri from "../config/api";

/// Configure your cache as usual
const cache = new InMemoryCache({
  fragmentMatcher: new IntrospectionFragmentMatcher({
    introspectionQueryResultData,
  }),
  dataIdFromObject: (object) => {
    console.log(object);
    const id = defaultDataIdFromObject(object);
    console.log("Computed ID:", id);
    return id;
  },
});

const client = new ApolloOfflineClient(
  {
    offlineLink: Logger,
    onlineLink: ApolloLink.from([
      // Links to be executed iff the request hits the network
      AuthenticationLink({
        getToken: () => "123456abcdef",
        expired: () => false,
        format: (token) => `Bearer ${token}`,
        reauthenticate: async () => "67890ghijklm",
      }),
      new HttpLink({
        uri,
      }),
    ]),
  },
  { cache },
);

export default client;
