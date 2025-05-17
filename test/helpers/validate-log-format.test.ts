import { describe, expect, it } from "vitest";
import { validateLogFormat } from "../../src/helpers/validate-log-format.js";

describe("validateLogFormat", () => {
  it("validates 'pretty'", () => {
    validateLogFormat("pretty");
  });

  it("validates 'json'", () => {
    validateLogFormat("json");
  });

  it("throws on invalid file type", () => {
    expect(() => validateLogFormat(1)).toThrowError(
      Error(`Invalid log format`),
    );
  });

  it("throws on invalid format", () => {
    expect(() => validateLogFormat("invalid")).toThrowError(
      Error(`Invalid log format`),
    );
  });
});
