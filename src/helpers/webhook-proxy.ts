import type { Logger } from "pino";

export const createWebhookProxy = async (
  opts: WebhookProxyOptions,
): Promise<EventSource | undefined> => {
  try {
    const SmeeClient = (await import("smee-client")).default;
    const smee = new SmeeClient({
      logger: opts.logger,
      source: opts.url,
      target: `http://localhost:${opts.port}${opts.path}`,
      fetch: opts.fetch,
    });
    return smee.start() as EventSource;
  } catch (error) {
    opts.logger.warn(
      "Run `npm install --save-dev smee-client` to proxy webhooks to localhost.",
    );
    return;
  }
};

export interface WebhookProxyOptions {
  url: string;
  port?: number;
  path?: string;
  logger: Logger;
  fetch?: Function;
}
