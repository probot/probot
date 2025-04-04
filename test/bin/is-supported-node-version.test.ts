import { describe, it, expect } from "vitest";

import { isSupportedNodeVersion } from "../../src/helpers/is-supported-node-version.js";
import { loadPackageJson } from "../../src/helpers/load-package-json.js";

describe("isSupportedNodeVersion", () => {
  const { engines } = loadPackageJson();
  it(`engines value is set to "^20.17 || >= 22"`, () => {
    expect(engines!.node).toBe("^20.17 || >= 22");
  });

  it("returns true if node is bigger or equal v20.17 or v22", () => {
    expect(isSupportedNodeVersion("20.17.0")).toBe(true);
    expect(isSupportedNodeVersion("22.0.0")).toBe(true);
    expect(isSupportedNodeVersion("23.0.0")).toBe(true);
  });

  it("returns false if node is smaller than v20.17", () => {
    expect(isSupportedNodeVersion("17.0.0")).toBe(false);
    expect(isSupportedNodeVersion("17.9.0")).toBe(false);
    expect(isSupportedNodeVersion("17.9.9")).toBe(false);
    expect(isSupportedNodeVersion("18.0.0")).toBe(false);
    expect(isSupportedNodeVersion("20.16.9")).toBe(false);
    expect(isSupportedNodeVersion("21.0.0")).toBe(false);
  });
});
