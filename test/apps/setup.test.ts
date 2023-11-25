import { Stream } from "node:stream";

import fetchMock from "fetch-mock";
import { pino } from "pino";
import request from "supertest";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { Probot, Server } from "../../src/index.js";
import { setupAppFactory } from "../../src/apps/setup.js";

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

describe("Setup app", () => {
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
    });

    await server.load(setupAppFactory(undefined, undefined));
  });

  afterEach(async () => {
    vi.clearAllMocks();
  });

  describe("logs", () => {
    it("should log welcome message", () => {
      const expMsgs = [
        "",
        "Welcome to Probot!",
        "Probot is in setup mode, webhooks cannot be received and",
        "custom routes will not work until APP_ID and PRIVATE_KEY",
        "are configured in .env.",
        "Please follow the instructions at http://localhost:3000 to configure .env.",
        "Once you are done, restart the server.",
        "",
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
      });

      await server2.load(setupAppFactory("127.0.0.1", 8080));

      const expMsg =
        "Please follow the instructions at http://127.0.0.1:8080 to configure .env.";

      const infoLogs = logOutput
        .filter((output: any) => output.level === pino.levels.values.info)
        .map((o) => o.msg);
      expect(infoLogs).toContain(expMsg);
    });
  });

  describe("GET /probot", () => {
    it("returns a 200 response", async () => {
      await request(server.expressApp).get("/probot").expect(200);
    });
  });

  describe("GET /probot/setup", () => {
    it("returns a redirect", async () => {
      const fetch = fetchMock
        .sandbox()
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
          fetch: async (url: string, options: { [key: string]: any }) => {
            return fetch(url, options);
          },
        },
      });

      await server.load(setupAppFactory(undefined, undefined));

      const setupResponse = await request(server.expressApp)
        .get("/probot/setup")
        .query({ code: "123" })
        .expect(302)
        .expect("Location", "/apps/my-app/installations/new");

      expect(setupResponse.text).toMatchSnapshot();

      expect(mocks.createChannel).toHaveBeenCalledTimes(2);
      expect(mocks.updateDotenv.mock.calls).toMatchSnapshot();
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

      await server.load(setupAppFactory(undefined, undefined));

      const setupResponse = await request(server.expressApp)
        .get("/probot/setup")
        .expect(400);

      expect(setupResponse.text).toMatchSnapshot();
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

      await server.load(setupAppFactory(undefined, undefined));

      const setupResponse = await request(server.expressApp)
        .get("/probot/setup")
        .query({ code: "" })
        .expect(400);

      expect(setupResponse.text).toMatchSnapshot();
    });
  });

  describe("GET /probot/import", () => {
    it("renders importView", async () => {
      const importView = await request(server.expressApp)
        .get("/probot/import")
        .expect(200);

      expect(importView.text).toMatchSnapshot();
    });
  });

  describe("POST /probot/import", () => {
    it("updates .env", async () => {
      const body = JSON.stringify({
        appId: "foo",
        pem: "bar",
        webhook_secret: "baz",
      });

      await request(server.expressApp)
        .post("/probot/import")
        .set("content-type", "application/json")
        .send(body)
        .expect(200)
        .expect("");

      expect(mocks.updateDotenv.mock.calls).toMatchSnapshot();
    });

    it("400 when keys are missing", async () => {
      const body = JSON.stringify({
        appId: "foo",
        /* no pem */
        webhook_secret: "baz",
      });

      const importResponse = await request(server.expressApp)
        .post("/probot/import")
        .set("content-type", "application/json")
        .send(body)
        .expect(400);

      expect(importResponse.text).toMatchSnapshot();
    });
  });

  describe("GET /probot/success", () => {
    it("returns a 200 response", async () => {
      const successResponse = await request(server.expressApp)
        .get("/probot/success")
        .expect(200);

      expect(successResponse.text).toMatchSnapshot();

      expect(mocks.createChannel).toHaveBeenCalledTimes(1);
    });
  });
});
