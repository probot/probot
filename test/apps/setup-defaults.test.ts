import pino from "pino";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ManifestCreation } from "../../src/manifest-creation.js";
import { setupAppFactory } from "../../src/apps/setup.js";

describe("setup app defaults", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("handles missing URLs and forwarded hosts", async () => {
    vi.stubEnv("NO_SMEE_SETUP", "true");
    const handler = await setupAppFactory({
      host: "localhost",
      port: 3000,
      log: pino({ level: "silent" }),
      updateEnv: vi.fn(),
    })();
    const handlerWithoutUpdateEnv = await setupAppFactory({
      host: "localhost",
      port: 3000,
      log: pino({ level: "silent" }),
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
  });
});
