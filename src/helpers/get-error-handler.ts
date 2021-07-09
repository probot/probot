import type { Logger } from "pino";
import {
  WebhookError,
  EmitterWebhookEvent as WebhookEvent,
} from "@octokit/webhooks";

export function getErrorHandler(log: Logger) {
  return (error: Error) => {
    const errors = (
      error.name === "AggregateError" ? error : [error]
    ) as WebhookError[];

    const event = (error as any).event as WebhookEvent;

    for (const error of errors) {
      const errMessage = (error.message || "").toLowerCase();

      if (errMessage.includes("x-hub-signature-256")) {
        log.error(
          error,
          "Go to https://github.com/settings/apps/YOUR_APP and verify that the Webhook secret matches the value of the WEBHOOK_SECRET environment variable."
        );
        continue;
      }

      if (errMessage.includes("pem") || errMessage.includes("json web token")) {
        if (process.env.PRIVATE_KEY && process.env.PRIVATE_KEY.indexOf('\\n') !== -1) {
          log.error(
            error,
            "The environment variable PRIVATE_KEY contains escaped newlines. Please see this issue for more information: https://github.com/octokit/app.js/issues/40"
          );
        } else {
          log.error(
            error,
            "Your private key (a .pem file or PRIVATE_KEY environment variable) or APP_ID is incorrect. Go to https://github.com/settings/apps/YOUR_APP, verify that APP_ID is set correctly, and generate a new PEM file if necessary."
          );
        }

        continue;
      }

      log
        .child({
          name: "event",
          id: event ? event.id : undefined,
        })
        .error(error);
    }
  };
}
