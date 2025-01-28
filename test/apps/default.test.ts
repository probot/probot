import Stream from "node:stream";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { pino } from "pino";
import getPort from "get-port";
import { describe, expect, it } from "vitest";

import { Probot, Server } from "../../src/index.js";
import { defaultApp as defaultAppHandler } from "../../src/apps/default.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("default app", async () => {
  let output = [];

  const port = await getPort();

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, _encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  async function instantiateServer(cwd = process.cwd()) {
    output = [];
    const server = new Server({
      Probot: Probot.defaults({
        appId: 1,
        privateKey: "private key",
      }),
      log: pino(streamLogsToOutput),
      cwd,
      port,
    });

    await server.loadHandler(defaultAppHandler);
    return server;
  }

  describe("GET /probot", () => {
    it("returns a 200 response", async () => {
      const server = await instantiateServer();
      await server.start();
      expect((await fetch(`http://localhost:${port}/probot`)).status).toBe(200);
      await server.stop();
    });

    describe("get info from package.json", () => {
      it("returns the correct HTML with values", async () => {
        const server = await instantiateServer();
        await server.start();
        const response = await fetch(`http://localhost:${port}/probot`);
        expect(response.status).toBe(200);

        const actualText = await response.text();
        expect(actualText).toMatch("Welcome to probot");
        expect(actualText).toMatch("A framework for building GitHub Apps");
        expect(actualText).toMatch(/v\d+\.\d+\.\d+/);
        expect(actualText).toMatchSnapshot();
        await server.stop();
      });

      it("returns the correct HTML without values", async () => {
        const server = await instantiateServer(__dirname);
        await server.start();
        const response = await fetch(`http://localhost:${port}/probot`);
        expect(response.status).toBe(200);

        const actualText = await response.text();
        expect(actualText).toMatch("Welcome to your Probot App");
        expect(actualText).toMatchSnapshot();
        await server.stop();
      });
    });
  });

  // Redirect does not work because webhooks middleware is using root path
  describe("GET /", () => {
    it("redirects to /probot", async () => {
      const server = await instantiateServer(__dirname);
      await server.start();
      const response = await fetch(`http://localhost:${port}/`, {
        redirect: "manual",
      });

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("/probot");
      await server.stop();
    });
  });
});
