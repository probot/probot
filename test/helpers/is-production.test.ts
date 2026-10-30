import { describe, expect, it } from "vitest";
import { isProduction } from "../../src/helpers/is-production.js";

describe("isProduction", () => {
  it("uses process.env when no environment is supplied", () => {
    expect(isProduction()).toBe(process.env.NODE_ENV === "production");
  });

  it("returns true if the NODE_ENV is set to production", () => {
    expect(isProduction({ NODE_ENV: "production" })).toBe(true);
  });

  [undefined, "dev", "test", ""].forEach((value) => {
    it(`returns false if the NODE_ENV is set to ${value}`, () => {
      expect(isProduction({ NODE_ENV: value })).toBe(false);
    });
  });
});
