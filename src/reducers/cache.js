// @flow
import { Action } from "redux";
import { QUEUE_OPERATION } from "../actions/queueOperation";
import { QUEUE_OPERATION_COMMIT } from "../actions/queueOperationCommit";
import { QUEUE_OPERATION_ROLLBACK } from "../actions/queueOperationRollback";

export type State = {
  [key: string]: any,
};

export default (state: State = {}, action: Action) => {
  const { type, payload } = action;
  switch (type) {
    case QUEUE_OPERATION:
      return {
        ...state,
      };
    case QUEUE_OPERATION_COMMIT:
      return {
        ...state,
      };
    case QUEUE_OPERATION_ROLLBACK:
      return {
        ...state,
      };
    default:
      return state;
  }
};
