import { SAVE_SNAPSHOT } from "../actions/saveSnapshot";

export const cacheSnapshot = (state = {}, action) => {
  const { type, payload } = action;

  switch (type) {
    case SAVE_SNAPSHOT: {
      const { cache } = payload;
      const cacheContents = { ...cache.extract(false) };
      return cacheContents;
    }
    default:
      return state;
  }
};

export default cacheSnapshot;
