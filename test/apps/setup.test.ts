import { jest } from "@jest/globals";
import nock from "nock";
import pino from "pino";
import { Stream } from "stream";
import request from "supertest";

import { Probot, Server } from "../../src";
import { setupAppFactory } from "../../src/apps/setup";

const createChannel = jest
  .fn<() => Promise<string>>()
  .mockResolvedValue("mocked proxy URL");
const updateDotenv = jest
  .fn<() => Promise<Record<string, string>>>()
  .mockResolvedValue({});
jest.mock("smee-client", () => ({ createChannel }));
jest.mock("update-dotenv", () => updateDotenv);

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
    jest.clearAllMocks();
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
      nock("https://api.github.com")
        .post("/app-manifests/123/conversions")
        .reply(201, {
          html_url: "/apps/my-app",
          id: "id",
          pem: "pem",
          webhook_secret: "webhook_secret",
          client_id: "Iv1.8a61f9b3a7aba766",
          client_secret: "1726be1638095a19edd134c77bde3aa2ece1e5d8",
        });

      await request(server.expressApp)
        .get("/probot/setup")
        .query({ code: "123" })
        .expect(302)
        .expect("Location", "/apps/my-app/installations/new");

      // Todo Does not get called
      expect(createChannel).toHaveBeenCalledTimes(1);
      // Todo Does not match
      expect(updateDotenv.mock.calls).toMatchSnapshot();
    });
  });

  describe("GET /probot/import", () => {
    it("renders import.handlebars", async () => {
      await request(server.expressApp).get("/probot/import").expect(200);
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

      expect(updateDotenv.mock.calls).toMatchSnapshot();
    });

    it("400 when keys are missing", async () => {
      const body = JSON.stringify({
        appId: "foo",
        /* no pem */
        webhook_secret: "baz",
      });

      await request(server.expressApp)
        .post("/probot/import")
        .set("content-type", "application/json")
        .send(body)
        .expect(400);
    });
  });

  describe("GET /probot/success", () => {
    it("returns a 200 response", async () => {
      await request(server.expressApp).get("/probot/success").expect(200);

      expect(createChannel).toHaveBeenCalledTimes(1);
    });
  });
});
