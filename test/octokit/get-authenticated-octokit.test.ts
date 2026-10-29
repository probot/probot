import { describe, expect, it, vi } from "vitest";

import { getAuthenticatedOctokit } from "../../src/octokit/get-authenticated-octokit.js";

describe("getAuthenticatedOctokit", () => {
  it("returns the original client without an installation", async () => {
    const octokit = {} as any;

    await expect(
      getAuthenticatedOctokit({ octokit, log: {} as any }),
    ).resolves.toBe(octokit);
  });

  it("passes installation and throttle settings to the authenticated client", async () => {
    const child = vi.fn(() => ({}));
    const log = { child } as any;
    class AuthenticatedOctokit {
      options: any;

      constructor(options: any) {
        this.options = options;
      }
    }
    const auth = vi.fn(async ({ factory }: any) =>
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
      octokit: { auth, constructor: Octokit } as any,
      log,
      installationId: 42,
    });

    expect((authenticated as any).options).toMatchObject({
      throttle: { enabled: true, limit: 1, id: "42" },
      auth: {
        appId: 1,
        installationId: 42,
        otherOptions: { owner: "probot" },
      },
    });

    const withoutThrottle = await getAuthenticatedOctokit({
      octokit: {
        auth: vi.fn(async ({ factory }: any) =>
          factory({
            octokit: { constructor: AuthenticatedOctokit },
            octokitOptions: { auth: {} },
          }),
        ),
        constructor: Octokit,
      } as any,
      log,
      installationId: 43,
    });

    expect((withoutThrottle as any).options.throttle).toEqual({
      enabled: false,
    });
  });
});
