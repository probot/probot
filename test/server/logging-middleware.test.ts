import Stream from "node:stream";

import express from "express";
import request from "supertest";
import { pino } from "pino";
import type { Options } from "pino-http";
import { describe, expect, test, beforeEach } from "vitest";

import { getLoggingMiddleware } from "../../src/server/logging-middleware.js";

describe("logging", () => {
  let server: express.Express;
  let output: any[];
  let options: Options;

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, _encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };
  const logger = pino(streamLogsToOutput);

  function applyMiddlewares() {
    server.use(express.json());
    server.use(getLoggingMiddleware(logger, options));
    server.get("/", (_req, res) => {
      res.set("X-Test-Header", "testing");
      res.send("OK");
    });
    server.post("/", (_req, res) => res.send("OK"));
  }

  beforeEach(() => {
    server = express();
    output = [];
    options = {};
  });

  test("logs requests and responses", () => {
    applyMiddlewares();
    return request(server)
      .get("/")
      .expect(200)
      .expect((_res) => {
        // logs id with request and response
        expect(output[0].req.id).toBeTruthy();
        expect(typeof output[0].responseTime).toEqual("number");

        expect(output[0].req).toEqual(
          expect.objectContaining({
            headers: expect.objectContaining({
              "accept-encoding": "gzip, deflate",
              connection: "close",
            }),
            method: "GET",
            remoteAddress: "::ffff:127.0.0.1",
            url: "/",
          }),
        );

        expect(output[0].res).toEqual(
          expect.objectContaining({
            headers: expect.objectContaining({
              "x-test-header": "testing",
            }),
          }),
        );
      });
  });

  test("uses supplied X-Request-ID", () => {
    applyMiddlewares();
    return request(server)
      .get("/")
      .set("X-Request-ID", "42")
      .expect(200)
      .expect((_res) => {
        expect(output[0].req.id).toEqual("42");
      });
  });

  test("uses X-GitHub-Delivery", () => {
    applyMiddlewares();
    return request(server)
      .get("/")
      .set("X-GitHub-Delivery", "a-b-c")
      .expect(200)
      .expect((_res) => {
        expect(output[0].req.id).toEqual("a-b-c");
      });
  });

  test("sets ignorePaths option to ignore logging", () => {
    options = {
      autoLogging: {
        ignore: (req) => ["/"].includes(req.url!),
      },
    };
    applyMiddlewares();
    return request(server)
      .get("/")
      .expect(200)
      .expect((_res) => {
        expect(output.length).toEqual(0);
      });
  });
});
