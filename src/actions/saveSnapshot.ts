export const SAVE_SNAPSHOT = "SAVE_SNAPSHOT";

export default (cache) => ({
  type: SAVE_SNAPSHOT,
  payload: { cache },
});
