import path from "node:path";
import { fileURLToPath } from "node:url";

import { sign } from "@octokit/webhooks-methods";
import { describe, expect, it } from "vitest";

import { type Probot, run } from "../src/index.js";

import { captureLogOutput } from "./helpers/capture-log-output.js";
import WebhookExamples, {
  type WebhookDefinition,
} from "@octokit/webhooks-examples";
import getPort from "get-port";

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
      expect(initialized).toBeTruthy();
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
      let initialized = false;

      const port = await getPort();
      const env = { ...defaultEnv, PORT: port.toString() };

      delete env.PRIVATE_KEY_PATH;
      env.PORT = (await getPort()).toString();

      return new Promise(async (resolve) => {
        const server = await run(
          (_app: Probot) => {
            initialized = true;
          },
          {
            env,
            updateEnv,
            SmeeClient: { createChannel: async () => "dummy" },
          },
        );
        expect(initialized).toBeFalsy();
        await server.stop();

        resolve(null);
      });
    });

    it("defaults to JSON logs if NODE_ENV is set to 'production'", async () => {
      let outputData = "";
      const port = await getPort();
      const env = { ...defaultEnv, PORT: port.toString() };
      env.NODE_ENV = "production";

      const server = await run(
        async (app) => {
          outputData = await captureLogOutput(async () => {
            app.log.fatal("test");
          }, app.log);
        },
        { env, updateEnv },
      );
      await server.stop();

      expect(outputData).toMatch(/"msg":"test"/);
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

      try {
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
      } finally {
        await server.stop();
      }
    });
  });
});
