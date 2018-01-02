import { QUEUE_OPERATION } from "../actions/queueOperation";
import { QUEUE_OPERATION_COMMIT } from "../actions/queueOperationCommit";
import { QUEUE_OPERATION_ROLLBACK } from "../actions/queueOperationRollback";

export default (state = {}, action: Action) => {
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
