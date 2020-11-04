export const uuidRegex = new RegExp(
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
  "i",
);

export const isUuid = (val: any): boolean => {
  const matches = uuidRegex.exec(val) || [];
  const hasMatches = matches && matches.length > 0;
  return typeof val === "string" && hasMatches;
};

export default isUuid;
