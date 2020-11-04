import { OfflineAction } from "@redux-offline/redux-offline/lib/types";
export { OfflineAction };
export declare type Discard = (error: any, action: OfflineAction, retries: number) => Promise<boolean>;
export declare const discard: (discardCondition: Discard, callback: (error: any) => void) => Discard;
export default discard;
