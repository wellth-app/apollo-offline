export const IS_OPTIMISTIC_KEY =
  typeof Symbol !== "undefined" ? Symbol("isOptimistic") : "@@isOptimistic";

export const isOptimistic = (obj: unknown): boolean | undefined =>
  typeof obj[IS_OPTIMISTIC_KEY] !== undefined
    ? (obj[IS_OPTIMISTIC_KEY] as boolean)
    : undefined;

export default isOptimistic;
