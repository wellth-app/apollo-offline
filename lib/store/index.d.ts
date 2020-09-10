import { Middleware, Store } from "redux";
import { Config } from "@redux-offline/redux-offline/lib/types";
import { OfflineCacheShape } from "cache";
import { IdGetter } from "apollo-cache-inmemory";
export interface ReducerOptions {
    dataIdFromObject: IdGetter;
}
export interface OfflineStoreOptions extends Partial<Config> {
    middleware: Middleware[];
    storage?: any;
    dataIdFromObject: (obj: any) => string | null;
}
export declare const createOfflineStore: ({ middleware, persistCallback, storage, dataIdFromObject, ...offlineConfig }: OfflineStoreOptions) => Store<OfflineCacheShape>;
