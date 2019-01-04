// TODO: This should be typed to reducer state, but the offline is added as the store is created
// via `@redux-offline/redux-offline`. Eventually, the online/offline state should be passed to to
// client for management via `offlineStateLens` prop for creating a `@redux-offline` offline store.
export default (state: any): boolean => state.offline.online;
