import { describe, it, expect } from "vitest";
import { pino } from "pino";
import { sign } from "@octokit/webhooks-methods";
import getPort from "get-port";
import WebhookExamples, {
  type WebhookDefinition,
} from "@octokit/webhooks-examples";

import { Server, Probot } from "../src/index.js";
import { detectRuntime } from "../src/helpers/detect-runtime.js";
import { MockLoggerTarget } from "./utils.js";

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

describe("Server", () => {
  it("Server.version", () => {
    expect(Server.version).toBe("0.0.0-development");
  });

  describe("GET /ping", () => {
    it("returns a 200 response", async () => {
      const logTarget = new MockLoggerTarget();

      const server = new Server({
        webhookPath: "/",
        Probot: Probot.defaults({
          appId,
          privateKey,
          secret: "secret",
        }),
        log: pino(logTarget),
        port: await getPort(),
      });

      await server.start();

      const response = await fetch(`http://${server.host}:${server.port}/ping`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe("PONG");

      expect(logTarget.entries.length).toBe(3);
      expect(logTarget.entries[2].msg.slice(0, 15)).toBe("GET /ping 200 -");

      await server.stop();
    });
  });

  describe("webhook handler (POST /api/github/webhooks)", () => {
    it("should return 200 and run event handlers in app function", async () => {
      const logTarget = new MockLoggerTarget();

      let pushCalls = 0;

      const server = new Server({
        Probot: Probot.defaults({
          appId,
          privateKey,
          secret: "secret",
        }),
        log: pino(logTarget),
        port: await getPort(),
      });

      await server.load((app) => {
        app.on("push", () => {
          ++pushCalls;
        });
      });

      await server.start();

      const dataString = JSON.stringify(pushEvent);

      const response = await fetch(
        `http://${server.host}:${server.port}/api/github/webhooks`,
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

      expect(pushCalls).toBe(1);

      expect(logTarget.entries.length).toBe(3);
      expect(logTarget.entries[2].msg.slice(0, 31)).toBe(
        "POST /api/github/webhooks 200 -",
      );

      await server.stop();
    });

    describe("GET unknown URL", () => {
      it("responds with 404", async () => {
        const logTarget = new MockLoggerTarget();

        const server = new Server({
          webhookPath: "/",
          Probot: Probot.defaults({
            appId,
            privateKey,
            secret: "secret",
          }),
          log: pino(logTarget),
          port: await getPort(),
        });

        await server.start();

        const response = await fetch(
          `http://${server.host}:${server.port}/notfound`,
        );

        expect(response.status).toBe(404);
        expect(logTarget.entries.length).toBe(3);
        expect(logTarget.entries[2].msg.slice(0, 19)).toBe(
          "GET /notfound 404 -",
        );

        await server.stop();
      });

      it("respond with a friendly error when x-hub-signature-256 is missing", async () => {
        const logTarget = new MockLoggerTarget();

        const server = new Server({
          Probot: Probot.defaults({
            appId,
            privateKey,
            secret: "secret",
          }),
          log: pino(logTarget),
          port: await getPort(),
        });

        await server.load(() => {});

        await server.start();

        const response = await fetch(
          `http://${server.host}:${server.port}/api/github/webhooks`,
          {
            method: "POST",
            body: JSON.stringify(pushEvent),
            headers: {
              "content-type": "application/json",
              "x-github-event": "push",
              // Note: 'x-hub-signature-256' is missing
              "x-github-delivery": "3sw4d5f6g7h8",
            },
          },
        );
        expect(response.status).toBe(400);
        expect(await response.text()).toBe(
          '{"error":"Required headers missing: x-hub-signature-256"}',
        );

        await server.stop();
      });
    });

    it("html formatted response", async () => {
      const logTarget = new MockLoggerTarget();

      const server = new Server({
        webhookPath: "/",
        Probot: Probot.defaults({
          appId,
          privateKey,
          secret: "secret",
        }),
        log: pino(logTarget),
        port: await getPort(),
      });

      await server.start();

      const response = await fetch(
        `http://${server.host}:${server.port}/notfound`,
      );

      expect(await response.text()).toBe("");

      expect(logTarget.entries.length).toBe(3);
      expect(logTarget.entries[2].msg.slice(0, 19)).toBe("GET /notfound 404 -");

      await server.stop();
    });
  });

  describe(".start() / .stop()", () => {
    it("should expect the correct error if port already in use", async () => {
      const logTarget = new MockLoggerTarget();

      // Bun runtime detected. Port reuse possible. skipping port in use error check
      if (detectRuntime(globalThis) === "bun") {
        return;
      }
      const port = await getPort();

      const blocker = new Server({
        Probot: Probot.defaults({ appId, privateKey }),
        log: pino(logTarget),
        port,
      });

      await blocker.start();

      const server = new Server({
        Probot: Probot.defaults({ appId, privateKey }),
        log: pino(logTarget),
        port,
      });

      try {
        await server.start();
        throw new Error("Server should not start");
      } catch (error) {
        expect((error as Error).message).toBe(
          `Port ${port} is already in use. You can define the PORT environment variable to use a different port.`,
        );
      } finally {
        await blocker.stop();
      }
    });

    it("respects host/ip config when starting up HTTP server", async () => {
      const logTarget = new MockLoggerTarget();

      const port = await getPort();

      const testApp = new Server({
        Probot: Probot.defaults({ appId, privateKey }),
        port,
        host: "127.0.0.1",
        log: pino(logTarget),
      });
      await testApp.start();

      expect(logTarget.entries.length).toBe(2);
      expect(logTarget.entries[1].msg).toBe(
        `Listening on http://127.0.0.1:${port}`,
      );

      await testApp.stop();
    });
  });
});
