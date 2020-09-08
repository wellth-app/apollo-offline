import { Middleware, Store } from "redux";
import { OfflineAction, Config } from "@redux-offline/redux-offline/lib/types";
export declare type NetworkEffect = (effect: any, action: OfflineAction) => Promise<any>;
export declare type Discard = (error: any, action: OfflineAction, retries: number) => boolean;
export interface Options extends Partial<Config> {
    middleware: Middleware[];
    storage?: any;
    dataIdFromObject: (obj: any) => string | null;
}
export declare const createOfflineStore: ({ middleware, persistCallback, storage, dataIdFromObject, ...offlineConfig }: Options) => Store<any>;
