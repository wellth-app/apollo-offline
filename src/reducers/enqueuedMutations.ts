/* eslint-disable no-magic-numbers */
import { RESET_STATE } from "../actions/resetState";
import { QUEUE_OPERATION } from "../actions/queueOperation";
import { QUEUE_OPERATION_COMMIT } from "../actions/queueOperationCommit";
import { QUEUE_OPERATION_ROLLBACK } from "../actions/queueOperationRollback";

const InitialState = 0;

const enqueuedMutations = (state = InitialState, { type }) => {
  switch (type) {
    case QUEUE_OPERATION:
      return state + 1;
    case QUEUE_OPERATION_COMMIT:
    case QUEUE_OPERATION_ROLLBACK:
      return state - 1;
    case RESET_STATE:
      return InitialState;
    default:
      return state;
  }
};

export default enqueuedMutations;
