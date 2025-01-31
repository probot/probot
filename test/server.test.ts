import { Writable } from "node:stream";

// import type { NextFunction, Request, Response } from "express";
// import request from "supertest";
import { pino } from "pino";
import { sign } from "@octokit/webhooks-methods";
import getPort from "get-port";
import WebhookExamples, {
  type WebhookDefinition,
} from "@octokit/webhooks-examples";
import { describe, expect, it, beforeEach, test, afterEach } from "vitest";

import { Server, Probot } from "../src/index.js";

const appId = 1;
const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1c7+9z5Pad7OejecsQ0bu3aozN3tihPmljnnudb9G3HECdnH
lWu2/a1gB9JW5TBQ+AVpum9Okx7KfqkfBKL9mcHgSL0yWMdjMfNOqNtrQqKlN4kE
p6RD++7sGbzbfZ9arwrlD/HSDAWGdGGJTSOBM6pHehyLmSC3DJoR/CTu0vTGTWXQ
rO64Z8tyXQPtVPb/YXrcUhbBp8i72b9Xky0fD6PkEebOy0Ip58XVAn2UPNlNOSPS
ye+Qjtius0Md4Nie4+X8kwVI2Qjk3dSm0sw/720KJkdVDmrayeljtKBx6AtNQsSX
gzQbeMmiqFFkwrG1+zx6E7H7jqIQ9B6bvWKXGwIDAQABAoIBAD8kBBPL6PPhAqUB
K1r1/gycfDkUCQRP4DbZHt+458JlFHm8QL6VstKzkrp8mYDRhffY0WJnYJL98tr4
4tohsDbqFGwmw2mIaHjl24LuWXyyP4xpAGDpl9IcusjXBxLQLp2m4AKXbWpzb0OL
Ulrfc1ZooPck2uz7xlMIZOtLlOPjLz2DuejVe24JcwwHzrQWKOfA11R/9e50DVse
hnSH/w46Q763y4I0E3BIoUMsolEKzh2ydAAyzkgabGQBUuamZotNfvJoDXeCi1LD
8yNCWyTlYpJZJDDXooBU5EAsCvhN1sSRoaXWrlMSDB7r/E+aQyKua4KONqvmoJuC
21vSKeECgYEA7yW6wBkVoNhgXnk8XSZv3W+Q0xtdVpidJeNGBWnczlZrummt4xw3
xs6zV+rGUDy59yDkKwBKjMMa42Mni7T9Fx8+EKUuhVK3PVQyajoyQqFwT1GORJNz
c/eYQ6VYOCSC8OyZmsBM2p+0D4FF2/abwSPMmy0NgyFLCUFVc3OECpkCgYEA5OAm
I3wt5s+clg18qS7BKR2DuOFWrzNVcHYXhjx8vOSWV033Oy3yvdUBAhu9A1LUqpwy
Ma+unIgxmvmUMQEdyHQMcgBsVs10dR/g2xGjMLcwj6kn+xr3JVIZnbRT50YuPhf+
ns1ScdhP6upo9I0/sRsIuN96Gb65JJx94gQ4k9MCgYBO5V6gA2aMQvZAFLUicgzT
u/vGea+oYv7tQfaW0J8E/6PYwwaX93Y7Q3QNXCoCzJX5fsNnoFf36mIThGHGiHY6
y5bZPPWFDI3hUMa1Hu/35XS85kYOP6sGJjf4kTLyirEcNKJUWH7CXY+00cwvTkOC
S4Iz64Aas8AilIhRZ1m3eQKBgQCUW1s9azQRxgeZGFrzC3R340LL530aCeta/6FW
CQVOJ9nv84DLYohTVqvVowdNDTb+9Epw/JDxtDJ7Y0YU0cVtdxPOHcocJgdUGHrX
ZcJjRIt8w8g/s4X6MhKasBYm9s3owALzCuJjGzUKcDHiO2DKu1xXAb0SzRcTzUCn
7daCswKBgQDOYPZ2JGmhibqKjjLFm0qzpcQ6RPvPK1/7g0NInmjPMebP0K6eSPx0
9/49J6WTD++EajN7FhktUSYxukdWaCocAQJTDNYP0K88G4rtC2IYy5JFn9SWz5oh
x//0u+zd/R/QRUzLOw4N72/Hu+UG6MNt5iDZFCtapRaKt6OvSBwy8w==
-----END RSA PRIVATE KEY-----`;
const pushEvent = (
  (WebhookExamples as unknown as WebhookDefinition[]).filter(
    (event) => event.name === "push",
  )[0] as WebhookDefinition<"push">
).examples[0];

describe("Server", async () => {
  let server: Server;

  const port = await getPort();

  let output: any[];
  const streamLogsToOutput = new Writable({ objectMode: true });
  streamLogsToOutput._write = (object, _encoding, done) => {
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
      port,
      log: log.child({ name: "server" }),
    });
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  test("Server.version", () => {
    expect(Server.version).toEqual("0.0.0-development");
  });

  describe("GET /ping", () => {
    it("returns a 200 response", async () => {
      const response = await fetch(`http://localhost:${port}/ping`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("PONG");

      expect(output.length).toEqual(3);
      expect(output[2].msg).toContain("GET /ping 200 -");
    });
  });

  describe("webhook handler by providing webhookPath (POST /)", () => {
    it("should return 200 and run event handlers in app function", async () => {
      expect.assertions(4);

      const port = await getPort();
      output = [];

      const server = new Server({
        webhookPath: "/",
        Probot: Probot.defaults({
          appId,
          privateKey,
          secret: "secret",
        }),
        log: pino(streamLogsToOutput),
        port,
      });

      await server.load((app) => {
        app.on("push", (event) => {
          expect(event.name).toEqual("push");
        });
      });

      await server.start();

      const dataString = JSON.stringify(pushEvent);

      const response = await fetch(`http://localhost:${port}/`, {
        body: dataString,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "push",
          "x-hub-signature-256": await sign("secret", dataString),
          "x-github-delivery": "3sw4d5f6g7h8",
        },
      });

      expect(response.status).toBe(200);
      expect(output.length).toEqual(3);
      expect(output[2].msg).toContain("POST / 200 -");

      await server.stop();
    });

    test("respond with a friendly error when x-hub-signature-256 is missing", async () => {
      await server.load(() => {});

      const response = await fetch(
        `http://localhost:${port}/api/github/webhooks`,
        {
          body: JSON.stringify(pushEvent),
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-github-event": "push",
            "x-github-delivery": "3sw4d5f6g7h8",
          },
        },
      );

      expect(response.status).toBe(400);
      expect(await response.text()).toBe(
        '{"error":"Required headers missing: x-hub-signature-256"}',
      );
    });
  });

  describe("webhook handler (POST /api/github/webhooks)", () => {
    it("should return 200 and run event handlers in app function", async () => {
      expect.assertions(4);

      const port = await getPort();

      output = [];

      const server = new Server({
        Probot: Probot.defaults({
          appId,
          privateKey,
          secret: "secret",
        }),
        log: pino(streamLogsToOutput),
        port,
      });

      await server.load((app) => {
        app.on("push", (event) => {
          expect(event.name).toEqual("push");
        });
      });

      await server.start();

      const dataString = JSON.stringify(pushEvent);

      const response = await fetch(
        `http://localhost:${port}/api/github/webhooks`,
        {
          method: "POST",
          body: dataString,
          headers: {
            "content-type": "application/json",
            "x-github-event": "push",
            "x-hub-signature-256": await sign("secret", dataString),
            "x-github-delivery": "3sw4d5f6g7h8",
          },
        },
      );

      expect(response.status).toBe(200);

      expect(output.length).toEqual(3);
      expect(output[2].msg).toContain("POST /api/github/webhooks 200 -");

      await server.stop();
    });

    describe("GET unknown URL", () => {
      it("responds with 404", async () => {
        const response = await fetch(`http://localhost:${port}/notfound`);

        expect(response.status).toBe(404);
        expect(output.length).toEqual(3);
        expect(output[2].msg).toContain("GET /notfound 404 -");
      });
    });

    describe(".start() / .stop()", () => {
      it("should expect the correct error if port already in use", () =>
        new Promise<void>((next) => {
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
                "Port 3001 is already in use. You can define the PORT environment variable to use a different port.",
              );
            }

            await server.stop();
            blockade.close(() => next());
          });
        }));

      it("should listen to port when not in use", async () => {
        output = [];
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
        output = [];
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
  });
});
