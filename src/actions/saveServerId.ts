export const SAVE_SERVER_ID = "SAVE_SERVER_ID";

export default (optimisticResponse: any, data: any) => ({
  type: SAVE_SERVER_ID,
  payload: { data, optimisticResponse },
});
