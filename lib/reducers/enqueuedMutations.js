"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resetState_1 = require("../actions/resetState");
const queueOperation_1 = require("../actions/queueOperation");
const queueOperationCommit_1 = require("../actions/queueOperationCommit");
const queueOperationRollback_1 = require("../actions/queueOperationRollback");
const InitialState = 0;
const enqueuedMutations = (state = InitialState, { type }) => {
    switch (type) {
        case queueOperation_1.QUEUE_OPERATION:
            return state + 1;
        case queueOperationCommit_1.QUEUE_OPERATION_COMMIT:
        case queueOperationRollback_1.QUEUE_OPERATION_ROLLBACK:
            return state - 1;
        case resetState_1.RESET_STATE:
            return InitialState;
        default:
            return state;
    }
};
exports.default = enqueuedMutations;
//# sourceMappingURL=enqueuedMutations.js.map