import { describe, expect, it, vi } from "vitest";

import { probotRequestLogging } from "../../src/octokit/octokit-plugin-probot-request-logging.js";

describe("probotRequestLogging", () => {
  it("logs failed and successful requests", () => {
    const errorHook = vi.fn();
    const afterHook = vi.fn();
    const debug = vi.fn();
    const octokit = {
      hook: { error: errorHook, after: afterHook },
      request: {
        endpoint: {
          parse: vi.fn(() => ({ method: "GET", url: "/test", body: { a: 1 } })),
        },
      },
      log: { debug },
    } as unknown as Parameters<typeof probotRequestLogging>[0];

    probotRequestLogging(octokit);
    const errorHandler = errorHook.mock.calls[0][1];
    const afterHandler = afterHook.mock.calls[0][1];
    const error = Object.assign(new Error("failed"), { status: 500 });

    expect(() => errorHandler(error, { body: { a: 1 } })).toThrow(error);
    expect(() => errorHandler(new Error("failed"), {})).toThrow("failed");
    afterHandler({ status: 200 }, { body: { a: 1 } });

    expect(debug).toHaveBeenNthCalledWith(
      1,
      { a: 1 },
      "GitHub request: GET /test - 500",
    );
    expect(debug).toHaveBeenNthCalledWith(
      2,
      { a: 1 },
      "GitHub request: GET /test - 200",
    );
  });
});
