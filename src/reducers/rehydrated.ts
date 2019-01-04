import { Action } from "redux";
import { REHYDRATE_STORE } from "../actions/rehydrateStore";

export type State = boolean;
const InitialState = false;

export default (state: State = InitialState, action: Action) => {
  switch (action.type) {
    case REHYDRATE_STORE:
      return true;
    default:
      return state;
  }
};
