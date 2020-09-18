import { WRITE_CACHE as WRITE_CACHE_ACTION } from "../actions/writeCache";
import { RESET_STATE } from "../actions/resetState";

const InitialState = {};

export default (state = InitialState, action) => {
  const { type, payload: normalizedCache } = action;
  switch (type) {
    case WRITE_CACHE_ACTION:
      return { ...normalizedCache };
    case RESET_STATE:
      return InitialState;
    default:
      return state;
  }
};
