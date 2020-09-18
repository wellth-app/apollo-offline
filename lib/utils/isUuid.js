"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUuid = void 0;
exports.isUuid = (val) => {
    const expression = new RegExp(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, "i");
    return typeof val === "string" && expression.exec(val).length > 0;
};
exports.default = exports.isUuid;
//# sourceMappingURL=isUuid.js.map