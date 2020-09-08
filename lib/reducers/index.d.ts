import { Reducer, AnyAction } from "redux";
import { IdGetter } from "apollo-cache-inmemory";
import { NORMALIZED_CACHE_KEY, METADATA_KEY } from "../cache";
export declare type OfflineEffectConfig = {
    enqueueAction: string;
    effect?: Function;
    discard?: Function;
    retry?: Function;
    reducer?: (dataIdFromObject: IdGetter) => Reducer<any>;
};
export interface Options {
    dataIdFromObject: IdGetter;
}
declare const _default: ({ dataIdFromObject }: Options) => {
    rehydrated: (state: boolean, action: import("redux").Action) => boolean;
    [NORMALIZED_CACHE_KEY]: (state: {}, action: any) => any;
    [METADATA_KEY]: (state: any, action: AnyAction) => any;
};
export default _default;
