import rehydrated from "./rehydrated";
import type { State as RehydratedState } from "./rehydrated";

export type State = {
  rehydrated: RehydratedState,
};

export default {
  rehydrated,
};
