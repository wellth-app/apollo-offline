import { QUEUE_OPERATION } from "../actions/queueOperation";
import { QUEUE_OPERATION_COMMIT } from "../actions/queueOperationCommit";
import { SAVE_SERVER_ID } from "../actions/saveServerId";
import { getIds, mapIds } from "../utils";

export const idsMapReducer = (state = {}, action, dataIdFromObject) => {
  const { type, payload = {} } = action;
  const { optimisticResponse } = payload;

  switch (type) {
    case QUEUE_OPERATION:
      const ids = getIds(dataIdFromObject, optimisticResponse);
      const entries = Object.values(ids).reduce(
        (map: { [key: string]: string }, id: string) => ((map[id] = null), map),
        {},
      );
      return {
        ...state,
        ...entries,
      };
    case QUEUE_OPERATION_COMMIT:
      const { remainingMutations } = action;
      return remainingMutations ? state : {};
    case SAVE_SERVER_ID:
      const { data } = payload;
      const oldIds = getIds(dataIdFromObject, optimisticResponse);
      const newIds = getIds(dataIdFromObject, data);

      return {
        ...state,
        ...mapIds(oldIds, newIds),
      };
    default:
      return state;
  }
};

export default idsMapReducer;
