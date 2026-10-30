import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { pino } from "pino";
import getPort from "get-port";
import { afterEach, describe, expect, it } from "vitest";

import { Probot, Server } from "../../src/index.js";
import { defaultApp as defaultAppHandler } from "../../src/apps/default.js";

import { probotView } from "../../src/views/probot.js";
import { MockLoggerTarget } from "../utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("default app", () => {
  const servers: Server[] = [];

  afterEach(async () => {
    await Promise.all(servers.map((server) => server.stop()));
    servers.length = 0;
  });

  async function instantiateServer(cwd = process.cwd()) {
    const server = new Server({
      Probot: Probot.defaults({
        appId: 1,
        privateKey: "private key",
      }),
      port: await getPort(),
      log: pino(new MockLoggerTarget()),
      cwd,
    });

    await server.loadHandlerFactory(defaultAppHandler);
    servers.push(server);

    return server;
  }

  describe("GET /probot", () => {
    it("returns a 200 response", async () => {
      const server = await instantiateServer();

      await server.start();

      const response = await fetch(
        `http://${server.host}:${server.port}/probot`,
      );

      expect(response.status).toBe(200);
    });

    describe("get info from package.json", () => {
      it("returns the correct HTML with values", async () => {
        const server = await instantiateServer();

        await server.start();

        const response = await fetch(
          `http://${server.host}:${server.port}/probot`,
        );

        expect(response.status).toBe(200);

        expect(await response.text()).toBe(
          probotView({
            name: "probot",
            description:
              "A framework for building GitHub Apps to automate and improve your workflow",
            version: "0.0.0-development",
          }),
        );
      });

      it("returns the correct HTML without values", async () => {
        const server = await instantiateServer(__dirname);

        await server.start();

        const response = await fetch(
          `http://${server.host}:${server.port}/probot`,
        );
        expect(response.status).toBe(200);
        expect(await response.text()).toBe(probotView({}));
      });
    });
  });

  // Redirect does not work because webhooks middleware is using root path
  describe("GET /", () => {
    it("redirects to /probot", async () => {
      const server = await instantiateServer(__dirname);
      await server.start();

      const response = await fetch(`http://${server.host}:${server.port}/`, {
        redirect: "manual",
      });

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("/probot");
    });
  });

  it.each([
    ["POST /probot", { method: "POST", url: "/probot" }],
    ["GET without a URL", { method: "GET" }],
    ["GET /unknown", { method: "GET", url: "/unknown" }],
  ])("returns false for unsupported requests: %s", (_name, request) => {
    const handler = defaultAppHandler(
      new (Probot.defaults({ appId: 1, privateKey: "private key" }))(),
      { cwd: __dirname, addHandler: () => {} },
    );

    expect(handler(request as IncomingMessage, {} as ServerResponse)).toBe(
      false,
    );
  });
});
