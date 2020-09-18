import cacheSnapshotReducer from "./cacheSnapshot";
import enqueuedMutationsReducer from "./enqueuedMutations";

export const snapshot = (state, action) => {
  const enqueuedMutations = enqueuedMutationsReducer(
    state && state.enqueuedMutations,
    action,
  );

  const cache = cacheSnapshotReducer(state && state.cache, {
    ...action,
    enqueuedMutations,
  });

  return {
    enqueuedMutations,
    cache,
  };
};

export default snapshot;
