import { Config, OfflineAction } from "@redux-offline/redux-offline/lib/types";
export declare type Discard = Config["discard"];
export declare const discard: (discardCondition: (error: any, action: OfflineAction, retries: number) => boolean, callback: (error: any) => void) => (error: any, action: OfflineAction, retries: number) => boolean;
export default discard;
