import { describe, it, expect } from "vitest";

import { detectRuntime } from "../../src/helpers/detect-runtime.js";

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

  [{}, null, { process: null }, { process: { versions: null } }].forEach(
    (value) => {
      it(`throws an error if runtime cannot be detected - ${JSON.stringify(value)}`, () => {
        try {
          detectRuntime(value as any);
          throw new Error("Should have thrown");
        } catch (error) {
          expect(error instanceof Error).toBe(true);
          expect((error as Error).message).toBe("Unable to detect runtime");
        }
      });
    },
  );
});
