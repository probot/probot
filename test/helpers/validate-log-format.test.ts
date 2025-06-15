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
    try {
      validateLogFormat(1);
      throw new Error("Should have thrown");
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      expect((error as Error).message).toBe("Invalid log format");
    }
  });

  it("throws on invalid format", () => {
    try {
      validateLogFormat("invalid");
      throw new Error("Should have thrown");
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      expect((error as Error).message).toBe("Invalid log format");
    }
  });
});
