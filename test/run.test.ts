import path from "node:path";
import { fileURLToPath } from "node:url";

import { sign } from "@octokit/webhooks-methods";
import getPort from "get-port";
import { pino } from "pino";
import { describe, expect, it } from "vitest";

import { type Probot, run } from "../src/index.js";
import { MockLoggerTarget } from "./utils.js";

import WebhookExamples, {
  type WebhookDefinition,
} from "@octokit/webhooks-examples";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultEnv: NodeJS.ProcessEnv = {
  APP_ID: "1",
  PRIVATE_KEY_PATH: path.join(__dirname, "fixtures", "test-private-key.pem"),
  WEBHOOK_PROXY_URL: "https://smee.io/EfHXC9BFfGAxbM6J",
  WEBHOOK_SECRET: "secret",
  LOG_LEVEL: "fatal",
};

const updateEnv = (env: NodeJS.ProcessEnv): NodeJS.ProcessEnv => {
  return env;
};

describe("run", () => {
  describe("params", () => {
    it("runs with a function as argument", async () => {
      const port = await getPort();
      const env = { ...defaultEnv, PORT: port.toString() };

      let initialized = false;

      const server = await run(
        () => {
          initialized = true;
        },
        { env, updateEnv, SmeeClient: { createChannel: async () => "dummy" } },
      );
      expect(initialized).toBe(true);
      await server.stop();
    });

    it("runs with an array of strings", async () => {
      const server = await run(
        [
          "node",
          "probot-run",
          "./test/fixtures/example.js",
          "--log-level",
          "fatal",
        ],
        { updateEnv, SmeeClient: { createChannel: async () => "dummy" } },
      );
      await server.stop();
    });

    it("runs without config and loads the setup app", async () => {
      const env = {
        WEBHOOK_PROXY_URL: "https://smee.io/EfHXC9BFfGAxbM6J",
        WEBHOOK_SECRET: "secret",
        LOG_LEVEL: "fatal" as const,
        PORT: (await getPort()).toString(),
      };

      await new Promise(async (resolve, reject) => {
        const server = await run(
          (_app: Probot) => {
            reject(new Error("Should not start the app"));
          },
          {
            env,
            updateEnv,
            SmeeClient: { createChannel: async () => "dummy" },
          },
        );
        await server.stop();

        resolve(null);
      });
    });

    it("defaults to JSON logs if NODE_ENV is set to 'production'", async () => {
      const port = await getPort();
      const env = { ...defaultEnv, PORT: port.toString() };
      env.NODE_ENV = "production";

      const logTarget = new MockLoggerTarget();
      const log = pino(logTarget);

      const server = await run(
        async (app) => {
          app.log.fatal("test");
        },
        { env, updateEnv, log },
      );
      await server.stop();

      expect(logTarget.entries[0].level).toBe(60);
      expect(logTarget.entries[0].msg).toBe("test");
      expect(logTarget.entries[0].name).toBe("probot");
    });
  });

  describe("webhooks", () => {
    const pushEvent = JSON.stringify(
      (
        (WebhookExamples as unknown as WebhookDefinition[]).filter(
          (event) => event.name === "push",
        )[0] as WebhookDefinition<"push">
      ).examples[0],
    );

    it("POST /api/github/webhooks", async () => {
      const port = await getPort();
      const env = { ...defaultEnv, PORT: port.toString() };
      const server = await run(() => {}, { env, updateEnv });

      const response = await fetch(
        `http://${server.host}:${server.port}/api/github/webhooks`,
        {
          method: "POST",
          body: pushEvent,
          headers: {
            "content-type": "application/json",
            "x-github-event": "push",
            "x-github-delivery": "123",
            "x-hub-signature-256": await sign("secret", pushEvent),
          },
        },
      );

      expect(response.status).toBe(200);

      await server.stop();
    });

    it("custom webhook path", async () => {
      const port = await getPort();
      const env = {
        ...defaultEnv,
        PORT: port.toString(),
        WEBHOOK_PATH: "/custom-webhook",
      };
      const server = await run(() => {}, {
        env,
        updateEnv: (env) => env,
      });

      const response = await fetch(
        `http://${server.host}:${server.port}/custom-webhook`,
        {
          method: "POST",
          body: pushEvent,
          headers: {
            "content-type": "application/json",
            "x-github-event": "push",
            "x-hub-signature-256": await sign("secret", pushEvent),
            "x-github-delivery": "123",
          },
        },
      );

      expect(response.status).toBe(200);
      await server.stop();
    });
  });
});
