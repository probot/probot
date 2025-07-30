import { describe, it, expect } from "vitest";

import { isSupportedRuntime } from "../../src/helpers/is-supported-runtime.js";
import { loadPackageJson } from "../../src/helpers/load-package-json.js";

describe("isSupportedRuntime", () => {
  const { engines } = loadPackageJson();
  it(`engines value is set to "^20.18.1 || >= 22"`, () => {
    expect(engines!.node).toBe("^20.18.1 || >= 22");
  });

  it("returns true if node is bigger or equal v20.18.1 or v22", () => {
    expect(
      isSupportedRuntime({ process: { versions: { node: "20.18.1" } } }),
    ).toBe(true);
    expect(
      isSupportedRuntime({ process: { versions: { node: "22.0.0" } } }),
    ).toBe(true);
    expect(
      isSupportedRuntime({ process: { versions: { node: "23.0.0" } } }),
    ).toBe(true);
  });

  it("returns false if node is smaller than v20.18.1 or v22.0.0", () => {
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

  it("returns true if bun is bigger or equal v1.2.0", () => {
    expect(
      isSupportedRuntime({ process: { versions: { bun: "1.2.0" } } }),
    ).toBe(true);
    expect(
      isSupportedRuntime({ process: { versions: { bun: "1.2.14" } } }),
    ).toBe(true);
    expect(
      isSupportedRuntime({ process: { versions: { bun: "1.3.0" } } }),
    ).toBe(true);
    expect(
      isSupportedRuntime({ process: { versions: { bun: "2.0.0" } } }),
    ).toBe(true);
  });

  it("returns false if bun is smaller than v1.2.0", () => {
    expect(
      isSupportedRuntime({ process: { versions: { bun: "1.0.0" } } }),
    ).toBe(false);
    expect(
      isSupportedRuntime({ process: { versions: { bun: "1.1.0" } } }),
    ).toBe(false);
    expect(
      isSupportedRuntime({ process: { versions: { bun: "0.9.0" } } }),
    ).toBe(false);
  });

  it("returns true if deno is bigger or equal v2.3.0", () => {
    expect(
      isSupportedRuntime({ process: { versions: { deno: "2.3.0" } } }),
    ).toBe(true);
    expect(
      isSupportedRuntime({ process: { versions: { deno: "2.3.14" } } }),
    ).toBe(true);
    expect(
      isSupportedRuntime({ process: { versions: { deno: "3.0.0" } } }),
    ).toBe(true);
  });

  it("returns false if deno is smaller than v2.3.0", () => {
    expect(
      isSupportedRuntime({ process: { versions: { deno: "2.2.0" } } }),
    ).toBe(false);
    expect(
      isSupportedRuntime({ process: { versions: { deno: "1.1.0" } } }),
    ).toBe(false);
    expect(
      isSupportedRuntime({ process: { versions: { deno: "0.9.0" } } }),
    ).toBe(false);
  });

  it("returns false if runtime is deno or browser", () => {
    expect(
      isSupportedRuntime({ process: { versions: { deno: "1.0.0" } } }),
    ).toBe(false);
    expect(isSupportedRuntime({ window: {} })).toBe(false);
  });
});
