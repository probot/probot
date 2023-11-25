import path from "node:path";

import request from "supertest";
import { sign } from "@octokit/webhooks-methods";
import { describe, expect, it, beforeEach } from "vitest";

import { Probot, run, Server } from "../src/index.js";

import { captureLogOutput } from "./helpers/capture-log-output.js";
import WebhookExamples, {
  type WebhookDefinition,
} from "@octokit/webhooks-examples";

describe("run", () => {
  let server: Server;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    env = {
      APP_ID: "1",
      PRIVATE_KEY_PATH: path.join(
        __dirname,
        "fixtures",
        "test-private-key.pem",
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
        { env },
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
          (_app: Probot) => {
            initialized = true;
          },
          { env },
        );
        expect(initialized).toBeFalsy();
        await server.stop();

        resolve(null);
      });
    });

    it("defaults to JSON logs if NODE_ENV is set to 'production'", async () => {
      let outputData = "";
      env.NODE_ENV = "production";

      server = await run(
        async (app) => {
          outputData = await captureLogOutput(async () => {
            app.log.fatal("test");
          }, app.log);
        },
        { env },
      );
      await server.stop();

      expect(outputData).toMatch(/"msg":"test"/);
    });
  });

  describe("webhooks", () => {
    const pushEvent = (
      (WebhookExamples as unknown as WebhookDefinition[]).filter(
        (event) => event.name === "push",
      )[0] as WebhookDefinition<"push">
    ).examples[0];

    it("POST /api/github/webhooks", async () => {
      server = await run(() => {}, { env });

      const dataString = JSON.stringify(pushEvent);

      await request(server.expressApp)
        .post("/api/github/webhooks")
        .send(dataString)
        .set("content-type", "application/json")
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
          .set("content-type", "application/json")
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
