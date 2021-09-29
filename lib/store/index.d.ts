import { Middleware, Store } from "redux";
import { Config, OfflineAction } from "@redux-offline/redux-offline/lib/types";
import { IdGetter } from "apollo-cache-inmemory";
import { OfflineCacheShape } from "../cache";
export interface ReducerOptions {
    dataIdFromObject: IdGetter;
}
declare type ReduxOfflineConfig = Omit<Config, "discard"> & {
    discard: (error: any, action: OfflineAction, retries: number) => Promise<boolean> | boolean;
};
export interface OfflineStoreOptions extends Partial<ReduxOfflineConfig> {
    middleware: Middleware[];
    storage?: any;
    dataIdFromObject: (obj: any) => string | null;
}
export declare const createOfflineStore: ({ middleware, persistCallback, storage, dataIdFromObject, discard, ...offlineConfig }: OfflineStoreOptions) => Store<OfflineCacheShape>;
export {};
