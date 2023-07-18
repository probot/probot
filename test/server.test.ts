import Stream from "stream";

import { NextFunction, Request, Response } from "express";
import request from "supertest";
import pino from "pino";
import { sign } from "@octokit/webhooks-methods";
import getPort from "get-port";

import { Server, Probot } from "../src";

const appId = 1;
const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEArt/ScvMkbGF1h16mITuZ/1MmLXQ6GR6oxJ5olxvIKCmFVVAF
76ViLpR2/3bVkraBElSuXRUix/K4iCuK+LeV7JSFANdzMQ0Vt9NcxfXZo3rCbOHZ
yFViWWHcTzCQ8oyxDopXGt6377BSn9d8u9aZ/d7ew0sLKY4LjplY60NvTis3keTp
/RaI1oCnvYQraeBfWOK2xH8aC6MwlmSJ+CT8CVUR/zEhOQEkL3JcrOgJqzNmTK8p
J5aupC/YtN0sE72b+kv86+giLQrcGndzxgu8lCqFPmzQbO16sDmdjnpzVYIsM0OU
7wCU6NHthSJ69d9JQuJgsKRiyV3fldls4yJ9UwIDAQABAoIBAFYg2q/O3QOcRJx1
m3EGv+Qm+citU+gHV6vvMSgrgLt3J7pK/YF4fRDgAnPz/WCTDqMOngouXMEJ5KT8
fSfek7K/u3ocoxlnjmjJawn8+kIwNg4WdoLauuO29SDzlJBBhvrYW+paA1HEEA21
vjNtkM6etCyPi2HeGgcTs927ith+U4XJM6KB4Ixzt0C7BasSeFCcPGlDrEL2mu0V
fCJuYH2rH73GxEXYJTWzU0ttjNdovx9T4rxgWjYX+/U8mN1YQEyYd5VkziyVtIet
YEAStOwimZBEgk9w6XMVvDO+fPyTdjBFuinIMTookyaHhbmUMEHN8SGfmm4eOT2i
ccKnHCECgYEA5KrTuiecOD4ZT9vn/QtpdPWgW/l0v694Y70WsQ6PgB4+yy3qEcXO
uM0kErC6Yr2K/C7K3neV3/qAjA0RfES2BCWVkBKXWGsfAXd3a2B/P6CfJaEV4mqP
ZLHwqdANzV/ENAapvtXvrtZCxqdlDcTpYBbuBf2aBO5VmN/PZD1tNLkCgYEAw8bw
wNUh+EmxgFuq4dlZDUq3TG0KV0MI2yCV5k0BDd2zzwz+pibhb0FvYrFBJQJknYJ7
WNGTJbH2mX+EYqfLKTODzrhBc+qHjGzU20HZ62CVv/BYiwePhXT8/mQ5+odafdTJ
2QU8Rhl199eEQdTFKueaTBPv1Ch3ZV+0KR/XFGsCgYBCP4el2BH3bW5R56kXc7Xy
z7LM0sHTQxgC9WZcl5ZVjO2uWbgFvCQ/ABfiXlcxgi6BD2FxAH5obJ/Pc33MXe/J
1cW1/tzgHfDWsPDlKAjVu0hAU6IOfcbban4KBJ/rD0K9u+xzwHF3WtXvzdGGIrVm
RF5jV+zGXvJnnvfr16wK6QKBgGqkjHJN5uIrqk/EHzJFRbfy0iQEZZShBErw1haM
LZ3S/WY0quXw2e3TlAwLh/PT+OC/udbo2iG3bh+xEXj387euwwaw4Z51y35Xrh79
IOqRQyE5l9Grvacx0bn0+IwafNV8OrNHocyBg/wMXpPJhdlYLXlxhrtni5oh5q5c
FLmfAoGAc1sDXdvLG9dAwU76tWxsI/ND/mH8FqyoynfACf6O+2xYBRvHYlUwhH+2
ktF/AGF6qGtiTlkQp6W/9W8TCp66WeNOPaFFHWFlQ5uyxCn/N/Z3NnUvlD4YRi+P
+FrbrdG1hrbLgmCrDA+rZA/SqdsQy6PSJ97+JvRFhmBxoNxaYm0=
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
        .set("content-type", "application/json")
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
        .set("content-type", "application/json")
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
        } catch (error: any) {
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
