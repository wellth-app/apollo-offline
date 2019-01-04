# apollo-offline

Apollo 2.0 Implementation allowing for offline mutations.

## Installation

To get started with ApolloOfflineClient, install using your favorite package manager (`yarn` or `npm`):

```sh
$ yarn add @wellth/apollo-offline
$ npm install @wellth/apollo-offline
```

## Usage

Apollo offline client is intended to be used as a drop-in replacement for existing apollo 2.0 infrastructure:

```js
/// Configure your cache as usual
const cache = new InMemoryCache({ ... });

const apiClient = new ApolloOfflineClient({
   middleware,
   offlineLinks: [
     /// Links to be executed whether or not the request hits the network.
     /// Usually side-effects and logging.
     new LoggerLink(),
     new ErrorLink(),
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
    }),
  ],
  persistCallback: () => {
    store.dispatch({ type: REHYDRATE_STORE });
  }
}, { cache })

/// Use as you would any other `ApolloClient`.
```

The `ApolloOfflineClient` creates a "fractured" network-stack. That is,
it configures an "offline" link for handling offline requests. 

### Offline Behavior
If the client determines that the network is offline, it will execute all
links in `offlineLinks`, but it will "dead-end" at the offline link.

To skip the offline link on a per-request basis (i.e. "authentication calls can only be made online") add
`requireOnline: true` to the context of the request.

#### Queries
Queries executed while offline will read and return the optimistic response from the cache, or null.

#### Mutations
**All** mutations will be queued, persisted, and executed via `redux-offline`.

Executed mutations will be "processed" (queued to `redux-offline`) and will return the `optimisticResponse`.

### Online Behavior
If the client determines that the network is online, it will execute all links in `offlineLinks` and `onlineLinks`.

The `@redux-offline` implementation will push any queued mutations through the client like `client.mutate(options)`

#### Queries
Queries executed while offline will not be processed by the offline reducer,
and will be forwarded along the link chain.

#### Mutations
See offline behavior for mutations. 

Mutations executed while online will be "processed" like offline mutations to ensure data consistency, and executed the same way.

This means that after executing a `mutation`, it will respond twice.
It will return the optimistic response if any (processing), and then
it will respond with the network data.


### *Coming Soon*
- [] Fetching items from the queued, offline-cache
- [] Flagging optimistic responses