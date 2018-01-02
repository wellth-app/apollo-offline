// @flow
import { REHYDRATE_STORE } from "../actions/rehydrateStore";

export default (state = false, action) => {
  switch (action.type) {
    case REHYDRATE_STORE:
      return true;
    default:
      return state;
  }
};
