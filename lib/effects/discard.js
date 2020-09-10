"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_utilities_1 = require("apollo-client/node_modules/apollo-link/node_modules/apollo-utilities");
const utils_1 = require("../utils");
const logger = utils_1.rootLogger.extend("discard-effect");
const ERROR_STATUS_CODE = 400;
const shouldDiscard = (error, action, retries, discardCondition) => {
    const { graphQLErrors = [], networkError, permanent } = error;
    if (graphQLErrors.length) {
        logger("Discarding action due to GraphQL errors", action, graphQLErrors);
        return true;
    }
    if (networkError && networkError.statusCode >= ERROR_STATUS_CODE) {
        logger("Discarding action due to >= 400 status code", action, networkError);
        return true;
    }
    return permanent || discardCondition(error, action, retries);
};
exports.discard = (discardCondition, callback) => (error, action, retries) => {
    const discardResult = shouldDiscard(error, action, retries, discardCondition);
    if (discardResult) {
        if (typeof callback === "function") {
            apollo_utilities_1.tryFunctionOrLogError(() => {
                callback(error);
            });
        }
    }
    return discardResult;
};
exports.default = exports.discard;
//# sourceMappingURL=discard.js.map