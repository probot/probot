import { describe, expect, it } from "vitest";

import { MockLoggerTarget } from "./utils.js";

describe("MockLoggerTarget", () => {
  it("passes malformed log data to the stream callback", () => {
    const target = new MockLoggerTarget();
    let receivedError: Error | undefined;

    target._write("not JSON", "utf8", (error) => {
      receivedError = error ?? undefined;
    });

    expect(receivedError).toBeInstanceOf(Error);
  });
});
