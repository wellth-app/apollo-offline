"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("@redux-offline/redux-offline/lib/constants");
exports.default = (state = false, action) => {
    switch (action.type) {
        case constants_1.PERSIST_REHYDRATE:
            return true;
        default:
            return state;
    }
};
//# sourceMappingURL=rehydrated.js.map