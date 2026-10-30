import type { IncomingMessage, ServerResponse } from "node:http";
import fetchMock from "fetch-mock";
import pino from "pino";
import getPort from "get-port";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { Env } from "../../src/types.js";
import { Probot, Server } from "../../src/index.js";
let setupAppFactoryImpl: typeof import("../../src/apps/setup.js").setupAppFactory;

const SETUP_TOKEN = "test-setup-token";

const setupAppFactory = (options: Parameters<typeof setupAppFactoryImpl>[0]) =>
  setupAppFactoryImpl({
    ...options,
    env: options.env ?? { PROBOT_SETUP_TOKEN: SETUP_TOKEN },
  });

import { importView } from "../../src/views/import.js";
import { successView } from "../../src/views/success.js";

import { getRuntimeName } from "../../src/helpers/get-runtime-name.js";
import { getRuntimeVersion } from "../../src/helpers/get-runtime-version.js";
import { MockLoggerTarget } from "../utils.js";

const exec = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ exec }));

beforeAll(async () => {
  vi.resetModules();
  ({ setupAppFactory: setupAppFactoryImpl } =
    await import("../../src/apps/setup.js"));
});

afterAll(() => {
  vi.doUnmock("node:child_process");
  vi.resetModules();
});

describe("Setup app", () => {
  const activeServers = new Set<Server>();
  const startServer = Server.prototype.start;

  beforeEach(() => {
    vi.spyOn(Server.prototype, "start").mockImplementation(async function (
      this: Server,
    ) {
      activeServers.add(this);
      return startServer.call(this);
    });
  });

  afterEach(async () => {
    await Promise.all([...activeServers].map((server) => server.stop()));
    activeServers.clear();
    vi.restoreAllMocks();
  });

  let updateEnvCalls: Env[] = [];
  function updateEnv(env: Env) {
    updateEnvCalls.push(env);
    return env;
  }

  let SmeeClientCreateChannelCalls: string[] = [];
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

  it("returns false for an unhandled request", async () => {
    const handler = await setupAppFactory({
      log: pino({ level: "silent" }),
      host: "localhost",
      port: 3000,
      updateEnv,
      env: { NO_SMEE_SETUP: "true", PROBOT_SETUP_TOKEN: SETUP_TOKEN },
    })();

    await expect(
      handler(
        { method: "GET", url: "/not-found" } as unknown as IncomingMessage,
        {} as unknown as ServerResponse,
      ),
    ).resolves.toBe(false);
  });

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
        .filter((output) => output.level === pino.levels.values.info)
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
        port,
        Probot: Probot.defaults({
          log,
          // workaround for https://github.com/probot/probot/issues/1512
          appId: 1,
          privateKey: "dummy value for setup, see #1512",
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
        .filter((output) => output.level === pino.levels.values.info)
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

      const rootResponse = await fetch(
        `http://${server.host}:${server.port}/`,
        { redirect: "manual" },
      );
      expect(rootResponse.status).toBe(302);
      expect(rootResponse.headers.get("location")).toBe("/probot");

      await server.stop();
    });
  });

  describe("GET /probot/setup", () => {
    it("logs the restart message", async () => {
      const mock = fetchMock
        .createInstance()
        .postOnce("https://api.github.com/app-manifests/123/conversions", {
          status: 201,
          body: {
            html_url: "/apps/my-app",
            id: "id",
            pem: "pem",
            webhook_secret: "webhook_secret",
          },
        });
      const logTarget = new MockLoggerTarget();
      const log = pino(logTarget);
      const handler = await setupAppFactory({
        log,
        host: "localhost",
        port: 3000,
        request: { fetch: mock.fetchHandler },
        updateEnv,
        env: { NO_SMEE_SETUP: "true", PROBOT_SETUP_TOKEN: SETUP_TOKEN },
      })();
      const end = vi.fn();
      const writeHead = vi.fn(() => ({ end }));

      const handled = await handler(
        {
          method: "GET",
          url: `/probot/setup?code=123&state=${SETUP_TOKEN}`,
        } as unknown as IncomingMessage,
        { writeHead } as unknown as ServerResponse,
      );

      expect(handled).toBe(true);
      expect(writeHead).toHaveBeenCalledWith(302, {
        "content-type": "text/plain",
        location: "/apps/my-app/installations/new",
      });
      expect(end).toHaveBeenCalledWith(
        "Found. Redirecting to /apps/my-app/installations/new",
      );
      expect(logTarget.entries.map(({ msg }) => msg)).toContain(
        "Probot has been set up, please restart the server!",
      );
    });

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

      const env: NodeJS.ProcessEnv = { PROBOT_SETUP_TOKEN: SETUP_TOKEN };

      await server.loadHandlerFactory(
        setupAppFactory({
          log,
          host: server.host,
          port: server.port,
          request: {
            fetch: mock.fetchHandler,
          },
          updateEnv,
          env,
          SmeeClient,
        }),
      );

      await server.start();

      exec.mockImplementation(
        (_command: string, callback: (error: Error | null) => void) =>
          callback(new Error("refresh failed")),
      );

      try {
        const setupResponse = await fetch(
          `http://${server.host}:${server.port}/probot/setup?code=123&state=${SETUP_TOKEN}`,
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
        expect(exec).toHaveBeenCalledWith("refresh", expect.any(Function));
        exec.mock.calls[0][1](null);
      } finally {
        exec.mockReset();
      }

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
        `http://${server.host}:${server.port}/probot/setup?state=${SETUP_TOKEN}`,
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
        `http://${server.host}:${server.port}/probot/setup?code=&state=${SETUP_TOKEN}`,
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
            cookie: `probot_setup_token=${SETUP_TOKEN}`,
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
            cookie: `probot_setup_token=${SETUP_TOKEN}`,
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

  describe("setup token", () => {
    const createHandler = async (
      options: Partial<Parameters<typeof setupAppFactory>[0]> = {},
    ) =>
      setupAppFactory({
        log: pino({ level: "silent" }),
        host: "localhost",
        port: 3000,
        updateEnv,
        env: { NO_SMEE_SETUP: "true", PROBOT_SETUP_TOKEN: SETUP_TOKEN },
        ...options,
      })();

    const call = async (
      handler: Awaited<ReturnType<typeof createHandler>>,
      req: Record<string, unknown>,
    ) => {
      const end = vi.fn((_body?: string) => {});
      const writeHead = vi.fn(
        (_status: number, _headers?: Record<string, string>) => ({ end }),
      );
      const handled = await handler(
        { headers: { host: "localhost:3000" }, ...req } as IncomingMessage,
        { writeHead, end } as unknown as ServerResponse,
      );
      return { handled, writeHead, end };
    };

    const postImport = (
      handler: Awaited<ReturnType<typeof createHandler>>,
      cookie?: string,
    ) =>
      call(handler, {
        method: "POST",
        url: "/probot/import",
        headers: cookie ? { cookie } : {},
        body: JSON.stringify({ appId: "1", pem: "pem", webhook_secret: "s" }),
      });

    const conversionMock = () =>
      fetchMock
        .createInstance()
        .post("https://api.github.com/app-manifests/123/conversions", {
          status: 201,
          body: {
            html_url: "/apps/my-app",
            id: "id",
            pem: "pem",
            webhook_secret: "webhook_secret",
          },
        });

    beforeEach(reset);

    it("passes the token to GitHub as state", async () => {
      const { end } = await call(await createHandler(), {
        method: "GET",
        url: "/probot",
      });

      expect(end.mock.calls[0][0]).toContain(
        `action="https://github.com/settings/apps/new?state=${SETUP_TOKEN}"`,
      );
    });

    it("generates a random token when none is provided", async () => {
      const getState = async (setupToken?: string) => {
        const handler = await setupAppFactory({
          log: pino({ level: "silent" }),
          host: "localhost",
          port: 3000,
          updateEnv,
          env: {
            NO_SMEE_SETUP: "true",
            ...(setupToken === undefined
              ? {}
              : { PROBOT_SETUP_TOKEN: setupToken }),
          },
        })();
        const { end } = await call(handler, { method: "GET", url: "/probot" });
        return /\?state=([^"]*)"/.exec(end.mock.calls[0][0] ?? "")?.[1];
      };

      const first = await getState();
      const second = await getState("");

      expect(first).toMatch(/^[0-9a-f]{64}$/);
      expect(second).toMatch(/^[0-9a-f]{64}$/);
      expect(first).not.toBe(second);
    });

    it.each([
      ["missing", "/probot/setup?code=123"],
      ["wrong", "/probot/setup?code=123&state=wrong"],
      ["duplicated", `/probot/setup?code=123&state=${SETUP_TOKEN}&state=x`],
    ])("rejects a %s state on /probot/setup", async (_, url) => {
      const mock = conversionMock();
      const { handled, writeHead, end } = await call(
        await createHandler({ request: { fetch: mock.fetchHandler } }),
        { method: "GET", url },
      );

      expect(handled).toBe(true);
      expect(writeHead).toHaveBeenCalledWith(403, {
        "content-type": "text/plain",
      });
      expect(end).toHaveBeenCalledWith("state missing or invalid");
      expect(mock.callHistory.calls()).toHaveLength(0);
      expect(updateEnvCalls).toHaveLength(0);
    });

    it("sets the token cookie on GET /probot/import", async () => {
      const { writeHead } = await call(await createHandler(), {
        method: "GET",
        url: "/probot/import",
      });

      expect(writeHead).toHaveBeenCalledWith(200, {
        "content-type": "text/html",
        "set-cookie": `probot_setup_token=${SETUP_TOKEN}; Path=/probot; HttpOnly; SameSite=Strict`,
      });
    });

    it.each([
      ["missing", undefined],
      ["wrong", "probot_setup_token=wrong"],
      ["empty", "probot_setup_token="],
      ["prefixed", `xprobot_setup_token=${SETUP_TOKEN}`],
    ])("rejects a %s cookie on POST /probot/import", async (_, cookie) => {
      const { handled, writeHead } = await postImport(
        await createHandler(),
        cookie,
      );

      expect(handled).toBe(true);
      expect(writeHead).toHaveBeenCalledWith(403, {
        "content-type": "text/plain",
      });
      expect(updateEnvCalls).toHaveLength(0);
    });

    it("accepts the token cookie among other cookies", async () => {
      const { writeHead } = await postImport(
        await createHandler(),
        `other=1; probot_setup_token=${SETUP_TOKEN}; another=2`,
      );

      expect(writeHead).not.toHaveBeenCalled();
      expect(updateEnvCalls).toEqual([
        { APP_ID: "1", PRIVATE_KEY: '"pem"', WEBHOOK_SECRET: "s" },
      ]);
    });

    it("does not handle other POST requests", async () => {
      const { handled } = await call(await createHandler(), {
        method: "POST",
        url: "/probot/other",
      });

      expect(handled).toBe(false);
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
