import { DocumentNode, OperationDefinitionNode, FieldNode } from "graphql";
import { resultKeyNameFromField } from "apollo-utilities";

export * from "./replaceUsingMap";
export * from "./getIds";
export * from "./mapIds";
export * from "./intersectingKeys";
export * from "./isUuid";
export * from "./isOptimistic";

export { default as rootLogger } from "./logger";

export const getOperationFieldName = (operation: DocumentNode): string =>
  resultKeyNameFromField(
    (operation.definitions[0] as OperationDefinitionNode).selectionSet
      .selections[0] as FieldNode,
  );
