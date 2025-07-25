import fetchMock from "fetch-mock";
import { pino } from "pino";
import getPort from "get-port";
import { describe, expect, it } from "vitest";

import type { Env } from "../../src/types.js";
import { Probot, Server } from "../../src/index.js";
import { setupAppFactory } from "../../src/apps/setup.js";

import { importView } from "../../src/views/import.js";
import { successView } from "../../src/views/success.js";

import { getRuntimeName } from "../../src/helpers/get-runtime-name.js";
import { getRuntimeVersion } from "../../src/helpers/get-runtime-version.js";
import { MockLoggerTarget } from "../utils.js";

describe("Setup app", () => {
  let updateEnvCalls: Env[] = [];
  function updateEnv(env: Env) {
    updateEnvCalls.push(env);
    return env;
  }

  let SmeeClientCreateChannelCalls: any[] = [];
  const SmeeClient = {
    createChannel: async () => {
      SmeeClientCreateChannelCalls.push("createChannel");
      return "https://smee.io/1234ab1234";
    },
  };

  const reset = () => {
    updateEnvCalls = [];
    SmeeClientCreateChannelCalls = [];
  };

  describe("logs", () => {
    it("should log welcome message", async () => {
      reset();

      const logTarget = new MockLoggerTarget();
      const log = pino(logTarget);

      const server = new Server({
        Probot: Probot.defaults({
          log,
          // workaround for https://github.com/probot/probot/issues/1512
          appId: 1,
          privateKey: "dummy value for setup, see #1512",
        }),
        log,
        port: await getPort(),
      });

      await server.loadHandlerFactory(
        setupAppFactory({
          log,
          host: server.host,
          port: server.port,
          updateEnv,
          SmeeClient,
        }),
      );

      await server.start();

      const expMsgs = [
        "",
        "Welcome to Probot!",
        "Probot is in setup mode, webhooks cannot be received and",
        "custom routes will not work until APP_ID and PRIVATE_KEY",
        "are configured in .env.",
        `Please follow the instructions at http://localhost:${server.port} to configure .env.`,
        "Once you are done, restart the server.",
        "",
        `Running Probot v0.0.0-development (${getRuntimeName(globalThis)}: ${getRuntimeVersion(globalThis)})`,
        `Listening on http://localhost:${server.port}`,
      ];

      const infoLogs = logTarget.entries
        .filter((output: any) => output.level === pino.levels.values.info)
        .map((o) => o.msg);

      expect(infoLogs.length).toBe(expMsgs.length);
      expect(infoLogs[0]).toBe(expMsgs[0]);
      expect(infoLogs[1]).toBe(expMsgs[1]);
      expect(infoLogs[2]).toBe(expMsgs[2]);
      expect(infoLogs[3]).toBe(expMsgs[3]);
      expect(infoLogs[4]).toBe(expMsgs[4]);
      expect(infoLogs[5]).toBe(expMsgs[5]);
      expect(infoLogs[6]).toBe(expMsgs[6]);
      expect(infoLogs[7]).toBe(expMsgs[7]);
      expect(infoLogs[8]).toBe(expMsgs[8]);
      expect(infoLogs[9]).toBe(expMsgs[9]);

      await server.stop();
    });

    it("should log welcome message with custom host and port", async () => {
      reset();

      const port = await getPort();
      const logTarget = new MockLoggerTarget();
      const log = pino(logTarget);

      const server = new Server({
        log,
        Probot: Probot.defaults({
          log,
          // workaround for https://github.com/probot/probot/issues/1512
          appId: 1,
          privateKey: "dummy value for setup, see #1512",
          port,
        }),
        host: "localhost",
      });

      await server.loadHandlerFactory(
        setupAppFactory({
          log,
          host: server.host,
          port: server.port,
          updateEnv,
          SmeeClient,
        }),
      );

      const expMsg = `Please follow the instructions at http://${server.host}:${server.port} to configure .env.`;

      const infoLogs = logTarget.entries
        .filter((output: any) => output.level === pino.levels.values.info)
        .map((o) => o.msg);

      expect(infoLogs[5]).toBe(expMsg);
    });
  });

  describe("GET /probot", () => {
    it("returns a 200 response", async () => {
      reset();

      const logTarget = new MockLoggerTarget();
      const log = pino(logTarget);

      const server = new Server({
        Probot: Probot.defaults({
          log,
          // workaround for https://github.com/probot/probot/issues/1512
          appId: 1,
          privateKey: "dummy value for setup, see #1512",
        }),
        log,
        port: await getPort(),
      });

      await server.loadHandlerFactory(
        setupAppFactory({
          log,
          host: server.host,
          port: server.port,
          updateEnv,
          SmeeClient,
        }),
      );

      await server.start();

      const response = await fetch(
        `http://${server.host}:${server.port}/probot`,
      );
      expect(response.status).toBe(200);
      await server.stop();
    });
  });

  describe("GET /probot/setup", () => {
    it("returns a redirect", async () => {
      reset();
      const logTarget = new MockLoggerTarget();
      const log = pino(logTarget);

      const mock = fetchMock
        .createInstance()
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
          log,
          // workaround for https://github.com/probot/probot/issues/1512
          appId: 1,
          privateKey: "dummy value for setup, see #1512",
        }),
        log,
        request: {
          fetch: mock.fetchHandler,
        },
        port: await getPort(),
      });

      await server.loadHandlerFactory(
        setupAppFactory({
          log,
          host: server.host,
          port: server.port,
          request: {
            fetch: mock.fetchHandler,
          },
          updateEnv,
          SmeeClient,
        }),
      );

      await server.start();

      const setupResponse = await fetch(
        `http://${server.host}:${server.port}/probot/setup?code=123`,
        { method: "GET", redirect: "manual" },
      );

      expect(setupResponse.status).toBe(302);
      expect(setupResponse.headers.get("location")).toBe(
        "/apps/my-app/installations/new",
      );

      expect(await setupResponse.text()).toBe(
        "Found. Redirecting to /apps/my-app/installations/new",
      );

      expect(updateEnvCalls.length).toBe(2);

      expect(Object.keys(updateEnvCalls[0]).length).toBe(1);
      expect(updateEnvCalls[0].WEBHOOK_PROXY_URL).toBe(
        "https://smee.io/1234ab1234",
      );

      expect(Object.keys(updateEnvCalls[1]).length).toBe(5);
      expect(updateEnvCalls[1].APP_ID).toBe("id");
      expect(updateEnvCalls[1].GITHUB_CLIENT_ID).toBe("Iv1.8a61f9b3a7aba766");
      expect(updateEnvCalls[1].GITHUB_CLIENT_SECRET).toBe(
        "1726be1638095a19edd134c77bde3aa2ece1e5d8",
      );
      expect(updateEnvCalls[1].PRIVATE_KEY).toBe('"pem"');
      expect(updateEnvCalls[1].WEBHOOK_SECRET).toBe("webhook_secret");

      await server.stop();
    });

    it("throws a 400 Error if code is not provided", async () => {
      reset();
      const logTarget = new MockLoggerTarget();
      const log = pino(logTarget);

      const server = new Server({
        Probot: Probot.defaults({
          log,
          // workaround for https://github.com/probot/probot/issues/1512
          appId: 1,
          privateKey: "dummy value for setup, see #1512",
        }),
        log,
        port: await getPort(),
      });

      await server.loadHandlerFactory(
        setupAppFactory({
          log,
          host: server.host,
          port: server.port,
          updateEnv,
          SmeeClient,
        }),
      );

      await server.start();

      const setupResponse = await fetch(
        `http://${server.host}:${server.port}/probot/setup`,
      );

      expect(setupResponse.status).toBe(400);
      expect(await setupResponse.text()).toBe("code missing or invalid");

      await server.stop();
    });

    it("throws a 400 Error if code is an empty string", async () => {
      reset();
      const logTarget = new MockLoggerTarget();
      const log = pino(logTarget);

      const server = new Server({
        Probot: Probot.defaults({
          log,
          // workaround for https://github.com/probot/probot/issues/1512
          appId: 1,
          privateKey: "dummy value for setup, see #1512",
        }),
        log,
        port: await getPort(),
      });

      await server.loadHandlerFactory(
        setupAppFactory({
          log,
          host: server.host,
          port: server.port,
          updateEnv,
          SmeeClient,
        }),
      );

      await server.start();

      const setupResponse = await fetch(
        `http://${server.host}:${server.port}/probot/setup?code=`,
      );

      expect(setupResponse.status).toBe(400);
      expect(await setupResponse.text()).toBe("code missing or invalid");

      await server.stop();
    });
  });

  describe("GET /probot/import", () => {
    it("renders importView", async () => {
      reset();
      const logTarget = new MockLoggerTarget();
      const log = pino(logTarget);

      const server = new Server({
        Probot: Probot.defaults({
          log,
          // workaround for https://github.com/probot/probot/issues/1512
          appId: 1,
          privateKey: "dummy value for setup, see #1512",
        }),
        log,
        port: await getPort(),
      });

      await server.loadHandlerFactory(
        setupAppFactory({
          log,
          host: server.host,
          port: server.port,
          updateEnv,
          SmeeClient,
        }),
      );

      await server.start();

      const importResponse = await fetch(
        `http://${server.host}:${server.port}/probot/import`,
      );

      expect(importResponse.status).toBe(200);
      expect(await importResponse.text()).toBe(
        importView({
          name: "probot",
          GH_HOST: "https://github.com",
          WEBHOOK_PROXY_URL: "",
        }),
      );

      await server.stop();
    });
  });

  describe("POST /probot/import", () => {
    it("updates .env", async () => {
      reset();
      const logTarget = new MockLoggerTarget();
      const log = pino(logTarget);

      const server = new Server({
        Probot: Probot.defaults({
          log,
          // workaround for https://github.com/probot/probot/issues/1512
          appId: 1,
          privateKey: "dummy value for setup, see #1512",
        }),
        log,
        port: await getPort(),
      });

      await server.loadHandlerFactory(
        setupAppFactory({
          log,
          host: server.host,
          port: server.port,
          updateEnv,
          SmeeClient,
        }),
      );

      await server.start();
      const body = JSON.stringify({
        appId: "foo",
        pem: "bar",
        webhook_secret: "baz",
      });

      const response = await fetch(
        `http://${server.host}:${server.port}/probot/import`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body,
        },
      );

      expect(response.status).toBe(200);
      expect(await response.text()).toBe("");

      expect(updateEnvCalls.length).toBe(2);

      expect(Object.keys(updateEnvCalls[0]).length).toBe(1);

      expect(updateEnvCalls[0].WEBHOOK_PROXY_URL).toBe(
        "https://smee.io/1234ab1234",
      );

      expect(Object.keys(updateEnvCalls[1]).length).toBe(3);
      expect(updateEnvCalls[1].APP_ID).toBe("foo");
      expect(updateEnvCalls[1].PRIVATE_KEY).toBe('"bar"');
      expect(updateEnvCalls[1].WEBHOOK_SECRET).toBe("baz");

      await server.stop();
    });

    it("400 when keys are missing", async () => {
      reset();
      const logTarget = new MockLoggerTarget();
      const log = pino(logTarget);
      const server = new Server({
        Probot: Probot.defaults({
          log,
          // workaround for https://github.com/probot/probot/issues/1512
          appId: 1,
          privateKey: "dummy value for setup, see #1512",
        }),
        log,
        port: await getPort(),
      });

      await server.loadHandlerFactory(
        setupAppFactory({
          log,
          host: server.host,
          port: server.port,
          updateEnv,
          SmeeClient,
        }),
      );

      await server.start();
      const body = JSON.stringify({
        appId: "foo",
        /* no pem */
        webhook_secret: "baz",
      });

      const importResponse = await fetch(
        `http://${server.host}:${server.port}/probot/import`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body,
        },
      );

      expect(importResponse.status).toBe(400);
      expect(await importResponse.text()).toBe(
        "appId and/or pem and/or webhook_secret missing",
      );

      await server.stop();
    });
  });

  describe("GET /probot/success", () => {
    it("returns a 200 response", async () => {
      reset();
      const logTarget = new MockLoggerTarget();
      const log = pino(logTarget);

      const server = new Server({
        Probot: Probot.defaults({
          log,
          // workaround for https://github.com/probot/probot/issues/1512
          appId: 1,
          privateKey: "dummy value for setup, see #1512",
        }),
        log,
        port: await getPort(),
      });

      await server.loadHandlerFactory(
        setupAppFactory({
          log,
          host: server.host,
          port: server.port,
          updateEnv,
          SmeeClient,
        }),
      );

      await server.start();
      const successResponse = await fetch(
        `http://${server.host}:${server.port}/probot/success`,
      );

      expect(successResponse.status).toBe(200);
      expect(await successResponse.text()).toBe(
        successView({
          name: "probot",
        }),
      );

      expect(updateEnvCalls.length).toBe(1);
      expect(Object.keys(updateEnvCalls[0]).length).toBe(1);
      expect(updateEnvCalls[0].WEBHOOK_PROXY_URL).toBe(
        "https://smee.io/1234ab1234",
      );
      expect(SmeeClientCreateChannelCalls.length).toBe(1);

      await server.stop();
    });
  });
});
