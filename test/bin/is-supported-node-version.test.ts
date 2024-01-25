import { describe, it, expect } from "vitest";

import { isSupportedNodeVersion } from "../../src/helpers/is-supported-node-version.js";
import { loadPackageJson } from "../../src/helpers/load-package-json.js";

describe("isSupportedNodeVersion", () => {
  const { engines } = loadPackageJson();
  it(`engines value is set to ">=18"`, () => {
    expect(engines!.node).toBe(">=18");
  });

  it("returns true if node is bigger or equal v18", () => {
    expect(isSupportedNodeVersion("18.0.0")).toBe(true);
    expect(isSupportedNodeVersion("19.0.0")).toBe(true);
    expect(isSupportedNodeVersion("20.0.0")).toBe(true);
    expect(isSupportedNodeVersion("21.0.0")).toBe(true);
  });

  it("returns false if node is smaller than v18", () => {
    expect(isSupportedNodeVersion("17.0.0")).toBe(false);
    expect(isSupportedNodeVersion("17.9.0")).toBe(false);
    expect(isSupportedNodeVersion("17.9.9")).toBe(false);
  });
});
