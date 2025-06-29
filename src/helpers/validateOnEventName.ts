import type { Logger } from "pino";
import {
  emitterEventNames,
  type EmitterWebhookEventName,
} from "@octokit/webhooks";

type ValidateEventNameOptions =
  | {
      onUnknownEventName?: undefined | "throw";
    }
  | {
      onUnknownEventName: "warn";
      log?: Pick<Logger, "warn">;
    };

export function validateOnEventName<
  O extends ValidateEventNameOptions = ValidateEventNameOptions,
>(
  eventName: EmitterWebhookEventName | (string & Record<never, never>),
  options: O = {} as O,
): asserts eventName is O extends { onUnknownEventName: "throw" }
  ? Exclude<string, "*" | "error">
  : EmitterWebhookEventName {
  if (typeof eventName !== "string") {
    throw new TypeError("eventName must be of type string");
  }
  if (eventName === "*") {
    throw new TypeError(
      `Using the "*" event with the regular Webhooks.on() function is not supported. Please use the Webhooks.onAny() method instead`,
    );
  }
  if (eventName === "error") {
    throw new TypeError(
      `Using the "error" event with the regular Webhooks.on() function is not supported. Please use the Webhooks.onError() method instead`,
    );
  }

  if (!emitterEventNames.includes(eventName as EmitterWebhookEventName)) {
    if (options.onUnknownEventName !== "warn") {
      throw new TypeError(
        `"${eventName}" is not a known webhook name (https://developer.github.com/v3/activity/events/types/)`,
      );
    } else {
      (options.log || console).warn(
        `"${eventName}" is not a known webhook name (https://developer.github.com/v3/activity/events/types/)`,
      );
    }
  }
}
