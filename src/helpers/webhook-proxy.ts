import type { Logger } from "pino";
import { npxImport } from "npx-import-light";

let SmeeClient: any;

export const createWebhookProxy = async (
  opts: WebhookProxyOptions,
): Promise<EventSource | undefined> => {
  try {
    SmeeClient ??= (
      await npxImport<any>("smee-client@4.3.1", { onlyPackageRunner: true })
    ).SmeeClient;
  } catch {
    opts.logger.warn(
      "Run `npm install --save-dev smee-client` to proxy webhooks to localhost.",
    );
    return undefined;
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
