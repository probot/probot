import { describe, expect, it, vi } from "vitest";
import type { Logger } from "pino";

import { getAuthenticatedOctokit } from "../../src/octokit/get-authenticated-octokit.js";
import type { ProbotOctokit } from "../../src/octokit/probot-octokit.js";

describe("getAuthenticatedOctokit", () => {
  it("returns the original client without an installation", async () => {
    const octokit = {} as unknown as ProbotOctokit;

    await expect(
      getAuthenticatedOctokit({ octokit, log: {} as unknown as Logger }),
    ).resolves.toBe(octokit);
  });

  it("passes installation and throttle settings to the authenticated client", async () => {
    const child = vi.fn(() => ({}));
    const log = { child } as unknown as Logger;
    class AuthenticatedOctokit {
      options: Record<string, unknown>;

      constructor(options: Record<string, unknown>) {
        this.options = options;
      }
    }
    type FactoryInput = {
      octokit: { constructor: typeof AuthenticatedOctokit };
      octokitOptions: {
        auth: Record<string, unknown>;
        throttle?: { enabled: boolean; limit?: number };
      };
      owner?: string;
    };
    const auth = vi.fn(
      async ({ factory }: { factory: (input: FactoryInput) => unknown }) =>
        factory({
          octokit: { constructor: AuthenticatedOctokit },
          octokitOptions: {
            auth: { appId: 1 },
            throttle: { enabled: true, limit: 1 },
          },
          owner: "probot",
        }),
    );
    const Octokit = class {
      static auth = auth;
    };

    const authenticated = await getAuthenticatedOctokit({
      octokit: { auth, constructor: Octokit } as unknown as ProbotOctokit,
      log,
      installationId: 42,
    });

    expect(
      (authenticated as unknown as AuthenticatedOctokit).options,
    ).toMatchObject({
      throttle: { enabled: true, limit: 1, id: "42" },
      auth: {
        appId: 1,
        installationId: 42,
        otherOptions: { owner: "probot" },
      },
    });

    const withoutThrottle = await getAuthenticatedOctokit({
      octokit: {
        auth: vi.fn(
          async ({ factory }: { factory: (input: FactoryInput) => unknown }) =>
            factory({
              octokit: { constructor: AuthenticatedOctokit },
              octokitOptions: { auth: {} },
            }),
        ),
        constructor: Octokit,
      } as unknown as ProbotOctokit,
      log,
      installationId: 43,
    });

    expect(
      (withoutThrottle as unknown as AuthenticatedOctokit).options.throttle,
    ).toEqual({
      enabled: false,
    });
  });
});
