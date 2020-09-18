import { ApolloCache } from "apollo-cache";
import { NormalizedCacheObject } from "apollo-cache-inmemory";

export const SAVE_SNAPSHOT = "SAVE_SNAPSHOT";

export default (cache: ApolloCache<NormalizedCacheObject>) => ({
  type: SAVE_SNAPSHOT,
  payload: { cache },
});
