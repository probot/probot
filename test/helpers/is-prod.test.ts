import { isProd } from "../../src/helpers/is-prod";

describe("isProd", () => {
  it("returns true if the NODE_ENV is set to production", () => {
    process.env.NODE_ENV = "production";
    expect(isProd()).toBe(true);
  });

  it.each([undefined, "dev", "test", ""])(
    "returns false if the NODE_ENV is set to %s",
    (value) => {
      process.env.NODE_ENV = value;
      expect(isProd()).toBe(false);
    }
  );
});
