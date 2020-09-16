export const isUuid = (val: any): boolean => {
  const expression = new RegExp(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    "i",
  );

  return typeof val === "string" && expression.exec(val).length > 0;
};

export default isUuid;
