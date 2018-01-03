// @flow
import ApolloOfflineClient from "@wellth/apollo-offline";
import { AsyncStorage } from "react-native";
import {
  IntrospectionFragmentMatcher,
  InMemoryCache,
} from "apollo-cache-inmemory";
import { HttpLink } from "apollo-link-http";
import persistCache from "apollo-cache-persist";
import AuthenticationLink from "../links/authentication";
import type { Token } from "../links/authentication";

const uri = ""; /// !!!: Add a URI

/// Configure your cache as usual
const cache = new InMemoryCache();

persistCache({ cache, storage: AsyncStorage });

const apiClient = new ApolloOfflineClient({
  cache,
  offlineLinks: [
    /// Links to be executed whether or not the request hits the network.
    /// Usually side-effects and logging.
  ],
  onlineLinks: [
    new AuthenticationLink({
      getToken: () => "123456abcdef",
      expired: token => false,
      format: token => `Bearer ${token}`,
      reauthenticate: async (): Token => {
        return "67890ghijklm";
      },
    }),
    new HttpLink({
      uri,
    }),
  ],
  persistCallback: () => {
    console.log("Persistence was successfully loaded");
  },
});

export default apiClient;
