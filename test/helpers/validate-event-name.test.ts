import { describe, expect, it } from "vitest";
import { validateEventName } from "../../src/helpers/validate-event-name.js";

describe("validateEventName", () => {
  it("validates 'push'", () => {
    validateEventName("push");
  });

  it("throws on invalid event name data type", () => {
    expect(() => validateEventName(1)).toThrowError(
      Error(`Invalid event name`),
    );
  });

  it("throws on invalid event name", () => {
    expect(() => validateEventName("invalid")).toThrowError(
      Error(`Invalid event name`),
    );
  });
});
