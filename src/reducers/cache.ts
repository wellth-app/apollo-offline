import { WRITE_CACHE as WRITE_CACHE_ACTION } from "../actions/writeCache";

export default (state = {}, action) => {
  const { type, payload: normalizedCache } = action;
  switch (type) {
    case WRITE_CACHE_ACTION:
      return { ...normalizedCache };
    default:
      return state;
  }
};
