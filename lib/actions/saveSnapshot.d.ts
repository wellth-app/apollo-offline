import { ApolloCache } from "apollo-cache";
import { NormalizedCacheObject } from "apollo-cache-inmemory";
export declare const SAVE_SNAPSHOT = "SAVE_SNAPSHOT";
declare const _default: (cache: ApolloCache<NormalizedCacheObject>) => {
    type: string;
    payload: {
        cache: ApolloCache<NormalizedCacheObject>;
    };
};
export default _default;
