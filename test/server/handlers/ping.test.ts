import type { IncomingMessage, ServerResponse } from "node:http";

import { describe, expect, it, vi } from "vitest";

import { pingHandler } from "../../../src/server/handlers/ping.js";

describe("pingHandler", () => {
  it("ignores a GET request without a URL", () => {
    const response = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    expect(pingHandler({ method: "GET" } as IncomingMessage, response)).toBe(
      false,
    );
    expect(response.writeHead).not.toHaveBeenCalled();
  });
});
