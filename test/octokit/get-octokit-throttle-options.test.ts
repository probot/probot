import pino from "pino";
import { getOctokitThrottleOptions } from "../../src/octokit/get-octokit-throttle-options";

describe(".getOctokitThrottleOptions()", () => {
  test("No redis configured in options or env", () => {
    expect(getOctokitThrottleOptions({ log: pino() })).toBeUndefined();
  });

  test("redis configured in options", () => {
    const redisConfig = {
      host: "test",
    };
    const throttleOptions = getOctokitThrottleOptions({
      log: pino(),
      redisConfig,
    });
    throttleOptions?.connection.disconnect();
    expect(throttleOptions?.onAbuseLimit).toBeDefined();
    expect(throttleOptions?.onRateLimit).toBeDefined();
  });
});
