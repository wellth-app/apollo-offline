"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getIds_1 = require("./getIds");
const cache_1 = require("../cache");
const uuid_1 = require("uuid");
describe("getIds", () => {
    it("returns an id from a simple object", () => {
        const id = uuid_1.v4();
        const source = {
            operationName: {
                id,
                __typename: "someType",
            },
        };
        const expected = {
            operationName: id,
        };
        expect(getIds_1.getIds(cache_1.defaultDataIdFromObject, source)).toEqual(expected);
    });
    it("doesn't return ids that are not uuids", () => {
        const invalidId = "not-a-valid-id";
        const source = {
            operationName: {
                __typename: "someType",
                id: invalidId,
            },
        };
        expect(getIds_1.getIds(cache_1.defaultDataIdFromObject, source)).toEqual({});
    });
    it("returns empty when no ids are present", () => {
        const source = {
            operationName: {
                __typename: "someType",
                field: uuid_1.v4(),
            },
        };
        expect(getIds_1.getIds(cache_1.defaultDataIdFromObject, source)).toEqual({});
    });
    it("returns a nested id from an object", () => {
        const id = uuid_1.v4();
        const source = {
            operationName: {
                __typename: "someType",
                field: {
                    __typename: "someField",
                    id,
                },
            },
        };
        const expected = {
            "operationName.field": id,
        };
        expect(getIds_1.getIds(cache_1.defaultDataIdFromObject, source)).toEqual(expected);
    });
    it("returns nested ids from an object", () => {
        const id = uuid_1.v4();
        const nestedId = uuid_1.v4();
        const source = {
            operationName: {
                __typename: "someType",
                id,
                field: {
                    __typename: "someField",
                    id: nestedId,
                },
            },
        };
        const expected = {
            operationName: id,
            "operationName.field": nestedId,
        };
        expect(getIds_1.getIds(cache_1.defaultDataIdFromObject, source)).toEqual(expected);
    });
    it("doesn't return ids from arrays", () => {
        const id = uuid_1.v4();
        const nestedId = uuid_1.v4();
        const source = {
            operationName: {
                __typename: "someType",
                id,
                field: {
                    __typename: "someField",
                    id: nestedId,
                    arrayField: [uuid_1.v4(), uuid_1.v4(), uuid_1.v4(), uuid_1.v4()],
                },
            },
        };
        const expected = {
            operationName: id,
            "operationName.field": nestedId,
        };
        expect(getIds_1.getIds(cache_1.defaultDataIdFromObject, source)).toEqual(expected);
    });
    it("returns ids using a custom dataIdFromObject", () => {
        const id = uuid_1.v4();
        const fieldId = uuid_1.v4();
        const embeddedFieldId = uuid_1.v4();
        const source = {
            operationName: {
                __typename: "someType",
                customIdField: id,
                field: {
                    __typename: "someField",
                    customIdField: fieldId,
                },
                embeddedField: {
                    customIdField: embeddedFieldId,
                },
            },
        };
        const expected = {
            operationName: id,
            "operationName.field": fieldId,
            "operationName.embeddedField": embeddedFieldId,
        };
        const dataIdFromObject = ({ customIdField }) => `${customIdField}`;
        expect(getIds_1.getIds(dataIdFromObject, source)).toEqual(expected);
    });
});
//# sourceMappingURL=getIds.test.js.map