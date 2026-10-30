import { describe, expect, it, vi } from "vitest";

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
        loadSmeeClient: async () => {
          throw new Error("smee unavailable");
        },
      }),
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(
      "Run `npm install --save-dev smee-client` to proxy webhooks to localhost.",
    );
  });

  it("rejects when the Smee client loader returns no constructor", async () => {
    const logger = { warn: vi.fn() } as any;

    await expect(
      createWebhookProxy({
        url: "https://smee.io/example",
        host: "127.0.0.1",
        port: 3000,
        path: "/webhooks",
        logger,
        loadSmeeClient: async () => ({}),
      }),
    ).rejects.toThrow("SmeeClient is unavailable");
  });
});
