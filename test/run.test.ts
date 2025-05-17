import path from "node:path";
import { fileURLToPath } from "node:url";

import { sign } from "@octokit/webhooks-methods";
import WebhookExamples, {
  type WebhookDefinition,
} from "@octokit/webhooks-examples";
import { describe, expect, it } from "vitest";
import getPort from "get-port";

import { Probot, run, Server } from "../src/index.js";

import { captureLogOutput } from "./helpers/capture-log-output.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultEnv: NodeJS.ProcessEnv = {
  APP_ID: "1",
  PRIVATE_KEY_PATH: path.join(__dirname, "fixtures", "test-private-key.pem"),
  WEBHOOK_PROXY_URL: "https://smee.io/EfHXC9BFfGAxbM6J",
  WEBHOOK_SECRET: "secret",
  LOG_LEVEL: "fatal",
};

describe("run", () => {
  let server: Server;

  describe("params", () => {
    it("runs with a function as argument", async () => {
      const env = { ...defaultEnv };

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

      const env = { ...defaultEnv };

      delete env.PRIVATE_KEY_PATH;
      env.PORT = (await getPort()).toString();

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
      const env = { ...defaultEnv };
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
      const env = { ...defaultEnv };
      server = await run(() => {}, { env });

      const dataString = JSON.stringify(pushEvent);

      const response = await fetch(
        `http://${server.host}:${server.port}/api/github/webhooks`,
        {
          method: "POST",
          body: dataString,
          headers: {
            "content-type": "application/json",
            "x-github-event": "push",
            "x-github-delivery": "123",
            "x-hub-signature-256": await sign("secret", dataString),
          },
        },
      );

      expect(response.status).toBe(200);

      await server.stop();
    });

    it("custom webhook path", async () => {
      const env = { ...defaultEnv };
      server = await run(() => {}, {
        env: {
          ...env,
          WEBHOOK_PATH: "/custom-webhook",
        },
      });

      const dataString = JSON.stringify(pushEvent);

      const response = await fetch(
        `http://${server.host}:${server.port}/custom-webhook`,
        {
          method: "POST",
          body: dataString,
          headers: {
            "content-type": "application/json",
            "x-github-event": "push",
            "x-github-delivery": "123",
            "x-hub-signature-256": await sign("secret", dataString),
          },
        },
      );

      expect(response.status).toBe(200);

      await server.stop();
    });
  });
});
