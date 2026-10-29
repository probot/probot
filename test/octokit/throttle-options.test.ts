import type { Logger } from "pino";
import { describe, expect, it, vi } from "vitest";

const { npxImportMock } = vi.hoisted(() => ({
  npxImportMock: vi.fn(),
}));

vi.mock("npx-import-light", () => ({
  npxImport: npxImportMock,
}));

import { getOctokitThrottleOptions } from "../../src/octokit/get-octokit-throttle-options.js";

class RedisClient {
  status = "ready";
  options = {};
  startupNodes = [];

  setMaxListeners() {
    return this;
  }

  on() {
    return this;
  }

  once() {
    return this;
  }

  duplicate() {
    return new RedisClient();
  }

  defineCommand() {}

  quit() {
    return Promise.resolve("OK");
  }

  disconnect() {}
}

const createLogger = () =>
  ({
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }) as unknown as Logger;

describe("getOctokitThrottleOptions", () => {
  it("creates rate-limit handlers without Redis", async () => {
    const log = createLogger();
    const options = await getOctokitThrottleOptions({ log });
    type RateLimitOptions = Parameters<
      NonNullable<typeof options.onRateLimit>
    >[1];
    type HandlerOptions = RateLimitOptions & {
      request: { retryCount: number };
    };
    const octokit = {} as Parameters<
      NonNullable<typeof options.onRateLimit>
    >[2];
    const requestOptions = (retryCount: number): HandlerOptions => ({
      baseUrl: "https://api.github.com",
      method: "GET",
      url: "/repos",
      headers: { accept: "", "user-agent": "" },
      mediaType: { format: "" },
      operationName: "test",
      query: "",
      request: { retryCount },
    });

    expect(options.Bottleneck).toBeUndefined();
    expect(options.onRateLimit!(1, requestOptions(2), octokit, 2)).toBe(true);
    expect(options.onRateLimit!(1, requestOptions(3), octokit, 3)).toBe(false);
    options.onSecondaryRateLimit!(
      1,
      { ...requestOptions(1), method: "POST", url: "/issues" },
      octokit,
      1,
    );

    expect(log.warn).toHaveBeenCalledWith(
      "Request quota exhausted for request GET /repos",
    );
    expect(log.info).toHaveBeenCalledWith("Retrying after 1 seconds!");
    expect(log.warn).toHaveBeenCalledWith(
      "Secondary quota detected for request POST /issues",
    );
  });

  it("configures Redis-backed throttling and logs connection errors", async () => {
    npxImportMock.mockResolvedValueOnce({ Redis: RedisClient });
    const log = createLogger();
    const options = await getOctokitThrottleOptions({
      log,
      redisConfig: "redis://localhost:6379",
    });

    expect(npxImportMock).toHaveBeenCalledWith("ioredis@5.10.1", {
      onlyPackageRunner: true,
    });
    expect(options.Bottleneck).toBeDefined();
    expect(options.connection).toBeDefined();

    const error = new Error("Redis connection failed");
    const connection = options.connection as unknown as {
      Events: {
        trigger: (name: string, error: Error) => Promise<unknown>;
      };
    };
    await connection.Events.trigger("error", error);

    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Redis connection failed",
        source: "bottleneck",
      }),
    );

    await options.connection!.disconnect(false);
  });
});
