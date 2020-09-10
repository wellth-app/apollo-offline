import { AnyAction } from "redux";
import { OfflineSyncMetadataState } from "../cache";
export declare const offlineEffect: (dataIdFromObject: any) => (state: OfflineSyncMetadataState, action: AnyAction) => OfflineSyncMetadataState;
export default offlineEffect;
