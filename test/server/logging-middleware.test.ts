import Stream from "stream";

import express from "express";
import request from "supertest";
import pino from "pino";

import { getLoggingMiddleware } from "../../src/server/logging-middleware";

describe("logging", () => {
  let server: express.Express;
  let output: any[];

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };
  const logger = pino(streamLogsToOutput);

  beforeEach(() => {
    server = express();
    output = [];

    server.use(express.json());
    server.use(getLoggingMiddleware(logger));
    server.get("/", (req, res) => {
      res.set("X-Test-Header", "testing");
      res.send("OK");
    });
    server.post("/", (req, res) => res.send("OK"));
  });

  test("logs requests and responses", () => {
    return request(server)
      .get("/")
      .expect(200)
      .expect((res) => {
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
          })
        );

        expect(output[0].res).toEqual(
          expect.objectContaining({
            headers: expect.objectContaining({
              "x-test-header": "testing",
            }),
          })
        );
      });
  });

  test("uses supplied X-Request-ID", () => {
    return request(server)
      .get("/")
      .set("X-Request-ID", "42")
      .expect(200)
      .expect((res) => {
        expect(output[0].req.id).toEqual("42");
      });
  });

  test("uses X-GitHub-Delivery", () => {
    return request(server)
      .get("/")
      .set("X-GitHub-Delivery", "a-b-c")
      .expect(200)
      .expect((res) => {
        expect(output[0].req.id).toEqual("a-b-c");
      });
  });
});
