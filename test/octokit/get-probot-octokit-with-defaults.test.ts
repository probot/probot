import { describe, expect, it, vi } from "vitest";

import {
  getProbotOctokitWithDefaults,
  mergeThrottleOptions,
} from "../../src/octokit/get-probot-octokit-with-defaults.js";
import { ProbotOctokit } from "../../src/octokit/probot-octokit.js";
import type { OctokitOptions } from "../../src/types.js";

vi.mock("../../src/octokit/get-octokit-throttle-options.js", () => ({
  getOctokitThrottleOptions: vi.fn().mockResolvedValue({ enabled: true }),
}));

describe("getProbotOctokitWithDefaults", () => {
  it("gives explicit throttle settings precedence over runtime settings", () => {
    const runtimeOptions = { enabled: true } as NonNullable<
      OctokitOptions["throttle"]
    >;

    expect(mergeThrottleOptions(runtimeOptions, { enabled: false })).toEqual({
      enabled: false,
    });
  });

  it("resolves Redis throttle options when Redis is configured", async () => {
    const Octokit = await getProbotOctokitWithDefaults({
      cache: {} as never,
      Octokit: ProbotOctokit,
      log: { child: () => ({}) } as never,
      appId: 123,
      privateKey: "private key",
      redisConfig: "redis://localhost",
    });

    expect(Octokit).toBeDefined();
  });
});
