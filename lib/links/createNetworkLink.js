"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_link_1 = require("apollo-link");
const offline_1 = require("../links/offline");
exports.createNetworkLink = (_a) => {
    var { offlineLink, onlineLink, disableOffline } = _a, offlineLinkOptions = __rest(_a, ["offlineLink", "onlineLink", "disableOffline"]);
    return apollo_link_1.ApolloLink.from([
        offlineLink,
        disableOffline ? null : new offline_1.default(offlineLinkOptions),
        onlineLink,
    ].filter(Boolean));
};
exports.default = exports.createNetworkLink;
//# sourceMappingURL=createNetworkLink.js.map