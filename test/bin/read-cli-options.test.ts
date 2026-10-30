import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { readCliOptions } from "../../src/bin/read-cli-options.js";

describe("readCliOptions", () => {
  it("uses the GitHub Enterprise base URL from the environment", () => {
    expect(
      readCliOptions([], {
        GHE_HOST: "github.example.com",
        GHE_PROTOCOL: "http",
      }).baseUrl,
    ).toBe("http://github.example.com/api/v3");
  });

  it("uses HTTPS for GitHub Enterprise when no protocol is configured", () => {
    expect(
      readCliOptions([], {
        GHE_HOST: "github.example.com",
        GHE_PROTOCOL: "",
      }).baseUrl,
    ).toBe("https://github.example.com/api/v3");
  });

  it("reads option defaults from the environment", () => {
    expect(
      readCliOptions([], {
        PORT: "4000",
        HOST: "127.0.0.1",
        WEBHOOK_PROXY_URL: "https://smee.io/example",
        WEBHOOK_PATH: "/webhook",
        APP_ID: "123",
        WEBHOOK_SECRET: "secret",
        LOG_LEVEL: "debug",
        LOG_FORMAT: "json",
        LOG_LEVEL_IN_STRING: "true",
        LOG_MESSAGE_KEY: "message",
        SENTRY_DSN: "https://example@sentry.io/1",
        REDIS_URL: "redis://localhost:6379",
      }),
    ).toMatchObject({
      port: 4000,
      host: "127.0.0.1",
      webhookProxy: "https://smee.io/example",
      webhookPath: "/webhook",
      appId: "123",
      secret: "secret",
      logLevel: "debug",
      logFormat: "json",
      logLevelInString: true,
      logMessageKey: "message",
      sentryDsn: "https://example@sentry.io/1",
      redisConfig: "redis://localhost:6379",
    });
  });

  it("prints help and exits when requested", () => {
    const exitError = new Error("process.exit called");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw exitError;
    });

    try {
      expect(() => readCliOptions(["--help"])).toThrow(exitError);

      expect(log).toHaveBeenCalledWith(
        expect.stringContaining("Usage: probot-run"),
      );
      expect(exit).toHaveBeenCalledWith(0);
    } finally {
      log.mockRestore();
      exit.mockRestore();
    }
  });

  it("parses CLI options and positional apps", () => {
    expect(
      readCliOptions([
        "node",
        "probot",
        "--port",
        "4000",
        "--host",
        "127.0.0.1",
        "--log-level",
        "debug",
        "app.js",
      ]),
    ).toMatchObject({
      port: 4000,
      host: "127.0.0.1",
      logLevel: "debug",
      args: ["app.js"],
    });
  });

  it("allows CLI logging options to override invalid environment values", () => {
    const invalidEnv = {
      LOG_LEVEL: "invalid",
      LOG_FORMAT: "invalid",
    } as unknown as NodeJS.ProcessEnv;

    expect(
      readCliOptions(
        ["node", "probot", "--log-level", "info", "--log-format", "json"],
        invalidEnv,
      ),
    ).toMatchObject({ logLevel: "info", logFormat: "json" });
  });

  it("continues when the private key path is invalid", () => {
    expect(
      readCliOptions(["--private-key", "/path/that/does/not/exist.pem"])
        .privateKey,
    ).toBeUndefined();
  });

  it("returns no private key when no key is configured or discoverable", () => {
    const previousCwd = process.cwd();
    const directory = mkdtempSync(
      path.join(os.tmpdir(), "probot-cli-options-"),
    );

    try {
      process.chdir(directory);
      expect(readCliOptions([], {}).privateKey).toBeUndefined();
    } finally {
      process.chdir(previousCwd);
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("loads a private key from the CLI option", () => {
    const privateKeyPath = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../fixtures/test-private-key.pem",
    );

    expect(
      readCliOptions(["--private-key", privateKeyPath]).privateKey,
    ).toContain("BEGIN RSA PRIVATE KEY");
  });
});
