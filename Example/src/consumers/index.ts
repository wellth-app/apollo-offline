import ApolloOfflineClient from "@wellth/apollo-offline";
import { ApolloLink } from "apollo-link";
import {
  InMemoryCache,
  IntrospectionFragmentMatcher,
} from "apollo-cache-inmemory";
import { withClientState } from "apollo-link-state";
import { HttpLink } from "apollo-link-http";
import Logger from "apollo-link-logger";
import AuthenticationLink from "../links/authentication";
import introspectionQueryResultData from "../config/fragmentTypes.json";
import uri from "../config/api";
import resolvers from "../graphql/resolvers";

/// Configure your cache as usual
const cache = new InMemoryCache({
  fragmentMatcher: new IntrospectionFragmentMatcher({
    introspectionQueryResultData,
  }),
});

const client = new ApolloOfflineClient(
  {
    offlineLink: ApolloLink.from([
      Logger,
      withClientState({
        cache,
        ...resolvers,
      }),
    ]),
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
