"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_link_1 = require("apollo-link");
exports.default = (operation, forward) => !!forward ? forward(operation) : apollo_link_1.Observable.of();
//# sourceMappingURL=passthrough.js.map