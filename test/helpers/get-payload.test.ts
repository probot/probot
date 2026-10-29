import { PassThrough } from "node:stream";

import { describe, expect, it } from "vitest";

import {
  getPayload,
  getPayloadFromRequestStream,
} from "../../src/helpers/get-payload.js";

describe("getPayload", () => {
  it("decodes a raw Uint8Array body", async () => {
    const request = {
      body: {},
      rawBody: new TextEncoder().encode("raw body"),
    };

    await expect(getPayload(request as any)).resolves.toBe("raw body");
  });

  it("returns a string body unchanged", async () => {
    await expect(getPayload({ body: "string body" } as any)).resolves.toBe(
      "string body",
    );
  });

  it("reads and decodes the request stream", async () => {
    const request = new PassThrough();
    const result = getPayload(request as any);
    request.end(Buffer.from("stream body"));

    await expect(result).resolves.toBe("stream body");
  });

  it("returns an empty string for an empty request stream", async () => {
    const request = new PassThrough();
    const result = getPayload(request as any);
    request.end();

    await expect(result).resolves.toBe("");
  });

  it("ignores zero-length chunks", async () => {
    const listeners: Record<string, (...args: any[]) => void> = {};
    const request = {
      on(event: string, listener: (...args: any[]) => void) {
        listeners[event] = listener;
        return this;
      },
    };
    const result = getPayload(request as any);
    listeners.data(new Uint8Array(0));
    listeners.end();

    await expect(result).resolves.toBe("");
  });
});

describe("getPayloadFromRequestStream", () => {
  it("rejects when the request emits an error", async () => {
    const request = new PassThrough();
    const result = getPayloadFromRequestStream(request as any);
    request.emit("error", new Error("request failed"));

    await expect(result).rejects.toMatchObject({ message: "request failed" });
  });
});
