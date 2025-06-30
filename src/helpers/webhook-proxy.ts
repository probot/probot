import type { Logger } from "pino";

let SmeeClient;

export const createWebhookProxy = async (
  opts: WebhookProxyOptions,
): Promise<EventSource | undefined> => {
  try {
    SmeeClient ??= (await import("smee-client")).SmeeClient;
  } catch {
    opts.logger.warn(
      "Run `npm install --save-dev smee-client` to proxy webhooks to localhost.",
    );
    return;
  }
  const smeeClient = new SmeeClient({
    logger: opts.logger,
    source: opts.url,
    target: `http://${opts.host}:${opts.port}${opts.path}`,
    fetch: opts.fetch,
  });

  return await smeeClient.start();
};

export interface WebhookProxyOptions {
  url: string;
  port: number;
  path: string;
  host: string;
  logger: Logger;
  fetch?: Function;
}
