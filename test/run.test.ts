import path from "node:path";
import { fileURLToPath } from "node:url";

import { sign } from "@octokit/webhooks-methods";
import getPort from "get-port";
import { describe, expect, it, beforeEach } from "vitest";

import { Probot, run } from "../src/index.js";

import { captureLogOutput } from "./helpers/capture-log-output.js";
import WebhookExamples, {
  type WebhookDefinition,
} from "@octokit/webhooks-examples";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("run", async () => {
  let env: NodeJS.ProcessEnv;
  let port = await getPort();

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

      const server = await run(
        () => {
          initialized = true;
        },
        { env: { ...env, PORT: port + "" } },
      );
      expect(initialized).toBeTruthy();
      await server.stop();
    });

    it("runs with an array of strings", async () => {
      const server = await run([
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
        const server = await run(
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

      const server = await run(
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
      const server = await run(() => {}, { env: { ...env, PORT: port + "" } });

      const dataString = JSON.stringify(pushEvent);

      const response = await fetch(
        `http://localhost:${port}/api/github/webhooks`,
        {
          method: "POST",
          body: dataString,
          headers: {
            "content-type": "application/json",
            "x-github-event": "push",
            "x-hub-signature-256": await sign("secret", dataString),
            "x-github-delivery": "123",
          },
        },
      );

      expect(response.status).toBe(200);

      await server.stop();
    });

    it("custom webhook path", async () => {
      const server = await run(() => {}, {
        env: {
          ...env,
          WEBHOOK_PATH: "/custom-webhook",
          PORT: port + "",
        },
      });

      const dataString = JSON.stringify(pushEvent);

      try {
        const response = await fetch(
          `http://localhost:${port}/custom-webhook`,
          {
            method: "POST",
            body: dataString,
            headers: {
              "content-type": "application/json",
              "x-github-event": "push",
              "x-hub-signature-256": await sign("secret", dataString),
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
