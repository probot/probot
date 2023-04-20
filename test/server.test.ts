import Stream from "stream";

import { NextFunction, Request, Response } from "express";
import request from "supertest";
import pino from "pino";
import { sign } from "@octokit/webhooks-methods";
import getPort from "get-port";

import { Server, Probot } from "../src";

const appId = 1;
const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIJKAIBAAKCAgEAu0E+tR6wfOAJZ4lASzRUmvorCgbI5nQyvZl3WLu6ko2pcEnq
1t1/W/Yaovt9W8eMFVfoFXKhsHOAM5dFlktxOlcaUQiRYSO7fBbZYVNYoawnCRqD
HKQ1oKC6B23EKfW5NH8NLaI/+QJFG7fpr0P4HkHghLsOe7rIUDt7EjRsSSRhM2+Y
sFmRsnj0PWESWyI5exdKys0Mw25CmGsA27ltmebgHFYQ4ac+z0Esbjujcxec5wtn
oAMT6jIBjEPHYTy0Cbe/wDN0cZkg6QyNC09lMnUx8vP1gwAVP20VXfjdFHZ8cR80
ungLmBG0SWgVglqv52C5Gad2hEDsWyi28/XZ9/mNGatZJ1SSmA6+TSuSlrs/Dm0K
hjOx21SdPAii38fBs6xtMk8d8WhGqwUR0nAVDdm1H/03BJssuh78xL5/WEcDZ2Gn
QSQERNna/nP7uwbIXYORYLcPTY80RrYp6MCTrHydIArurGrtGW9f2RU2cP5+5SkV
qvSSU6NefYYw55XyVXrIfkTZXJ4UejlnpWZ+syXbYIRn/CNBPbQa6OY/ZBUgSDKW
xjiQQcr71ANeW41Od+k+TCiCkoK2fEPbtD/LXDXKZNTwzZqUA5ol//wOk+cDms9z
A+vbA8IWP6TBBqxVMe8z8D7AVytQTNHPBf/33tNfneWvuElHP9CG3q8/FYkCAwEA
AQKCAf9Punf4phh/EuTuMIIvgxiC5AFvQ3RGqzLvh2hJX6UQwUBjjxVuZuDTRvYQ
bwPxEAWVENjASQ6PEp6DWOVIGNcc//k0h3Fe6tfo/dGQnuwd6i60sZUhnMk4mzaZ
8yKSuw0gTPhPdcXHQDAsnSHifg4m0+XEneCMzfp8Ltc36RoyCktYmytn6rseQmG7
wJkQNIJE5qXxs1y72TaBrw2ugEUqQiMp7XtCmPMlS5qfVMVDO8qSlUiJ2MWh8ai3
ECTUQgRmHtaF/2KU+54HnFBxgFyWH1AlIbpnDKH/X3K5kDyReeGCSMcqnfJRzTf2
CVsfJX3ABm7JfYP4y6vXJH7BYOxs7YMBEiR0o/7mhcBNbj8reEy42hUIaomQQNRE
mw5iiHiCBE/P6Y46SFyddnwuwD9HVk9ojyz5A70OjZLEWBfRajLOqSEp8VO7aM7H
YEQ00Jj9nNAKkaRh3BP9zEuL3dtYF//myr1QHgDCg0lsKacmJOFxxJwzmiTgvXFd
y6ZajugDY//7kA4iXPmRY0/nIznyee9AiAUvf2kvJov/jL36HH8fFWFH+RVS3/+V
BGM5hlWdVyGr+y+PNU6wTz637Qg/23GhwuF0Wi6qie0jertuzPW0RkUlOzX5y2v2
p6mTTJxpOmXCPjq1UZQUz+KkUZuUVlWTRmL3l+133eh6jTr1AoIBAQDxKAXhDBxR
kvgIomBF0Q9lQGkIpT6yw+YsuzL9WiJM0ZvvnES/2XqwGSMOfNHnwsrrKXxxgLRY
vpN/5pEJK8TYrLyvargWW6qQptGqnkt4unb30EENgDT3SARKfhM9ytXaCn+JrJyI
4yN0qAVDOEkv1TqP0oIjMO5QVqVEYhO8CAyKdBiXc0XY7FYZTYMLbHs7tkqZFHF+
OgfEi6pnH61hFoCdPtskmjxlmPbwRP4K18J6rovlq3/KMbSw2NQEADFZUmaalcSa
nn9O+0MkzvrCcanDmA1ZgZkd/06izo76u7vUoHdMflWoOAwBYvjQJntN7wUzX/3z
QNiFg1HEDqtrAoIBAQDGx+EZz1RUI+6o+3Swy9yNQk4jGAueH1OXsdazn6lOpzBt
YvG7BxIbyMfJuRBrIN7q0FiyRFSChXgjenD3aq5r84DAegMDHHL6bnLQTfnuzvHL
oQ5TZ0i8a29V3FinamYEaFziZQuFs1nCPdnPd41GX3oaTvlYyfTc2J9UjxBtRIoA
vTViJ2NKxaklFMEBhRoUsqQXT4Jh3a6+3r9xpFkaQ/LYRp8XzWXJntqwhy6+Nvf1
B4CVYF9My3r4KGNa6UmnK7A92VqnkHuN4rAlDnu1Q0BZa5dy+vw+Kkxsg4qSoTAF
41tCI5aJd5t+THQMAJmrOG9Wzfwk83g3V0oTzJPbAoIBAEqKJW8PUD2CoPoCPqG1
4f1Y8F5EvWGCHcZbwoH+9zUpYPqqIbHvJfYCfwx+Vl89nX0coKNwtc3scikJenEM
P1b95YCPCwGWKd12Qr5rGUbi09z7WPA0XarFbtYbrBTgekNgFVXXrba+BnqLaL0D
S9PmI6jK14DLIg5hCcpeSl1HW6D8C5Hcho1rV52QkN3aFSk6ykoQwJfUlgwRY4Vm
jC/DRdPU1uW0atC4fDN+D8wILsu+4e0GmoRD4ub6zmXCLX6/col7m35zWURvc6yP
8YBio6eaex3cahiUjpjSIe2sU32Ab/+L2SwaztMq5V9pVZmcNM5RcGxc8dAq6/4e
zqsCggEBAKKevNHvos6fAs1twd4tOUa7Gs9tCXwXprxwOfSDRvBYqK6khpv6Qd9H
F+M4qmzp3FR/lEBq1DRfWpSzw501wnIAKLHOX455BLtKBlXRpQmwdXGgVeb3lTLI
NbIpbMGxsroiYvK3tYBw5JqbHQi0hngu/eZt+2Ge/tp5wYdc7xRlQP0vzW96R6nR
IPp8CxXiPR73snR7kG/d+uqdskMXL+nj8tTqmZbQa1hRxBkszpnAwIPN2mzaBbz+
rqA78mRae+3uOOWwXpC9C8dcz7vRKHV3CjrdYW4oVJnK4vDXgFNK2M3IXU0zbiES
H7xocXusNgs0RSnfpEraf9vOZoTiFYcCggEBANnrbN0StE2Beni2sWl9+9H2CbXS
s4sFJ1Q+KGN1QdKXHQ28qc8eYbifF/gA7TaSXmSiEXWinTQQKRSfZ/Xj573RZtaf
nvrsLNmx/Mxj/KPHKrlgep5aJ+JsHsb93PpHacG38OBgcWhzDf6PYLQilzY12jr7
vAWZUbyCsH+5FYuz0ahl6Cef8w6IrFpvk0hW2aQsoVWvgH727D+uM48DZ9mpVy9I
bHNB2yFIuUmmT92T7Pw28wJZ6Wd/3T+5s4CBe+FWplQcgquPGIFkq4dVxPpVg6uq
wB98bfAGtcuCZWzgjgL67CS0pcNxadFA/TFo/NnynLBC4qRXSfFslKVE+Og=
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
        } catch (error) {
          expect((error as Error).message).toEqual(
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
