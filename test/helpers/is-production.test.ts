import { describe, expect, it } from "vitest";
import { isProduction } from "../../src/helpers/is-production.js";

describe("isProduction", () => {
  it("returns true if the NODE_ENV is set to production", () => {
    const previous = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      expect(isProduction()).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  [undefined, "dev", "test", ""].forEach((value) => {
    it(`returns false if the NODE_ENV is set to ${value}`, () => {
      const previous = process.env.NODE_ENV;
      try {
        if (value === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = value;
        expect(isProduction()).toBe(false);
      } finally {
        if (previous === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previous;
      }
    });
  });
});
