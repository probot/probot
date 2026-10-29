import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { readCliOptions } from "../../src/bin/read-cli-options.js";

describe("readCliOptions", () => {
  it("uses the GitHub Enterprise base URL from the environment", () => {
    vi.stubEnv("GHE_HOST", "github.example.com");
    vi.stubEnv("GHE_PROTOCOL", "http");

    try {
      expect(readCliOptions([]).baseUrl).toBe(
        "http://github.example.com/api/v3",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("uses HTTPS for GitHub Enterprise when no protocol is configured", () => {
    vi.stubEnv("GHE_HOST", "github.example.com");
    vi.stubEnv("GHE_PROTOCOL", "");

    try {
      expect(readCliOptions([]).baseUrl).toBe(
        "https://github.example.com/api/v3",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("reads option defaults from the environment", () => {
    vi.stubEnv("PORT", "4000");
    vi.stubEnv("HOST", "127.0.0.1");
    vi.stubEnv("WEBHOOK_PROXY_URL", "https://smee.io/example");
    vi.stubEnv("WEBHOOK_PATH", "/webhook");
    vi.stubEnv("APP_ID", "123");
    vi.stubEnv("WEBHOOK_SECRET", "secret");
    vi.stubEnv("LOG_LEVEL", "debug");
    vi.stubEnv("LOG_FORMAT", "json");
    vi.stubEnv("LOG_LEVEL_IN_STRING", "true");
    vi.stubEnv("LOG_MESSAGE_KEY", "message");
    vi.stubEnv("SENTRY_DSN", "https://example@sentry.io/1");
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");

    try {
      expect(readCliOptions([])).toMatchObject({
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
    } finally {
      vi.unstubAllEnvs();
    }
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

  it("continues when the private key path is invalid", () => {
    expect(
      readCliOptions(["--private-key", "/path/that/does/not/exist.pem"])
        .privateKey,
    ).toBeUndefined();
  });

  it("returns no private key when no key is configured or discoverable", () => {
    const previousCwd = process.cwd();
    const previousPrivateKeyPath = process.env.PRIVATE_KEY_PATH;
    const directory = mkdtempSync(
      path.join(os.tmpdir(), "probot-cli-options-"),
    );

    try {
      process.chdir(directory);
      delete process.env.PRIVATE_KEY_PATH;
      expect(readCliOptions([]).privateKey).toBeUndefined();
    } finally {
      process.chdir(previousCwd);
      if (previousPrivateKeyPath === undefined) {
        delete process.env.PRIVATE_KEY_PATH;
      } else {
        process.env.PRIVATE_KEY_PATH = previousPrivateKeyPath;
      }
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
