import { Action } from "redux";
import { PERSIST_REHYDRATE } from "@redux-offline/redux-offline/lib/constants";

export type State = boolean;

export default (state: State = false, action: Action) => {
  switch (action.type) {
    case PERSIST_REHYDRATE:
      return true;
    default:
      return state;
  }
};
