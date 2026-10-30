import { describe, it, expect } from "vitest";

import {
  detectRuntime,
  type GlobalThis,
} from "../../src/helpers/detect-runtime.js";

describe("detectRuntime", () => {
  it("returns 'node' if node is detected", () => {
    expect(detectRuntime({ process: { versions: { node: "20.17.0" } } })).toBe(
      "node",
    );
  });

  it("returns 'deno' if deno is detected", () => {
    expect(detectRuntime({ process: { versions: { deno: "1.0.0" } } })).toBe(
      "deno",
    );
    expect(
      detectRuntime({
        process: { versions: { deno: "1.0.0", node: "20.17.0" } },
      }),
    ).toBe("deno");
  });

  it("returns 'bun' if bun is detected", () => {
    expect(
      detectRuntime({
        process: { versions: { bun: "1.0.0", node: "20.17.0" } },
      }),
    ).toBe("bun");
  });

  it("returns 'browser' if browser is detected", () => {
    expect(detectRuntime({ window: {} })).toBe("browser");
  });

  it("throws when process versions has no known runtime", () => {
    expect(() => detectRuntime({ process: { versions: {} } })).toThrow(
      "Unable to detect runtime",
    );
  });

  [{}, null, { process: null }, { process: { versions: null } }].forEach(
    (value) => {
      it(`throws an error if runtime cannot be detected - ${JSON.stringify(value)}`, () => {
        expect(() => detectRuntime(value as unknown as GlobalThis)).toThrow(
          "Unable to detect runtime",
        );
      });
    },
  );
});
