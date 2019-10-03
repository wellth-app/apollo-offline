"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAVE_SERVER_ID = "SAVE_SERVER_ID";
exports.default = (optimisticResponse, data) => ({
    type: exports.SAVE_SERVER_ID,
    payload: { data, optimisticResponse },
});
//# sourceMappingURL=saveServerId.js.map