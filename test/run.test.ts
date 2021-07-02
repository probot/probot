import Stream from "stream";
import path = require("path");

import request from "supertest";
import { sign } from "@octokit/webhooks-methods";

import { Probot, run, Server } from "../src";

// tslint:disable:no-empty
describe("run", () => {
  let server: Server;
  let output: any;
  let env: NodeJS.ProcessEnv;

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  beforeEach(() => {
    // Clear log output
    output = [];
    env = {
      APP_ID: "1",
      PRIVATE_KEY_PATH: path.join(
        __dirname,
        "fixtures",
        "test-private-key.pem"
      ),
      WEBHOOK_PROXY_URL: "https://smee.io/EfHXC9BFfGAxbM6J",
      WEBHOOK_SECRET: "secret",
      LOG_LEVEL: "fatal",
    };
  });

  describe("params", () => {
    it("runs with a function as argument", async () => {
      let initialized = false;

      server = await run(
        () => {
          initialized = true;
        },
        { env }
      );
      expect(initialized).toBeTruthy();
      await server.stop();
    });

    it("runs with an array of strings", async () => {
      server = await run([
        "node",
        "probot-run",
        "./test/fixtures/example.js",
        "--log-level",
        "fatal",
      ]);
      await server.stop();
    });

    it("runs without config and loads the setup app", async () => {
      let initialized = false;
      delete env.PRIVATE_KEY_PATH;
      env.PORT = "3003";

      return new Promise(async (resolve) => {
        server = await run(
          (app: Probot) => {
            initialized = true;
          },
          { env }
        );
        expect(initialized).toBeFalsy();
        await server.stop();

        resolve(null);
      });
    });
  });

  describe("webhooks", () => {
    const pushEvent = require("./fixtures/webhook/push.json");

    it("POST /", async () => {
      server = await run(() => {}, { env });

      const dataString = JSON.stringify(pushEvent);

      await request(server.expressApp)
        .post("/")
        .send(dataString)
        .set("x-github-event", "push")
        .set("x-hub-signature-256", await sign("secret", dataString))
        .set("x-github-delivery", "123")
        .expect(200);

      await server.stop();
    });

    it("custom webhook path", async () => {
      server = await run(() => {}, {
        env: {
          ...env,
          WEBHOOK_PATH: "/custom-webhook",
        },
      });

      const dataString = JSON.stringify(pushEvent);

      try {
        await request(server.expressApp)
          .post("/custom-webhook")
          .send(dataString)
          .set("x-github-event", "push")
          .set("x-hub-signature-256", await sign("secret", dataString))
          .set("x-github-delivery", "123")
          .expect(200);
      } finally {
        await server.stop();
      }
    });
  });
});
