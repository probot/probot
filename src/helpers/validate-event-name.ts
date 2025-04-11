import {
  type EmitterWebhookEventName,
  emitterEventNames,
} from "@octokit/webhooks";

export function validateEventName(
  value: unknown,
): asserts value is EmitterWebhookEventName {
  if (
    typeof value !== "string" ||
    !emitterEventNames.includes(value as EmitterWebhookEventName)
  ) {
    throw new Error(`Invalid event name`);
  }
}
