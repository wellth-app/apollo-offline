import { getIds } from "./getIds";
import { defaultDataIdFromObject } from "../cache";
import { v4 as uuid } from "uuid";

describe("getIds", () => {
  it("returns an id from a simple object", () => {
    const id = uuid();
    const source = {
      operationName: {
        id,
        __typename: "someType",
      },
    };

    const expected = {
      operationName: id,
    };

    expect(getIds(defaultDataIdFromObject, source)).toEqual(expected);
  });

  it("doesn't return ids that are not uuids", () => {
    const invalidId = "not-a-valid-id";
    const source = {
      operationName: {
        __typename: "someType",
        id: invalidId,
      },
    };

    expect(getIds(defaultDataIdFromObject, source)).toEqual({});
  });

  it("returns empty when no ids are present", () => {
    const source = {
      operationName: {
        __typename: "someType",
        field: uuid(),
      },
    };

    expect(getIds(defaultDataIdFromObject, source)).toEqual({});
  });

  it("returns a nested id from an object", () => {
    const id = uuid();
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

    expect(getIds(defaultDataIdFromObject, source)).toEqual(expected);
  });

  it("returns nested ids from an object", () => {
    const id = uuid();
    const nestedId = uuid();
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

    expect(getIds(defaultDataIdFromObject, source)).toEqual(expected);
  });

  it("doesn't return ids from arrays", () => {
    const id = uuid();
    const nestedId = uuid();
    const source = {
      operationName: {
        __typename: "someType",
        id,
        field: {
          __typename: "someField",
          id: nestedId,
          arrayField: [uuid(), uuid(), uuid(), uuid()],
        },
      },
    };

    const expected = {
      operationName: id,
      "operationName.field": nestedId,
    };

    expect(getIds(defaultDataIdFromObject, source)).toEqual(expected);
  });

  it("returns ids using a custom dataIdFromObject", () => {
    const id = uuid();
    const fieldId = uuid();
    const embeddedFieldId = uuid();
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

    // The default implementation checks for "__typename" and "id", returning the value of "id".
    // Create a new implementation that only searches for "customIdField" and returns it's value.
    const dataIdFromObject = ({ customIdField }) => `${customIdField}`;

    expect(getIds(dataIdFromObject, source)).toEqual(expected);
  });
});
