import EventSource from "eventsource";

import type { Logger } from "pino";

export const createWebhookProxy = (
  opts: WebhookProxyOptions
): EventSource | undefined => {
  try {
    const SmeeClient = require("smee-client");
    const smee = new SmeeClient({
      logger: opts.logger,
      source: opts.url,
      target: `http://localhost:${opts.port}${opts.path}`,
    });
    return smee.start();
  } catch (error) {
    opts.logger.warn(
      "Run `npm install --save-dev smee-client` to proxy webhooks to localhost."
    );
    return;
  }
};

export interface WebhookProxyOptions {
  url?: string;
  port?: number;
  path?: string;
  logger: Logger;
}
