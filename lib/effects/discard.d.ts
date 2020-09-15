import { Config } from "@redux-offline/redux-offline/lib/types";
export declare type Discard = Config["discard"];
export declare const discard: (discardCondition: Discard, callback: (error: any) => void) => Discard;
export default discard;
