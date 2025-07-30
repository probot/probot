import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { pino } from "pino";
import getPort from "get-port";
import { describe, expect, it } from "vitest";

import { Probot, Server } from "../../src/index.js";
import { defaultApp as defaultAppHandler } from "../../src/apps/default.js";

import { probotView } from "../../src/views/probot.js";
import { MockLoggerTarget } from "../utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("default app", () => {
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
      await server.stop();
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

        await server.stop();
      });

      it("returns the correct HTML without values", async () => {
        const server = await instantiateServer(__dirname);

        await server.start();

        const response = await fetch(
          `http://${server.host}:${server.port}/probot`,
        );
        expect(response.status).toBe(200);
        expect(await response.text()).toBe(probotView({}));

        await server.stop();
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

      await server.stop();
    });
  });
});
