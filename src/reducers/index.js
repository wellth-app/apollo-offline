import cache from "./cache";
import type { State as CacheState } from "./cache";
import eclipse from "./eclipse";
import rehydrated from "./rehydrated";
import type { State as RehydratedState } from "./rehydrated";

export type State = {
  cache: CacheState,
  rehydrated: RehydratedState,
};

export default {
  cache,
  eclipse,
  rehydrated,
};
