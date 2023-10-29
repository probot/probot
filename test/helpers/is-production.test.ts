import { isProduction } from "../../src/helpers/is-production";

describe("isProduction", () => {
  it("returns true if the NODE_ENV is set to production", () => {
    process.env.NODE_ENV = "production";
    expect(isProduction()).toBe(true);
  });

  it.each([undefined, "dev", "test", ""])(
    "returns false if the NODE_ENV is set to %s",
    (value) => {
      process.env.NODE_ENV = value;
      expect(isProduction()).toBe(false);
    },
  );
});
