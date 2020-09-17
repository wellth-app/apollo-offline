import { SAVE_SNAPSHOT } from "../actions/saveSnapshot";
import { RESET_STATE } from "../actions/resetState";

const InitialState = {};

export const cacheSnapshot = (state = InitialState, action) => {
  const { type, payload } = action;

  switch (type) {
    case SAVE_SNAPSHOT: {
      const { cache } = payload;
      const cacheContents = { ...cache.extract(false) };
      return cacheContents;
    }
    case RESET_STATE:
      return InitialState;
    default:
      return state;
  }
};

export default cacheSnapshot;
