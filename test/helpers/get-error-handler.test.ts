import type { EmitterWebhookEvent } from "@octokit/webhooks";
import { describe, expect, it, vi } from "vitest";

import { getErrorHandler } from "../../src/helpers/get-error-handler.js";

describe("getErrorHandler", () => {
  it("handles signature, key, aggregate, and generic webhook errors", () => {
    const eventLog = { error: vi.fn() };
    const log = {
      error: vi.fn(),
      child: vi.fn(() => eventLog),
    } as any;
    const handleError = getErrorHandler(log);

    handleError(new Error("x-hub-signature-256 is invalid"));
    handleError(new Error("invalid PEM"));
    handleError(new Error());
    handleError(
      Object.assign(new Error("other error"), {
        event: { id: "delivery-id" } as unknown as EmitterWebhookEvent,
      }),
    );
    handleError(new Error("another other error"));
    handleError(
      Object.assign(new AggregateError([new Error("json web token")]), {
        event: { id: "delivery-id" } as unknown as EmitterWebhookEvent,
      }) as Error & { event?: EmitterWebhookEvent },
    );

    expect(log.error).toHaveBeenCalledTimes(3);
    expect(log.child).toHaveBeenCalledWith({
      name: "event",
      id: "delivery-id",
    });
    expect(eventLog.error).toHaveBeenCalledTimes(3);
  });
});
