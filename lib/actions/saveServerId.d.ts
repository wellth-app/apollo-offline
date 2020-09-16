import { NormalizedCacheObject } from "apollo-cache-inmemory";
export declare const SAVE_SERVER_ID = "SAVE_SERVER_ID";
declare const _default: <TOptimistic, TData extends NormalizedCacheObject>(optimisticResponse: TOptimistic, data: TData) => {
    type: string;
    payload: {
        data: TData;
        optimisticResponse: TOptimistic;
    };
};
export default _default;
