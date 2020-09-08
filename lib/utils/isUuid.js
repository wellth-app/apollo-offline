"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUuid = (val) => typeof val === "string" &&
    val.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
exports.default = exports.isUuid;
//# sourceMappingURL=isUuid.js.map