"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discard = void 0;
const apollo_utilities_1 = require("apollo-utilities");
const utils_1 = require("../utils");
const logger = utils_1.rootLogger.extend("discard-effect");
const ERROR_STATUS_CODE = 400;
const shouldDiscard = (error, action, retries, discardCondition) => __awaiter(void 0, void 0, void 0, function* () {
    const { graphQLErrors = [], networkError, permanent } = error;
    if (graphQLErrors.length) {
        logger("Discarding action due to GraphQL errors", action, graphQLErrors);
        return true;
    }
    if (networkError && networkError.statusCode >= ERROR_STATUS_CODE) {
        logger("Discarding action due to >= 400 status code", action, networkError);
        return true;
    }
    const clientDiscard = yield discardCondition(error, action, retries);
    return permanent || clientDiscard;
});
exports.discard = (discardCondition, callback) => (error, action, retries) => __awaiter(void 0, void 0, void 0, function* () {
    const discardResult = yield shouldDiscard(error, action, retries, discardCondition);
    if (discardResult) {
        const { meta: { offline: { effect }, }, } = action;
        const { observer } = effect;
        if (observer && !observer.closed) {
            observer.error(error);
        }
        if (typeof callback === "function") {
            apollo_utilities_1.tryFunctionOrLogError(() => {
                callback(error);
            });
        }
    }
    return discardResult;
});
exports.default = exports.discard;
//# sourceMappingURL=discard.js.map