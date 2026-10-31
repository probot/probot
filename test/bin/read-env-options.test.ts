import { describe, expect, it, vi } from "vitest";

import { readEnvOptions } from "../../src/bin/read-env-options.js";

describe("readEnvOptions", () => {
  it("uses development defaults", () => {
    expect(
      readEnvOptions({
        NODE_ENV: "development",
        PORT: "",
        APP_ID: "123",
        GHE_HOST: "",
      }),
    ).toMatchObject({
      appId: 123,
      port: 3000,
      logFormat: "pretty",
      baseUrl: "https://api.github.com",
      args: [],
    });
  });

  it("uses production and GitHub Enterprise settings", () => {
    expect(
      readEnvOptions({
        NODE_ENV: "production",
        LOG_FORMAT: "",
        GHE_HOST: "github.example.com",
        GHE_PROTOCOL: "http",
        PORT: "4000",
        LOG_LEVEL_IN_STRING: "true",
      }),
    ).toMatchObject({
      port: 4000,
      logFormat: "json",
      logLevelInString: true,
      baseUrl: "http://github.example.com/api/v3",
    });
  });

  it.each(["not-a-number", "-1", "65536"])(
    "rejects invalid PORT values: %s",
    (port) => {
      expect(() => readEnvOptions({ PORT: port })).toThrow(
        "port must be an integer between 1 and 65535",
      );
    },
  );

  it("rejects an invalid APP_ID value", () => {
    expect(() => readEnvOptions({ APP_ID: "123abc" })).toThrow(
      "app ID must be a positive integer",
    );
  });

  it("maps an explicit JSON log format", () => {
    expect(readEnvOptions({ LOG_FORMAT: "json" }).logFormat).toBe("json");
  });

  it("maps an explicit pretty log format", () => {
    expect(readEnvOptions({ LOG_FORMAT: "pretty" }).logFormat).toBe("pretty");
  });

  it("uses HTTPS for GitHub Enterprise when no protocol is configured", () => {
    expect(readEnvOptions({ GHE_HOST: "github.example.com" }).baseUrl).toBe(
      "https://github.example.com/api/v3",
    );
  });

  it("logs and continues when the private key cannot be read", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      expect(
        readEnvOptions({ PRIVATE_KEY_PATH: "/missing/private-key.pem" }),
      ).toMatchObject({ privateKey: undefined });
      expect(log).toHaveBeenCalledWith(expect.any(Error));
    } finally {
      log.mockRestore();
    }
  });
});
