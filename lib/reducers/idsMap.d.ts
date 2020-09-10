declare type IdsMapState = {
    [key: string]: string;
};
export declare const idsMap: (state: IdsMapState, action: any, dataIdFromObject: any) => IdsMapState;
export default idsMap;
