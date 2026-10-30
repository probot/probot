import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import pino from "pino";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ManifestCreation } from "../../src/manifest-creation.js";
import { setupAppFactory } from "../../src/apps/setup.js";

describe("setup app defaults", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("handles missing URLs and forwarded hosts", async () => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      NO_SMEE_SETUP: "true",
      WEBHOOK_PROXY_URL: undefined,
      GHE_HOST: undefined,
      GHE_PROTOCOL: undefined,
    };
    const handler = await setupAppFactory({
      host: "localhost",
      port: 3000,
      log: pino({ level: "silent" }),
      updateEnv: vi.fn(),
      env,
    })();
    const handlerWithoutUpdateEnv = await setupAppFactory({
      host: "localhost",
      port: 3000,
      log: pino({ level: "silent" }),
      env,
    })();
    const response = {
      writeHead: vi.fn(() => response),
      end: vi.fn(),
    } as unknown as ServerResponse & {
      writeHead: ReturnType<typeof vi.fn>;
      end: ReturnType<typeof vi.fn>;
    };

    await expect(
      handler({ method: "GET" } as unknown as IncomingMessage, response),
    ).resolves.toBe(false);
    await expect(
      handlerWithoutUpdateEnv(
        { method: "GET" } as unknown as IncomingMessage,
        response,
      ),
    ).resolves.toBe(false);
    await handler(
      {
        method: "GET",
        url: "/probot",
        headers: { host: "example.com" },
        socket: { encrypted: false },
      } as unknown as IncomingMessage,
      response,
    );

    await expect(
      handlerWithoutUpdateEnv(
        {
          method: "POST",
          url: "/probot/other",
          body: "{}",
        } as IncomingMessage,
        response,
      ),
    ).resolves.toBe(false);
    await handler(
      {
        method: "GET",
        url: "/probot",
        headers: {
          host: "example.com",
          "x-forwarded-proto": "https,http",
          "x-forwarded-host": "forwarded.example.com",
        },
        socket: { encrypted: false },
      } as unknown as IncomingMessage,
      response,
    );
    const renderedView = response.end.mock.calls.at(-1)?.[0] as string;
    const state = /\?state=([0-9a-f]{64})"/.exec(renderedView)?.[1];
    expect(renderedView).toContain('"url":"https://forwarded.example.com/"');
    expect(renderedView).toContain(
      '"redirect_url":"https://forwarded.example.com/probot/setup"',
    );

    const createAppFromCode = vi
      .spyOn(ManifestCreation.prototype, "createAppFromCode")
      .mockResolvedValue("https://github.com/apps/example");
    await handler(
      {
        method: "GET",
        url: `/probot/setup?code=123&state=${state}`,
        headers: { host: "example.com" },
        socket: { encrypted: false },
      } as unknown as IncomingMessage,
      response,
    );

    expect(response.writeHead).toHaveBeenCalledWith(200, {
      "content-type": "text/html",
    });
    expect(createAppFromCode).toHaveBeenCalledWith("123", { request: {} });

    const previousCwd = process.cwd();
    const tempCwd = fs.mkdtempSync(path.join(os.tmpdir(), "probot-setup-"));
    process.chdir(tempCwd);
    try {
      await handlerWithoutUpdateEnv(
        { method: "GET", url: "/probot/import" } as IncomingMessage,
        response,
      );
      const setCookie = response.writeHead.mock.calls.at(-1)?.[1]["set-cookie"];
      await handlerWithoutUpdateEnv(
        {
          method: "POST",
          url: "/probot/import",
          headers: { cookie: setCookie.split(";")[0] },
          body: JSON.stringify({
            appId: "1",
            pem: "pem",
            webhook_secret: "secret",
          }),
        } as IncomingMessage,
        response,
      );
      expect(fs.readFileSync(path.join(tempCwd, ".env"), "utf8")).toContain(
        "APP_ID=1",
      );
    } finally {
      process.chdir(previousCwd);
      fs.rmSync(tempCwd, { recursive: true, force: true });
    }
  });

  it("supports the default process environment when no environment is injected", async () => {
    const handler = await setupAppFactory({
      host: "localhost",
      port: 3000,
      log: pino({ level: "silent" }),
      updateEnv: vi.fn(),
      SmeeClient: { createChannel: async () => undefined },
    })();

    await expect(
      handler(
        { method: "GET", url: "/not-found" } as IncomingMessage,
        {} as ServerResponse,
      ),
    ).resolves.toBe(false);
  });
});
