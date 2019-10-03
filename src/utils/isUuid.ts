export const isUuid = (val: any) =>
  typeof val === "string" &&
  val.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

export default isUuid;
