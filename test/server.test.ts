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

  describe("webhook handler (POST /)", () => {
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

  describe("GET unknown URL", () => {
    it("responds with 404", async () => {
      await request(server.app).get("/notfound").expect(404);
      expect(output.length).toEqual(1);
      expect(output[0].msg).toContain("GET /notfound 404 -");
    });
  });

  describe(".start() / .stop()", () => {
    it("should expect the correct error if port already in use", (next) => {
      expect.assertions(1);

      // block port 3001
      const http = require("http");
      const blockade = http.createServer().listen(3001, async () => {
        const server = new Server({
          log: pino(streamLogsToOutput),
          port: 3001,
        });

        try {
          await server.start();
        } catch (error) {
          expect(error.message).toEqual(
            "Port 3001 is already in use. You can define the PORT environment variable to use a different port."
          );
        }

        await server.stop();
        blockade.close(() => next());
      });
    });

    it("should listen to port when not in use", async () => {
      const testApp = new Server({ port: 3001, log: pino(streamLogsToOutput) });
      await testApp.start();

      expect(output.length).toEqual(2);
      expect(output[1].msg).toEqual("Listening on http://localhost:3001");

      await testApp.stop();
    });

    it("respects host/ip config when starting up HTTP server", async () => {
      const testApp = new Server({
        port: 3002,
        host: "127.0.0.1",
        log: pino(streamLogsToOutput),
      });
      await testApp.start();

      expect(output.length).toEqual(2);
      expect(output[1].msg).toEqual("Listening on http://127.0.0.1:3002");

      await testApp.stop();
    });
  });

  describe("router", () => {
    it("prefixes paths with route name", () => {
      const router = server.router("/my-app");
      router.get("/foo", (req, res) => res.end("foo"));

      return request(server.app).get("/my-app/foo").expect(200, "foo");
    });

    it("allows routes with no path", () => {
      const router = server.router();
      router.get("/foo", (req, res) => res.end("foo"));

      return request(server.app).get("/foo").expect(200, "foo");
    });

    it("allows you to overwrite the root path", () => {
      const router = server.router();
      router.get("/", (req, res) => res.end("foo"));

      return request(server.app).get("/").expect(200, "foo");
    });

    it("isolates apps from affecting each other", async () => {
      ["foo", "bar"].forEach((name) => {
        const router = server.router("/" + name);

        router.use((req, res, next) => {
          res.append("X-Test", name);
          next();
        });

        router.get("/hello", (req, res) => res.end(name));
      });

      await request(server.app)
        .get("/foo/hello")
        .expect(200, "foo")
        .expect("X-Test", "foo");

      await request(server.app)
        .get("/bar/hello")
        .expect(200, "bar")
        .expect("X-Test", "bar");
    });

    it("responds with 500 on error", async () => {
      server.app.get("/boom", () => {
        throw new Error("boom");
      });

      await request(server.app).get("/boom").expect(500);
    });

    it("responds with 500 on async error", async () => {
      server.app.get("/boom", () => {
        return Promise.reject(new Error("boom"));
      });

      await request(server.app).get("/boom").expect(500);
    });
  });
});
