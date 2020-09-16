"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const queueOperation_1 = require("../actions/queueOperation");
const queueOperationCommit_1 = require("../actions/queueOperationCommit");
const queueOperationRollback_1 = require("../actions/queueOperationRollback");
const enqueuedMutations = (state = 0, { type }) => {
    switch (type) {
        case queueOperation_1.QUEUE_OPERATION:
            return state + 1;
        case queueOperationCommit_1.QUEUE_OPERATION_COMMIT:
        case queueOperationRollback_1.QUEUE_OPERATION_ROLLBACK:
            return state - 1;
        default:
            return state;
    }
};
exports.default = enqueuedMutations;
//# sourceMappingURL=enqueuedMutations.js.map