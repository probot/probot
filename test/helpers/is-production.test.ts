import { describe, expect, it } from "vitest";
import { isProduction } from "../../src/helpers/is-production.js";

describe("isProduction", () => {
  it("returns true if the NODE_ENV is set to production", () => {
    process.env.NODE_ENV = "production";
    expect(isProduction()).toBe(true);
  });

  [undefined, "dev", "test", ""].forEach((value) => {
    it(`returns false if the NODE_ENV is set to ${value}`, () => {
      process.env.NODE_ENV = value;
      expect(isProduction()).toBe(false);
    });
  });
});
