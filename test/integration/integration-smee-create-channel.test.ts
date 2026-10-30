import { ManifestCreation } from "../../src/manifest-creation.js";
import { afterEach, beforeEach, describe, it, expect } from "vitest";
import type { Env } from "../../src/types.js";

const UpdateEnvCalls: Env[] = [];
const updateEnv = (env: Env) => {
  UpdateEnvCalls.push(env);
  return env;
};

describe("ManifestCreation", () => {
  const previousWebhookProxyUrl = process.env.WEBHOOK_PROXY_URL;

  beforeEach(() => {
    delete process.env.WEBHOOK_PROXY_URL;
  });

  afterEach(() => {
    if (previousWebhookProxyUrl === undefined) {
      delete process.env.WEBHOOK_PROXY_URL;
    } else {
      process.env.WEBHOOK_PROXY_URL = previousWebhookProxyUrl;
    }
  });

  it("create a smee proxy", async () => {
    await new ManifestCreation({ updateEnv }).createWebhookChannel({
      SmeeClient: {
        createChannel: async () => {
          return "https://smee.io/1234ab1234";
        },
      },
    });

    expect(UpdateEnvCalls.length).toBe(1);
    expect(UpdateEnvCalls[0].WEBHOOK_PROXY_URL!).toBe(
      "https://smee.io/1234ab1234",
    );
  });
});
