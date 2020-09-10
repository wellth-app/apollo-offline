import { NormalizedCacheObject } from "apollo-cache-inmemory";

export const SAVE_SERVER_ID = "SAVE_SERVER_ID";

export default <TOptimistic, TData extends NormalizedCacheObject>(
  optimisticResponse: TOptimistic,
  data: TData,
) => ({
  type: SAVE_SERVER_ID,
  payload: { data, optimisticResponse },
});
