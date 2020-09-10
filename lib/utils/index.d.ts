import { DocumentNode } from "graphql";
export * from "./replaceUsingMap";
export * from "./getIds";
export * from "./mapIds";
export * from "./intersectingKeys";
export * from "./isUuid";
export { default as rootLogger } from "./logger";
export declare const isUuid: (val: any) => RegExpMatchArray;
export declare const getOperationFieldName: (operation: DocumentNode) => string;
