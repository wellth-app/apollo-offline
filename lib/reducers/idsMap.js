"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.idsMap = void 0;
const resetState_1 = require("actions/resetState");
const queueOperation_1 = require("../actions/queueOperation");
const queueOperationCommit_1 = require("../actions/queueOperationCommit");
const saveServerId_1 = require("../actions/saveServerId");
const utils_1 = require("../utils");
const InitialState = {};
exports.idsMap = (state = InitialState, action, dataIdFromObject) => {
    const { type, payload = {} } = action;
    const { optimisticResponse } = payload;
    switch (type) {
        case queueOperation_1.QUEUE_OPERATION: {
            const ids = utils_1.getIds(dataIdFromObject, optimisticResponse);
            const entries = Object.values(ids).reduce((map, id) => {
                return Object.assign(Object.assign({}, map), { [id]: null });
            }, {});
            return Object.assign(Object.assign({}, state), entries);
        }
        case queueOperationCommit_1.QUEUE_OPERATION_COMMIT: {
            const { remainingMutations } = action;
            return remainingMutations ? state : {};
        }
        case saveServerId_1.SAVE_SERVER_ID: {
            const { data } = payload;
            const oldIds = utils_1.getIds(dataIdFromObject, optimisticResponse);
            const newIds = utils_1.getIds(dataIdFromObject, data);
            return Object.assign(Object.assign({}, state), utils_1.mapIds(oldIds, newIds));
        }
        case resetState_1.RESET_STATE:
            return InitialState;
        default:
            return state;
    }
};
exports.default = exports.idsMap;
//# sourceMappingURL=idsMap.js.map