import { ManifestCreation } from "../../src/manifest-creation.js";
import { describe, test, expect } from "vitest";
import type { Env } from "../../src/types.js";

let UpdateEnvCalls: Env[] = [];
const updateEnv = (env: Env) => {
  UpdateEnvCalls.push(env);
  return env;
};

describe("ManifestCreation", () => {
  test("create a smee proxy", async () => {
    delete process.env.WEBHOOK_PROXY_URL;

    await new ManifestCreation({ updateEnv }).createWebhookChannel();

    expect(UpdateEnvCalls.length).toEqual(1);
    expect(UpdateEnvCalls[0].WEBHOOK_PROXY_URL).toMatch(
      /^https:\/\/smee\.io\/[0-9a-zA-Z]{10,}$/,
    );
  });
});
