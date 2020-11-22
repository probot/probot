import Stream from "stream";

import { Probot, run, Server } from "../src";

import path = require("path");

// tslint:disable:no-empty
describe("run", () => {
  let probot: Probot;
  let server: Server;
  let output: any;

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  beforeEach(() => {
    // Clear log output
    output = [];
    process.env.DISABLE_WEBHOOK_EVENT_CHECK = "true";
    probot = new Probot({ githubToken: "faketoken" });
  });

  describe("run", () => {
    let env: NodeJS.ProcessEnv;

    beforeAll(() => {
      env = { ...process.env };
      process.env.APP_ID = "1";
      process.env.PRIVATE_KEY_PATH = path.join(
        __dirname,
        "test-private-key.pem"
      );
      process.env.WEBHOOK_PROXY_URL = "https://smee.io/EfHXC9BFfGAxbM6J";
      process.env.WEBHOOK_SECRET = "secret";
    });

    afterAll(() => {
      process.env = env;
    });

    it("runs with a function as argument", async () => {
      let initialized = false;

      server = await run(() => {
        initialized = true;
      });
      expect(initialized).toBeTruthy();
      await server.stop();
    });

    it("runs with an array of strings", async () => {
      server = await run(["node", "probot-run", "./test/fixtures/example.js"]);
      await server.stop();
    });

    it("runs without config and loads the setup app", async () => {
      let initialized = false;
      delete process.env.PRIVATE_KEY_PATH;
      process.env.PORT = "3003";

      return new Promise(async (resolve) => {
        server = await run(({ app }: { app: Probot }) => {
          initialized = true;
        });
        expect(initialized).toBeFalsy();
        await server.stop();

        resolve(null);
      });
    });

    it("has version", async () => {
      return new Promise(async (resolve) => {
        server = await run(({ app }: { app: Probot }) => {});
        expect(probot.version).toBe("0.0.0-development");
        await server.stop();

        resolve(null);
      });
    });
  });
});
