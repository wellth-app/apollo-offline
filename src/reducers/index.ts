import rehydrated, { State as RehydratedState } from "./rehydrated";
import { OfflineState } from "@redux-offline/redux-offline/lib/types";

export interface State {
  rehydrated: RehydratedState;
  offline: OfflineState;
}

export default {
  rehydrated,
};
