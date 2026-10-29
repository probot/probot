import { describe, expect, it, vi } from "vitest";

import { pingHandler } from "../../../src/server/handlers/ping.js";

describe("pingHandler", () => {
  it("ignores a GET request without a URL", () => {
    const response = { writeHead: vi.fn(), end: vi.fn() } as any;

    expect(pingHandler({ method: "GET" } as any, response)).toBe(false);
    expect(response.writeHead).not.toHaveBeenCalled();
  });
});
