import type { Logger } from "pino";

export function getErrorHandler(logger: Logger) {
  return (err: Error) => {
    const errMessage = (err.message || "").toLowerCase();

    if (errMessage.includes("x-hub-signature")) {
      logger.error(
        { err },
        "Go to https://github.com/settings/apps/YOUR_APP and verify that the Webhook secret matches the value of the WEBHOOK_SECRET environment variable."
      );
    } else if (
      errMessage.includes("pem") ||
      errMessage.includes("json web token")
    ) {
      logger.error(
        { err },
        "Your private key (usually a .pem file) is not correct. Go to https://github.com/settings/apps/YOUR_APP and generate a new PEM file. If you're deploying to Now, visit https://probot.github.io/docs/deployment/#now."
      );
    } else {
      logger.error(err);
    }
  };
}
