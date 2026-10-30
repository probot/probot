import { describe, expect, it } from "vitest";

import { mergeThrottleOptions } from "../../src/octokit/get-probot-octokit-with-defaults.js";
import type { OctokitOptions } from "../../src/types.js";

describe("getProbotOctokitWithDefaults", () => {
  it("gives explicit throttle settings precedence over runtime settings", () => {
    const runtimeOptions = { enabled: true } as NonNullable<
      OctokitOptions["throttle"]
    >;

    expect(mergeThrottleOptions(runtimeOptions, { enabled: false })).toEqual({
      enabled: false,
    });
  });
});
