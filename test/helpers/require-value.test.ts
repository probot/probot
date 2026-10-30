import { describe, expect, it } from "vitest";

import { requireValue } from "../../src/helpers/require-value.js";

describe("requireValue", () => {
  it("returns defined values", () => {
    expect(requireValue("value", "missing value")).toBe("value");
  });

  it.each([null, undefined])("throws for %s", (value) => {
    expect(() => requireValue(value, "missing value")).toThrow("missing value");
  });
});
