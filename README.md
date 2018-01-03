# apollo-offline

Apollo 2.0 Implementation allowing for offline mutations.

## Installation

To get started with ApolloOfflineClient, install using your favorite package manager (`yarn` or `npm`):

```sh
$ yarn add @wellth-app/apollo-offline
$ npm install @wellth-app/apollo-offline
```

## Usage

Apollo offline client is intended to be used as a drop-in replacement for existing apollo 2.0 infrastructure:

```js
/// Configure your cache as usual
const cache = new InMemoryCache({ ... });

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
      setAuthToken: token => store.dispatch(setAuthToken(token))
    }),
    new HttpLink({
      uri,
    })
  ],
  persistCallback: () => {
    store.dispatch({ type: REHYDRATE_STORE });
  }
})

/// Use as you would any other `ApolloClient`.
```

Using `ApolloOfflineClient` vs `ApolloClient` will give you the flexibility
