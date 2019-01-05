// @flow
import ApolloOfflineClient from "@wellth/apollo-offline";
import { ApolloLink } from "apollo-link";
import { AsyncStorage } from "react-native";
import { InMemoryCache } from "apollo-cache-inmemory";
import { HttpLink } from "apollo-link-http";
import { persistCache } from "apollo-cache-persist";
import Logger from "apollo-link-logger";
import AuthenticationLink from "../links/authentication";

const uri = "https://fakerql.com/graphql"; /// !!!: Add a URI

/// Configure your cache as usual
const cache = new InMemoryCache();
persistCache({ cache, storage: AsyncStorage });

const apiClient = new ApolloOfflineClient(
  {
    offlineLink: Logger,
    onlineLink: ApolloLink.from([
      /// Links to be executed iff the request hits the network
      AuthenticationLink({
        getToken: () => "123456abcdef",
        expired: (token) => false,
        format: (token) => `Bearer ${token}`,
        reauthenticate: async () => "67890ghijklm",
      }),
      new HttpLink({
        uri,
      }),
    ]),
    persistCallback: () => {
      console.log("Persistence was successfully loaded");
    },
  },
  { cache },
);

export default apiClient;
