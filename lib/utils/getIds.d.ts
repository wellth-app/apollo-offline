import { IdGetter } from "apollo-cache-inmemory";
export declare const getIds: (dataIdFromObject: IdGetter, obj: any, path?: string, acc?: {}) => {
    [key: string]: string;
};
export default getIds;
