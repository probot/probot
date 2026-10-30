import { describe, expect, it } from "vitest";
import { Lru } from "toad-cache";
import pino from "pino";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  getProbotOctokitWithDefaults,
  mergeThrottleOptions,
} from "../../src/octokit/get-probot-octokit-with-defaults.js";
import { ProbotOctokit } from "../../src/octokit/probot-octokit.js";
import type { OctokitOptions } from "../../src/types.js";

const privateKey = readFileSync(
  resolve(import.meta.dirname, "../fixtures/test-private-key.pem"),
  "utf8",
);

async function getAuthStrategyRequestUrl(options: {
  baseUrl?: string;
  githubToken?: string;
}): Promise<string | undefined> {
  const requestedUrls: string[] = [];
  const fetch = async (url: string) => {
    requestedUrls.push(url);
    return new Response(
      JSON.stringify({
        token: "ghs_test",
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        permissions: {},
        repository_selection: "all",
      }),
      { status: 201, headers: { "content-type": "application/json" } },
    );
  };

  const Octokit = await getProbotOctokitWithDefaults({
    cache: new Lru<string>(1),
    Octokit: ProbotOctokit,
    log: pino({ level: "silent" }),
    appId: 1,
    privateKey,
    githubToken: options.githubToken,
    baseUrl: options.baseUrl,
    request: { fetch },
  });

  const octokit = new Octokit();
  await octokit.auth({ type: "installation", installationId: 42 });

  return requestedUrls[0];
}

describe("getProbotOctokitWithDefaults", () => {
  it("gives explicit throttle settings precedence over runtime settings", () => {
    const runtimeOptions = { enabled: true } as NonNullable<
      OctokitOptions["throttle"]
    >;

    expect(mergeThrottleOptions(runtimeOptions, { enabled: false })).toEqual({
      enabled: false,
    });
  });

  it("sends auth strategy requests to the configured baseUrl (GHES)", async () => {
    const url = await getAuthStrategyRequestUrl({
      baseUrl: "https://ghe.example.com/api/v3",
    });

    expect(url).toBe(
      "https://ghe.example.com/api/v3/app/installations/42/access_tokens",
    );
  });

  it("sends auth strategy requests to api.github.com when no baseUrl is set", async () => {
    const url = await getAuthStrategyRequestUrl({});

    expect(url).toBe(
      "https://api.github.com/app/installations/42/access_tokens",
    );
  });
});
