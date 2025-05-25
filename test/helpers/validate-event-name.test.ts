import { describe, expect, it } from "vitest";
import { validateEventName } from "../../src/helpers/validate-event-name.js";

describe("validateEventName", () => {
  it("validates 'push'", () => {
    validateEventName("push");
  });

  [null, undefined, {}, [], true, false, 1].forEach((value) => {
    it(`throws on invalid event name data type - ${JSON.stringify(value)}`, () => {
      try {
        validateEventName(value as any);
        throw new Error("Expected an error to be thrown");
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toBe("Invalid event name");
      }
    });
  });

  it('throws on invalid event name - "invalid"', () => {
    try {
      validateEventName("invalid");
      throw new Error("Expected an error to be thrown");
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      expect((error as Error).message).toBe("Invalid event name");
    }
  });
});
