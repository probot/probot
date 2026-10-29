import path from "node:path";
import { fileURLToPath } from "node:url";

import { sign } from "@octokit/webhooks-methods";
import getPort from "get-port";
import { pino } from "pino";
import { describe, expect, it, vi } from "vitest";

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
    it("exits with an error when no app path is provided", async () => {
      const exitError = new Error("process.exit called");
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const exit = vi.spyOn(process, "exit").mockImplementation(() => {
        throw exitError;
      });

      try {
        await expect(
          run(
            [
              "node",
              "probot",
              "--app",
              "1",
              "--private-key",
              path.join(__dirname, "fixtures", "test-private-key.pem"),
            ],
            {
              env: defaultEnv,
              log: pino({ level: "silent" }),
              updateEnv,
            },
          ),
        ).rejects.toThrow(exitError);

        expect(consoleError).toHaveBeenCalledWith(
          "No app path provided. Please provide the path to the app you want to run.",
        );
        expect(exit).toHaveBeenCalledWith(1);
      } finally {
        consoleError.mockRestore();
        exit.mockRestore();
      }
    });

    it("requires an app ID in production", async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        await expect(
          run(() => {}, {
            env: {
              PRIVATE_KEY_PATH: defaultEnv.PRIVATE_KEY_PATH,
            },
            log: pino({ level: "silent" }),
            updateEnv,
          }),
        ).rejects.toThrow(
          "App ID is missing, and is required to run in production mode.",
        );
      } finally {
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNodeEnv;
      }
    });

    it("requires a private key in production", async () => {
      const previousNodeEnv = process.env.NODE_ENV;
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      process.env.NODE_ENV = "production";

      try {
        await expect(
          run(() => {}, {
            env: {
              APP_ID: "1",
              PRIVATE_KEY_PATH: "/definitely/missing-private-key.pem",
            },
            log: pino({ level: "silent" }),
            updateEnv,
          }),
        ).rejects.toThrow(
          "Certificate is missing, and is required to run in production mode.",
        );
        expect(consoleError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("Private key does not exists"),
          }),
        );
      } finally {
        consoleError.mockRestore();
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNodeEnv;
      }
    });

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
      const logTarget = new MockLoggerTarget();
      const server = await run(
        [
          "node",
          "probot-run",
          "--app",
          "1",
          "--private-key",
          path.join(__dirname, "fixtures", "test-private-key.pem"),
          "./test/fixtures/example.js",
          "--log-level",
          "info",
        ],
        {
          updateEnv,
          log: pino(logTarget),
          SmeeClient: { createChannel: async () => "dummy" },
        },
      );
      try {
        expect(logTarget.entries.map(({ msg }) => msg)).toContain("loaded app");
      } finally {
        await server.stop();
      }
    });

    it("runs without config and loads the setup app", async () => {
      const env = {
        WEBHOOK_PROXY_URL: "https://smee.io/EfHXC9BFfGAxbM6J",
        WEBHOOK_SECRET: "secret",
        LOG_LEVEL: "fatal" as const,
        PORT: (await getPort()).toString(),
      };

      let appStarted = false;
      const server = await run(
        (_app: Probot) => {
          appStarted = true;
        },
        {
          env,
          updateEnv,
          SmeeClient: { createChannel: async () => "dummy" },
        },
      );
      try {
        expect(appStarted).toBe(false);
      } finally {
        await server.stop();
      }
    });

    it("uses default setup dependencies when they are omitted", async () => {
      const previousNoSmeeSetup = process.env.NO_SMEE_SETUP;
      process.env.NO_SMEE_SETUP = "true";
      const port = await getPort();

      try {
        const server = await run(() => {}, {
          env: {
            LOG_LEVEL: "fatal",
            PORT: port.toString(),
          },
          log: pino({ level: "silent" }),
        });

        const response = await fetch(
          `http://${server.host}:${server.port}/probot`,
        );
        expect(response.status).toBe(200);
        expect(await response.text()).toContain("Welcome to probot");

        await server.stop();
      } finally {
        if (previousNoSmeeSetup === undefined) {
          delete process.env.NO_SMEE_SETUP;
        } else {
          process.env.NO_SMEE_SETUP = previousNoSmeeSetup;
        }
      }
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

    it("accepts valid credentials in production", async () => {
      const port = await getPort();
      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        const server = await run(() => {}, {
          env: { ...defaultEnv, PORT: port.toString() },
          log: pino({ level: "silent" }),
          updateEnv,
        });
        await server.stop();
      } finally {
        if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousNodeEnv;
      }
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
