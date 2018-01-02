/// @flow
import ApolloOfflineClient from "@wellth/apollo-offline";
import { AsyncStorage } from "react-native";
import {
  IntrospectionFragmentMatcher,
  InMemoryCache,
} from "apollo-cache-inmemory";

/// Configure your cache as usual
const cache = new InMemoryCache({
  cacheResolvers,
  fragmentMatcher: introspectionQueryResultData
    ? new IntrospectionFragmentMatcher({
        introspectionQueryResultData,
      })
    : null,
});

persistCache({ cache, storage: AsyncStorage });

const apiClient = new ApolloOfflineClient({
  middleware,
  cache,
  offlineLinks: [
    /// Links to be executed whether or not the request hits the network.
    /// Usually side-effects and logging.
  ],
  onlineLinks: [
    /// Links to be executed only if the request is meant for the network.
    /// This includes any header modifications,
    /// splitting based on context, etc.
    new AuthenticationLink({
      getAuthToken: () => selectAuthToken(store.getState()),
      setAuthToken: token => store.dispatch(setAuthToken(token)),
    }),
    new HttpLink({
      uri,
    }),
  ],
  persistCallback: () => {
    store.dispatch({ type: REHYDRATE_STORE });
  },
});

export default apiClient;
