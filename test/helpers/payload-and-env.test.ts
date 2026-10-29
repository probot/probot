import { PassThrough } from "node:stream";
import type { IncomingMessage } from "node:http";

import { describe, expect, it } from "vitest";

import {
  getPayload,
  getPayloadFromRequestStream,
} from "../../src/helpers/get-payload.js";
import { loadEnv } from "../../src/helpers/load-env.js";

type FrameworkRequest = IncomingMessage & {
  body?: unknown;
  rawBody?: Uint8Array;
};

describe("getPayload", () => {
  it("decodes a raw body supplied by a framework", async () => {
    const request: FrameworkRequest = {
      body: {},
      rawBody: new TextEncoder().encode("raw payload"),
    } as FrameworkRequest;

    await expect(getPayload(request)).resolves.toBe("raw payload");
  });

  it("returns a string body supplied by a framework", async () => {
    const request = { body: "string payload" } as FrameworkRequest;

    await expect(getPayload(request)).resolves.toBe("string payload");
  });

  it("reads a normal request stream", async () => {
    const request = new PassThrough();
    const payload = getPayload(request as unknown as IncomingMessage);
    request.end(Buffer.from("stream payload"));

    await expect(payload).resolves.toBe("stream payload");
  });

  it("rejects when the request stream fails", async () => {
    const request = new PassThrough();
    const payload = getPayloadFromRequestStream(
      request as unknown as IncomingMessage,
    );
    request.emit("error", new Error("stream failed"));

    await expect(payload).rejects.toMatchObject({ message: "stream failed" });
  });
});

describe("loadEnv", () => {
  it("parses an env file", () => {
    expect(loadEnv({ path: "test/fixtures/payload-and-env.env" })).toEqual({
      API_URL: "https://example.test",
      EMPTY_VALUE: "",
    });
  });

  it("returns an empty object for a missing env file", () => {
    expect(loadEnv({ path: "test/fixtures/missing.env" })).toEqual({});
  });

  it("rethrows filesystem errors other than missing files", () => {
    expect(() => loadEnv({ path: process.cwd() })).toThrow();
  });
});
