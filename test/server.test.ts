import Stream from "stream";

import { NextFunction, Request, Response } from "express";
import request from "supertest";
import pino from "pino";

import { Server } from "../src";

describe("Server", () => {
  let server: Server;
  let webhook: any;

  let output: any[];
  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  beforeEach(() => {
    output = [];
    webhook = jest.fn((req, res, next) => next());
    server = new Server({
      log: pino(streamLogsToOutput),
    });
    server.app.use(webhook);

    // Error handler to avoid printing logs
    server.app.use(
      (error: Error, req: Request, res: Response, next: NextFunction) => {
        res.status(500).send(error.message);
      }
    );
  });

  describe("GET /ping", () => {
    it("returns a 200 response", async () => {
      await request(server.app).get("/ping").expect(200, "PONG");
      expect(output.length).toEqual(1);
      expect(output[0].msg).toContain("GET /ping 200 -");
    });
  });

  describe("webhook handler", () => {
    it("should 500 on a webhook error", async () => {
      webhook.mockImplementation(
        (req: Request, res: Response, callback: NextFunction) =>
          callback(new Error("webhook error"))
      );
      await request(server.app).post("/").expect(500);
      expect(output.length).toEqual(1);
      expect(output[0].msg).toContain("POST / 500 -");
    });
  });

  describe("with an unknown url", () => {
    it("responds with 404", async () => {
      await request(server.app).get("/notfound").expect(404);
      expect(output.length).toEqual(1);
      expect(output[0].msg).toContain("GET /notfound 404 -");
    });
  });
});
