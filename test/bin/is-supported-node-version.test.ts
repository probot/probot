import { describe, it, expect } from "vitest";

import { isSupportedRuntime } from "../../src/helpers/is-supported-runtime.js";
import { loadPackageJson } from "../../src/helpers/load-package-json.js";

describe("isSupportedNodeVersion", () => {
  const { engines } = loadPackageJson();
  it(`engines value is set to "^20.17 || >= 22"`, () => {
    expect(engines!.node).toBe("^20.17 || >= 22");
  });

  it("returns true if node is bigger or equal v20.17 or v22", () => {
    expect(
      isSupportedRuntime({ process: { versions: { node: "20.17.0" } } }),
    ).toBe(true);
    expect(
      isSupportedRuntime({ process: { versions: { node: "22.0.0" } } }),
    ).toBe(true);
    expect(
      isSupportedRuntime({ process: { versions: { node: "23.0.0" } } }),
    ).toBe(true);
  });

  it("returns false if node is smaller than v20.17", () => {
    expect(
      isSupportedRuntime({ process: { versions: { node: "17.0.0" } } }),
    ).toBe(false);
    expect(
      isSupportedRuntime({ process: { versions: { node: "17.9.0" } } }),
    ).toBe(false);
    expect(
      isSupportedRuntime({ process: { versions: { node: "17.9.9" } } }),
    ).toBe(false);
    expect(
      isSupportedRuntime({ process: { versions: { node: "18.0.0" } } }),
    ).toBe(false);
    expect(
      isSupportedRuntime({ process: { versions: { node: "20.16.9" } } }),
    ).toBe(false);
    expect(
      isSupportedRuntime({ process: { versions: { node: "21.0.0" } } }),
    ).toBe(false);
  });

  it("returns false if runtime is bun, deno or browser", () => {
    expect(
      isSupportedRuntime({ process: { versions: { bun: "1.0.0" } } }),
    ).toBe(false);
    expect(
      isSupportedRuntime({ process: { versions: { deno: "1.0.0" } } }),
    ).toBe(false);
    expect(isSupportedRuntime({ window: {} })).toBe(false);
  });
});
