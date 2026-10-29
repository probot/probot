import { describe, expect, it, vi } from "vitest";

vi.mock("npx-import-light", () => ({
  npxImport: vi.fn().mockRejectedValue(new Error("smee unavailable")),
}));

import { createWebhookProxy } from "../../src/helpers/webhook-proxy.js";

describe("createWebhookProxy", () => {
  it("warns and returns undefined when smee-client is unavailable", async () => {
    const logger = { warn: vi.fn() } as any;

    await expect(
      createWebhookProxy({
        url: "https://smee.io/example",
        host: "127.0.0.1",
        port: 3000,
        path: "/webhooks",
        logger,
      }),
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      "Run `npm install --save-dev smee-client` to proxy webhooks to localhost.",
    );
  });
});
