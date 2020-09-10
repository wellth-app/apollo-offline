import { Config, OfflineAction } from "@redux-offline/redux-offline/lib/types";
import { tryFunctionOrLogError } from "apollo-client/node_modules/apollo-link/node_modules/apollo-utilities";
import { rootLogger } from "../utils";

const logger = rootLogger.extend("discard-effect");

export type Discard = Config["discard"];

const ERROR_STATUS_CODE = 400;

const shouldDiscard = (
  error: any,
  action: OfflineAction,
  retries: number,
  discardCondition: Discard,
): boolean => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { graphQLErrors = [], networkError, permanent } = error;

  // If there are GraphQL errors, discard the request
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (graphQLErrors.length) {
    logger("Discarding action due to GraphQL errors", action, graphQLErrors);
    return true;
  }

  // If the network error status code >= 400, discard the request
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (networkError && networkError.statusCode >= ERROR_STATUS_CODE) {
    logger("Discarding action due to >= 400 status code", action, networkError);
    return true;
  }

  // If the error is permanent or the consumer says so, discard the request
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return permanent || discardCondition(error, action, retries);
};

export const discard = (
  discardCondition: Discard,
  callback: (error: any) => void,
): Discard => (error: any, action: OfflineAction, retries: number) => {
  const discardResult = shouldDiscard(error, action, retries, discardCondition);

  if (discardResult) {
    // Call observer
    // const {
    //   meta: {
    //     offline: {
    //       effect: { observer },
    //     },
    //   },
    // } = action;

    // if (observer && !observer.closed) {
    //   observer.error(error);
    // }

    // Call global error callback
    if (typeof callback === "function") {
      tryFunctionOrLogError(() => {
        callback(error);
      });
    }
  }

  return discardResult;
};

export default discard;
