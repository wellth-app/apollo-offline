"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUuid = exports.uuidRegex = void 0;
exports.uuidRegex = new RegExp(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, "i");
exports.isUuid = (val) => {
    const matches = exports.uuidRegex.exec(val) || [];
    const hasMatches = matches && matches.length > 0;
    return typeof val === "string" && hasMatches;
};
exports.default = exports.isUuid;
//# sourceMappingURL=isUuid.js.map