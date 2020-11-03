import { v4 as uuid } from "uuid";
import { isUuid } from "./isUuid";

describe("isUuid", () => {
  it("returns true when a string is a valid uuid", () => {
    expect(isUuid(uuid())).toBe(true);
  });

  it("returns false when a string is not a uuid", () => {
    expect(isUuid("1234")).toBe(false);
    expect(isUuid("is-not-a-valid-id")).toBe(false);
  });
});
