import { once } from "node:events";
import { createServer } from "node:http";
import Stream from "node:stream";

import express from "express";
import getPort from "get-port";
import { describe, expect, test } from "vitest";

import { pino } from "pino";
import type { Options } from "pino-http";

import { getLoggingMiddleware } from "../../src/server/logging-middleware.js";

describe("logging", () => {
  function streamLogsToOutput(target: any[]) {
    return new Stream.Writable({
      objectMode: true,
      write(object, _encoding, done) {
        target.push(JSON.parse(object));
        done();
      },
    });
  }

  function instantiateServer(output: string[], options = {} as Options) {
    const app = express();
    const logger = pino(streamLogsToOutput(output));

    app.use(express.json());
    app.use(getLoggingMiddleware(logger, options));
    app.get("/", (_req, res) => {
      res.set("X-Test-Header", "testing");
      res.send("OK");
    });
    app.post("/", (_req, res) => {
      res.send("OK");
    });

    const server = createServer(app);
    return server;
  }

  test("logs requests and responses", async () => {
    const output: any[] = [];
    const server = instantiateServer(output);

    const port = await getPort();

    server.listen(port);

    await once(server, "listening");

    const response = await fetch(`http://localhost:${port}/`, {
      method: "GET",
      headers: {
        "accept-encoding": "gzip, deflate",
        connection: "close",
      },
      keepalive: false,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-test-header")).toEqual("testing");
    expect(response.headers.get("content-type")).toEqual(
      "text/html; charset=utf-8",
    );

    expect(output[0].req.id).toBeTruthy();
    expect(typeof output[0].responseTime).toEqual("number");

    expect(output[0].req.headers["accept-encoding"]).toEqual("gzip, deflate");
    expect(output[0].req.headers.connection).toEqual("close");
    expect(output[0].req.url).toEqual("/");

    server.close();
  });

  test("uses supplied X-Request-ID", async () => {
    const output: any[] = [];
    const server = instantiateServer(output);

    const port = await getPort();

    server.listen(port);

    await once(server, "listening");

    const response = await fetch(`http://localhost:${port}/`, {
      method: "GET",
      headers: {
        "accept-encoding": "gzip, deflate",
        connection: "close",
        "X-Request-ID": "42",
      },
    });

    expect(response.status).toBe(200);
    expect(output[0].req.id).toEqual("42");

    server.close();
  });

  test("uses X-GitHub-Delivery", async () => {
    const output: any[] = [];
    const server = instantiateServer(output);

    const port = await getPort();

    server.listen(port);

    await once(server, "listening");

    const response = await fetch(`http://localhost:${port}/`, {
      method: "GET",
      headers: {
        "accept-encoding": "gzip, deflate",
        connection: "close",
        "X-GitHub-Delivery": "a-b-c",
      },
    });

    expect(response.status).toBe(200);
    expect(output[0].req.id).toEqual("a-b-c");
    expect(output[0].req.headers["x-github-delivery"]).toEqual("a-b-c");

    server.close();
  });

  test("sets ignorePaths option to ignore logging", async () => {
    const output: any[] = [];
    const server = instantiateServer(output, {
      autoLogging: {
        ignore: (req) => ["/"].includes(req.url!),
      },
    });

    const port = await getPort();

    server.listen(port);

    await once(server, "listening");

    const response = await fetch(`http://localhost:${port}/`, {
      method: "GET",
      headers: {
        "accept-encoding": "gzip, deflate",
        connection: "close",
      },
    });

    expect(response.status).toBe(200);
    expect(output.length).toEqual(0);

    server.close();
  });
});
