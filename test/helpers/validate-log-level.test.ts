import { describe, expect, it } from "vitest";
import { validateLogLevel } from "../../src/helpers/validate-log-level.js";

describe("validateLogLevel", () => {
  it("validates 'trace'", () => {
    validateLogLevel("trace");
  });

  it("validates 'debug'", () => {
    validateLogLevel("debug");
  });

  it("validates 'info'", () => {
    validateLogLevel("info");
  });

  it("validates 'warn'", () => {
    validateLogLevel("warn");
  });

  it("validates 'error'", () => {
    validateLogLevel("error");
  });

  it("validates 'fatal'", () => {
    validateLogLevel("fatal");
  });

  it("throws on invalid log level data type", () => {
    try {
      validateLogLevel(1);
      throw new Error("Expected an error to be thrown");
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      expect((error as Error).message).toBe("Invalid log level");
    }
  });

  it("throws on invalid log level", () => {
    try {
      validateLogLevel("invalid");
      throw new Error("Expected an error to be thrown");
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      expect((error as Error).message).toBe("Invalid log level");
    }
  });
});
