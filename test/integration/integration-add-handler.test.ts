import { createServer } from "node:http";

import express from "express";
import Fastify from "fastify";

import getPort from "get-port";
import { describe, expect, it } from "vitest";

import {
  createNodeMiddleware,
  createProbot,
  run,
  type ApplicationFunction,
} from "../../src/index.js";
import { getPrintableHost } from "../../src/helpers/get-printable-host.js";
import { detectRuntime } from "../../src/helpers/detect-runtime.js";

const APP_ID = "123";
const WEBHOOK_SECRET = "secret";
const PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
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

describe("run", () => {
  it("addHandler is provided in the option object", async () => {
    const port = await getPort();

    let hasAddHandler = false;

    const server = await run(
      async (_app, options) => {
        hasAddHandler = !!options.addHandler;
      },
      {
        env: {
          APP_ID: "123",
          PRIVATE_KEY,
          PORT: port.toString(),
          LOG_LEVEL: "fatal",
        },
        updateEnv: (env) => env,
        SmeeClient: { createChannel: async () => "dummy" },
      },
    );

    expect(hasAddHandler).toBe(true);
    await server.stop();
  });

  it("should work with express", async () => {
    const expressApp = express();
    const port = await getPort();

    expressApp.get("/hello-world", (_req, res) => {
      res.status(200).send({ hello: "world" });
    });

    const server = await run(
      async (_app, options) => {
        options.addHandler!(expressApp);
      },
      {
        env: {
          APP_ID: "123",
          PRIVATE_KEY,
          PORT: port.toString(),
          LOG_LEVEL: "fatal",
        },
        updateEnv: (env) => env,
        SmeeClient: { createChannel: async () => "dummy" },
      },
    );

    const response = await fetch(
      `http://${server.host}:${server.port}/hello-world`,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('{"hello":"world"}');

    await server.stop();
  });

  it(
    "should work with fastify",
    async () => {
      const port = await getPort();

      // Get a fastify instance to expose new HTTP endpoints
      const fastify = Fastify();

      // Declare a route
      fastify.get("/hello-world", function (_request, reply) {
        reply.send({ hello: "world" });
      });

      await fastify.ready();

      const server = await run(
        async (_app, options) => {
          options.addHandler!(fastify.routing);
        },
        {
          env: {
            APP_ID: "123",
            PRIVATE_KEY,
            PORT: port.toString(),
            LOG_LEVEL: "fatal",
          },
          updateEnv: (env) => env,
          SmeeClient: { createChannel: async () => "dummy" },
        },
      );

      const response = await fetch(
        `http://${server.host}:${server.port}/hello-world`,
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('{"hello":"world"}');

      await server.stop();
    },
    // Fastify is not supported in Deno
    { skip: detectRuntime(globalThis) === "deno" },
  );
});

describe("createNodeMiddleware", () => {
  it("should work with express", async () => {
    const port = await getPort();

    const app: ApplicationFunction = (_app, { addHandler }) => {
      const expressApp = express();

      expressApp.get("/hello-world", (_req, res) => {
        res.status(200).send({ hello: "world" });
      });

      addHandler(expressApp);
    };
    const middleware = createNodeMiddleware(app, {
      probot: createProbot({
        env: {
          APP_ID,
          PRIVATE_KEY,
          WEBHOOK_SECRET,
        },
      }),
    });

    const server = createServer(middleware);

    await new Promise<void>((resolve) => server.listen(port, resolve));

    let { address: host } = server.address() as {
      port: number;
      address: string;
    };

    host = getPrintableHost(host);

    const response = await fetch(`http://${host}:${port}/hello-world`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('{"hello":"world"}');

    server.close();
  });

  it(
    "should work with fastify",
    async () => {
      const port = await getPort();

      const app: ApplicationFunction = async (_app, { addHandler }) => {
        // Get a fastify instance to expose new HTTP endpoints
        const fastify = Fastify();

        // Declare a route
        fastify.get("/hello-world", function (_request, reply) {
          reply.send({ hello: "world" });
        });

        await fastify.ready();

        addHandler(fastify.routing);
      };

      const middleware = createNodeMiddleware(app, {
        probot: createProbot({
          env: {
            APP_ID,
            PRIVATE_KEY,
            WEBHOOK_SECRET,
          },
        }),
      });

      const server = createServer(middleware);

      await new Promise<void>((resolve) => server.listen(port, resolve));

      let { address: host } = server.address() as {
        port: number;
        address: string;
      };

      host = getPrintableHost(host);

      const response = await fetch(`http://${host}:${port}/hello-world`);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('{"hello":"world"}');

      server.close();
    },
    // Fastify is not supported in Deno
    { skip: detectRuntime(globalThis) === "deno" },
  );
});
