import type { Logger } from "pino";
import { npxImport } from "npx-import-light";

let SmeeClient: any;

export const createWebhookProxy = async (
  opts: WebhookProxyOptions,
): Promise<EventSource | undefined> => {
  let SmeeClientConstructor: any;
  try {
    SmeeClientConstructor = opts.loadSmeeClient
      ? await opts.loadSmeeClient()
      : (SmeeClient ??= (
          await npxImport<any>("smee-client@5.0.0", {
            onlyPackageRunner: true,
          })
        ).SmeeClient) && { SmeeClient };
  } catch {
    opts.logger.warn(
      "Run `npm install --save-dev smee-client` to proxy webhooks to localhost.",
    );
    return undefined;
  }

  if (!SmeeClientConstructor?.SmeeClient) {
    throw new Error("SmeeClient is unavailable");
  }

  const smeeClient = new SmeeClientConstructor.SmeeClient({
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
  loadSmeeClient?: () => Promise<{ SmeeClient?: any }>;
}
