import { Stream } from "node:stream";

import fetchMock from "fetch-mock";
import { pino } from "pino";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { Probot, Server } from "../../src/index.js";
import { setupAppFactory } from "../../src/apps/setup.js";
import getPort from "get-port";

const mocks = vi.hoisted(() => {
  return {
    createChannel: vi.fn().mockResolvedValue("mocked proxy URL"),
    updateDotenv: vi.fn().mockResolvedValue({}),
  };
});
vi.mock("smee-client", () => ({
  default: { createChannel: mocks.createChannel },
  createChannel: mocks.createChannel,
}));
vi.mock("update-dotenv", () => ({
  default: mocks.updateDotenv,
}));

describe("Setup app", async () => {
  const port = await getPort();
  let server: Server;
  let logOutput: any[] = [];

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (msg, _encoding, done) => {
    logOutput.push(JSON.parse(msg));
    done();
  };

  beforeEach(async () => {
    logOutput = [];
    server = new Server({
      Probot: Probot.defaults({
        log: pino(streamLogsToOutput),
        // workaround for https://github.com/probot/probot/issues/1512
        appId: 1,
        privateKey: "dummy value for setup, see #1512",
      }),
      log: pino(streamLogsToOutput),
      port,
    });

    await server.loadHandler(setupAppFactory(undefined, port));

    await server.start();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await server.stop();
  });

  describe("logs", () => {
    it("should log welcome message", () => {
      const expMsgs = [
        "",
        "Welcome to Probot!",
        "Probot is in setup mode, webhooks cannot be received and",
        "custom routes will not work until APP_ID and PRIVATE_KEY",
        "are configured in .env.",
        `Please follow the instructions at http://localhost:${port} to configure .env.`,
        "Once you are done, restart the server.",
        "",
        `Running Probot v0.0.0-development (Node.js: ${process.version})`,
        `Listening on http://localhost:${port}`,
      ];

      const infoLogs = logOutput
        .filter((output: any) => output.level === pino.levels.values.info)
        .map((o) => o.msg);

      expect(infoLogs).toEqual(expect.arrayContaining(expMsgs));
    });

    it("should log welcome message with custom host and port", async () => {
      const server2 = new Server({
        log: pino(streamLogsToOutput),
        Probot: Probot.defaults({
          log: pino(streamLogsToOutput),
          // workaround for https://github.com/probot/probot/issues/1512
          appId: 1,
          privateKey: "dummy value for setup, see #1512",
        }),
        host: "localhost",
        port,
      });

      await server2.loadHandler(setupAppFactory("localhost", port));

      const expMsg = `Please follow the instructions at http://localhost:${port} to configure .env.`;

      const infoLogs = logOutput
        .filter((output: any) => output.level === pino.levels.values.info)
        .map((o) => o.msg);
      expect(infoLogs).toContain(expMsg);
    });
  });

  describe("GET /probot", () => {
    it("returns a 200 response", async () => {
      const response = await fetch(`http://localhost:${port}/probot`);
      expect(response.status).toBe(200);
    });
  });

  describe("GET /probot/setup", () => {
    it("returns a redirect", async () => {
      const port = await getPort();

      const mock = fetchMock
        .createInstance()
        .postOnce("https://api.github.com/app-manifests/123/conversions", {
          status: 201,
          body: {
            html_url: "/apps/my-app",
            id: "id",
            pem: "pem",
            webhook_secret: "webhook_secret",
            client_id: "Iv1.8a61f9b3a7aba766",
            client_secret: "1726be1638095a19edd134c77bde3aa2ece1e5d8",
          },
        });

      const server = new Server({
        Probot: Probot.defaults({
          log: pino(streamLogsToOutput),
          // workaround for https://github.com/probot/probot/issues/1512
          appId: 1,
          privateKey: "dummy value for setup, see #1512",
        }),
        log: pino(streamLogsToOutput),
        request: {
          fetch: mock.fetchHandler,
        },
        host: "localhost",
        port,
      });

      await server.loadHandler(setupAppFactory("localhost", port));

      await server.start();

      const setupResponse = await fetch(
        `http://localhost:${port}/probot/setup?code=123`,
        { redirect: "manual" },
      );

      expect(setupResponse.status).toBe(302);
      expect(setupResponse.headers.get("Location")).toBe(
        "/apps/my-app/installations/new",
      );

      expect(await setupResponse.text()).toMatchSnapshot();

      expect(mocks.createChannel).toHaveBeenCalledTimes(2);
      expect(mocks.updateDotenv.mock.calls).toMatchSnapshot();

      await server.stop();
    });

    it("throws a 400 Error if code is not provided", async () => {
      const server = new Server({
        Probot: Probot.defaults({
          log: pino(streamLogsToOutput),
          // workaround for https://github.com/probot/probot/issues/1512
          appId: 1,
          privateKey: "dummy value for setup, see #1512",
        }),
        log: pino(streamLogsToOutput),
      });

      await server.loadHandler(setupAppFactory("localhost", port));

      const setupResponse = await fetch(
        `http://localhost:${port}/probot/setup`,
      );

      expect(setupResponse.status).toBe(400);
      expect(await setupResponse.text()).toMatchSnapshot();
    });

    it("throws a 400 Error if code is an empty string", async () => {
      const server = new Server({
        Probot: Probot.defaults({
          log: pino(streamLogsToOutput),
          // workaround for https://github.com/probot/probot/issues/1512
          appId: 1,
          privateKey: "dummy value for setup, see #1512",
        }),
        log: pino(streamLogsToOutput),
      });

      await server.loadHandler(setupAppFactory(undefined, port));

      const setupResponse = await fetch(
        `http://localhost:${port}/probot/setup?code=`,
      );

      expect(setupResponse.status).toBe(400);

      expect(await setupResponse.text()).toMatchSnapshot();
    });
  });

  describe("GET /probot/import", () => {
    it("renders importView", async () => {
      const importView = await fetch(`http://localhost:${port}/probot/import`);

      expect(importView.status).toBe(200);
      expect(await importView.text()).toMatchSnapshot();
    });
  });

  describe("POST /probot/import", () => {
    it("updates .env", async () => {
      const body = JSON.stringify({
        appId: "foo",
        pem: "bar",
        webhook_secret: "baz",
      });

      const response = await fetch(`http://localhost:${port}/probot/import`, {
        body,
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      });

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("");

      expect(mocks.updateDotenv.mock.calls).toMatchSnapshot();
    });

    it("400 when keys are missing", async () => {
      const body = JSON.stringify({
        appId: "foo",
        /* no pem */
        webhook_secret: "baz",
      });

      const importResponse = await fetch(
        `http://localhost:${port}/probot/import`,
        {
          body,
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
        },
      );

      expect(importResponse.status).toBe(400);
      expect(await importResponse.text()).toMatchSnapshot();
    });
  });

  describe("GET /probot/success", () => {
    it("returns a 200 response", async () => {
      const successResponse = await fetch(
        `http://localhost:${port}/probot/success`,
      );

      expect(successResponse.status).toBe(200);

      expect(await successResponse.text()).toMatchSnapshot();

      expect(mocks.createChannel).toHaveBeenCalledTimes(1);
    });
  });
});
