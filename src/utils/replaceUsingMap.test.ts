import { replaceUsingMap } from "./replaceUsingMap";

describe("replaceUsingMap", () => {
  it("replaces expected values", () => {
    /// Create a map that replaces 'aaa' with 'zzz'
    const map = {
      aaa: "zzz",
    };

    const source = {
      customMutation: {
        id: "aaa",
      },
    };

    const expected = {
      customMutation: {
        id: "zzz",
      },
    };

    expect(replaceUsingMap(source, map)).toEqual(expected);
  });

  it("replaces in array values", () => {
    const map = {
      aaa: "bbb",
    };

    const source = {
      myMutation: {
        ids: ["aaa"],
      },
    };

    const expected = {
      myMutation: {
        ids: ["bbb"],
      },
    };

    expect(replaceUsingMap(source, map)).toEqual(expected);
  });

  it("replaces in array values (awslabs/aws-mobile-appsync-sdk-js#229)", () => {
    const map = {
      "aaa-123": "bbb-456",
    };

    const source = {
      myMutation: {
        ids: ["aaa-123"],
      },
    };

    const expected = {
      myMutation: {
        ids: ["bbb-456"],
      },
    };

    expect(replaceUsingMap(source, map)).toEqual(expected);
  });

  it("replaces deeply nested", () => {
    const map = {
      aaa: "bbb",
    };

    const source = {
      myMutation: {
        someField1: {
          someField2: {
            id: "aaa",
          },
        },
      },
    };

    const expected = {
      myMutation: {
        someField1: {
          someField2: {
            id: "bbb",
          },
        },
      },
    };

    expect(replaceUsingMap(source, map)).toEqual(expected);
  });

  it("replaces multiple occurences", () => {
    const map = {
      aaa: "bbb",
    };

    const source = {
      myMutation: {
        id: "aaa",
        someOtherField: "aaa",
      },
    };

    const expected = {
      myMutation: {
        id: "bbb",
        someOtherField: "bbb",
      },
    };

    expect(replaceUsingMap(source, map)).toEqual(expected);
  });

  ["", null, undefined, false].forEach((testCase) => {
    test("it doesn't replace on falsy values (" + testCase + ")", () => {
      const map = {};

      const source = testCase;
      const expected = source;

      expect(replaceUsingMap(source, map)).toEqual(expected);
    });
  });
});
