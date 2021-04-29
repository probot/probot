import Stream from "stream";

import { NextFunction, Request, Response } from "express";
import request from "supertest";
import pino from "pino";
import { sign } from "@octokit/webhooks-methods";
import getPort from "get-port";

import { Server, Probot } from "../src";

const appId = 1;
const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIBOQIBAAJBAIILhiN9IFpaE0pUXsesuuoaj6eeDiAqCiE49WB1tMB8ZMhC37kY
Fl52NUYbUxb7JEf6pH5H9vqw1Wp69u78XeUCAwEAAQJAb88urnaXiXdmnIK71tuo
/TyHBKt9I6Rhfzz0o9Gv7coL7a537FVDvV5UCARXHJMF41tKwj+zlt9EEUw7a1HY
wQIhAL4F/VHWSPHeTgXYf4EaX2OlpSOk/n7lsFtL/6bWRzRVAiEArzJs2vopJitv
A1yBjz3q2nX+zthk+GLXrJQkYOnIk1ECIHfeFV8TWm5gej1LxZquBTA5pINoqDVq
NKZSuZEHqGEFAiB6EDrxkovq8SYGhIQsJeqkTMO8n94xhMRZlFmIQDokEQIgAq5U
r1UQNnUExRh7ZT0kFbMfO9jKYZVlQdCL9Dn93vo=
-----END RSA PRIVATE KEY-----`;
const pushEvent = require("./fixtures/webhook/push.json");

describe("Server", () => {
  let server: Server;

  let output: any[];
  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  beforeEach(async () => {
    output = [];
    const log = pino(streamLogsToOutput);
    server = new Server({
      Probot: Probot.defaults({
        appId,
        privateKey,
        secret: "secret",
        log: log.child({ name: "probot" }),
      }),
      log: log.child({ name: "server" }),
    });

    // Error handler to avoid printing logs
    server.expressApp.use(
      (error: Error, req: Request, res: Response, next: NextFunction) => {
        res.status(500).send(error.message);
      }
    );
  });

  test("Server.version", () => {
    expect(Server.version).toEqual("0.0.0-development");
  });

  describe("GET /ping", () => {
    it("returns a 200 response", async () => {
      await request(server.expressApp).get("/ping").expect(200, "PONG");
      expect(output.length).toEqual(1);
      expect(output[0].msg).toContain("GET /ping 200 -");
    });
  });

  describe("webhook handler (POST /)", () => {
    it("should return 200 and run event handlers in app function", async () => {
      expect.assertions(3);

      server = new Server({
        Probot: Probot.defaults({
          appId,
          privateKey,
          secret: "secret",
        }),
        log: pino(streamLogsToOutput),
        port: await getPort(),
      });

      await server.load((app) => {
        app.on("push", (event) => {
          expect(event.name).toEqual("push");
        });
      });

      const dataString = JSON.stringify(pushEvent);

      await request(server.expressApp)
        .post("/")
        .send(dataString)
        .set("x-github-event", "push")
        .set("x-hub-signature-256", await sign("secret", dataString))
        .set("x-github-delivery", "3sw4d5f6g7h8");

      expect(output.length).toEqual(1);
      expect(output[0].msg).toContain("POST / 200 -");
    });

    test("respond with a friendly error when x-hub-signature-256 is missing", async () => {
      await server.load(() => {});

      await request(server.expressApp)
        .post("/")
        .send(JSON.stringify(pushEvent))
        .set("x-github-event", "push")
        // Note: 'x-hub-signature-256' is missing
        .set("x-github-delivery", "3sw4d5f6g7h8")
        .expect(
          400,
          '{"error":"Required headers missing: x-hub-signature-256"}'
        );
    });
  });

  describe("GET unknown URL", () => {
    it("responds with 404", async () => {
      await request(server.expressApp).get("/notfound").expect(404);
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
          Probot: Probot.defaults({ appId, privateKey }),
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
      const testApp = new Server({
        Probot: Probot.defaults({ appId, privateKey }),
        port: 3001,
        log: pino(streamLogsToOutput),
      });
      await testApp.start();

      expect(output.length).toEqual(2);
      expect(output[1].msg).toEqual("Listening on http://localhost:3001");

      await testApp.stop();
    });

    it("respects host/ip config when starting up HTTP server", async () => {
      const testApp = new Server({
        Probot: Probot.defaults({ appId, privateKey }),
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

      return request(server.expressApp).get("/my-app/foo").expect(200, "foo");
    });

    it("allows routes with no path", () => {
      const router = server.router();
      router.get("/foo", (req, res) => res.end("foo"));

      return request(server.expressApp).get("/foo").expect(200, "foo");
    });

    it("allows you to overwrite the root path", () => {
      const router = server.router();
      router.get("/", (req, res) => res.end("foo"));

      return request(server.expressApp).get("/").expect(200, "foo");
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

      await request(server.expressApp)
        .get("/foo/hello")
        .expect(200, "foo")
        .expect("X-Test", "foo");

      await request(server.expressApp)
        .get("/bar/hello")
        .expect(200, "bar")
        .expect("X-Test", "bar");
    });

    it("responds with 500 on error", async () => {
      server.expressApp.get("/boom", () => {
        throw new Error("boom");
      });

      await request(server.expressApp).get("/boom").expect(500);
    });
  });
});
