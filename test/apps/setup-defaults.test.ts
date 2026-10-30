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
      PROJECT_DOMAIN: undefined,
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
    } as any)();
    const response = {
      writeHead: vi.fn(() => response),
      end: vi.fn(),
    } as any;

    await expect(handler({ method: "GET" } as any, response)).resolves.toBe(
      false,
    );
    await expect(
      handlerWithoutUpdateEnv({ method: "GET" } as any, response),
    ).resolves.toBe(false);
    await handler(
      {
        method: "GET",
        url: "/probot",
        headers: { host: "example.com" },
        socket: { encrypted: false },
      } as any,
      response,
    );

    await expect(
      handlerWithoutUpdateEnv(
        { method: "POST", url: "/probot/other", body: "{}" } as any,
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
      } as any,
      response,
    );
    const renderedView = response.end.mock.calls.at(-1)?.[0] as string;
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
        url: "/probot/setup?code=123",
        headers: { host: "example.com" },
        socket: { encrypted: false },
      } as any,
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
        {
          method: "POST",
          url: "/probot/import",
          body: JSON.stringify({
            appId: "1",
            pem: "pem",
            webhook_secret: "secret",
          }),
        } as any,
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
      handler({ method: "GET", url: "/not-found" } as any, {} as any),
    ).resolves.toBe(false);
  });
});
