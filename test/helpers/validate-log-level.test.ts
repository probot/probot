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

  it("validates 'silent'", () => {
    validateLogLevel("silent");
  });

  it("throws on invalid log level data type", () => {
    expect(() => validateLogLevel(1)).toThrow("Invalid log level");
  });

  it("throws on invalid log level", () => {
    expect(() => validateLogLevel("invalid")).toThrow("Invalid log level");
  });
});
