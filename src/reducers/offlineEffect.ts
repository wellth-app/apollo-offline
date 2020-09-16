import { PERSIST_REHYDRATE } from "@redux-offline/redux-offline/lib/constants";
import { AnyAction } from "redux";
import { OfflineSyncMetadataState } from "../cache";
import { METADATA_KEY } from "../cache/constants";
import snapshotReducer from "./snapshot";
import idsMapReducer from "./idsMap";

export const offlineEffect = (dataIdFromObject) => (
  state: OfflineSyncMetadataState,
  action: AnyAction,
): OfflineSyncMetadataState => {
  const { type, payload } = action;

  switch (type) {
    case PERSIST_REHYDRATE: {
      const { [METADATA_KEY]: rehydratedState } = payload;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return rehydratedState || state;
    }
    default: {
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
  }
};

export default offlineEffect;
