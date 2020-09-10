/* eslint-disable no-magic-numbers */
import { QUEUE_OPERATION } from "../actions/queueOperation";
import { QUEUE_OPERATION_COMMIT } from "../actions/queueOperationCommit";
import { QUEUE_OPERATION_ROLLBACK } from "../actions/queueOperationRollback";

const enqueuedMutations = (state = 0, { type }) => {
  switch (type) {
    case QUEUE_OPERATION:
      return state + 1;
    case QUEUE_OPERATION_COMMIT:
    case QUEUE_OPERATION_ROLLBACK:
      return state - 1;
    default:
      return state;
  }
};

export default enqueuedMutations;
