import { DocumentNode, OperationDefinitionNode, FieldNode } from "graphql";
import { resultKeyNameFromField } from "apollo-utilities";
export * from "./replaceUsingMap";
export * from "./getIds";
export * from "./mapIds";
export * from "./intersectingKeys";
export * from "./isUuid";

export { default as rootLogger } from "./logger";

export const isUuid = (val: any) =>
  typeof val === "string" &&
  val.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

export const getOperationFieldName = (operation: DocumentNode): string =>
  resultKeyNameFromField((operation.definitions[0] as OperationDefinitionNode)
    .selectionSet.selections[0] as FieldNode);
