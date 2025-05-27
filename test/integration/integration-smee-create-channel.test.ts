import { ManifestCreation } from "../../src/manifest-creation.js";
import { describe, it, expect } from "vitest";
import type { Env } from "../../src/types.js";

const UpdateEnvCalls: Env[] = [];
const updateEnv = (env: Env) => {
  UpdateEnvCalls.push(env);
  return env;
};

describe("ManifestCreation", () => {
  it("create a smee proxy", async () => {
    delete process.env.WEBHOOK_PROXY_URL;

    await new ManifestCreation({ updateEnv }).createWebhookChannel({
      SmeeClient: {
        createChannel: async () => {
          return (
            "https://smee.io/" + Math.random().toString(36).substring(2, 12)
          );
        },
      },
    });

    expect(UpdateEnvCalls.length).toBe(1);
    expect(
      /^https:\/\/smee\.io\/[0-9a-zA-Z]{10,}$/.test(
        UpdateEnvCalls[0].WEBHOOK_PROXY_URL!,
      ),
    ).toBe(true);
  });
});
