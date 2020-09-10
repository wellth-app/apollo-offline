import { OfflineSyncMetadataState, METADATA_KEY } from "../cache";
import { PERSIST_REHYDRATE } from "@redux-offline/redux-offline/lib/constants";
import snapshotReducer from "./snapshot";
import idsMapReducer from "./idsMap";

export const offlineEffect = (dataIdFromObject) => (
  state: OfflineSyncMetadataState,
  action,
) => {
  const { type, payload } = action;

  switch (type) {
    case PERSIST_REHYDRATE:
      const { [METADATA_KEY]: rehydratedState } = payload;
      return rehydratedState || state;
    default:
      const {
        idsMap: originalIdsMap = {},
        snapshot: originalSnapshot = {},
        ...restState
      } = state || {};

      const snapshot = snapshotReducer(originalSnapshot, action);
      const idsMap = idsMapReducer(
        originalIdsMap,
        { ...action, remainingMutations: snapshot.enqueuedMutations },
        dataIdFromObject,
      );

      return {
        ...restState,
        snapshot,
        idsMap,
      };
  }
};

export default offlineEffect;
