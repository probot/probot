import type { Logger } from "pino";
import { npxImport } from "npx-import-light";

export type SmeeClientOptions = {
  logger: Logger;
  source: string;
  target: string;
  fetch?: Function | undefined;
};

export type SmeeClientConstructor = new (options: SmeeClientOptions) => {
  start: () => Promise<EventSource>;
};

export type SmeeClientModule = { SmeeClient?: SmeeClientConstructor };
type LoadedSmeeClient = SmeeClientConstructor | SmeeClientModule;

let SmeeClient: SmeeClientConstructor | undefined;

export const createWebhookProxy = async (
  opts: WebhookProxyOptions,
): Promise<EventSource | undefined> => {
  let SmeeClientConstructor: SmeeClientConstructor | undefined;
  try {
    const loaded: LoadedSmeeClient | undefined =
      opts.smeeClient ||
      (opts.loadSmeeClient
        ? (await opts.loadSmeeClient()).SmeeClient
        : (SmeeClient ??= (
            await npxImport<SmeeClientModule>("smee-client@5.0.0", {
              onlyPackageRunner: true,
            })
          ).SmeeClient));
    SmeeClientConstructor =
      typeof loaded === "function"
        ? loaded
        : (loaded as SmeeClientModule | undefined)?.SmeeClient;
  } catch {
    opts.logger.warn(
      "Run `npm install --save-dev smee-client` to proxy webhooks to localhost.",
    );
    return undefined;
  }

  if (!SmeeClientConstructor) {
    throw new Error("SmeeClient is unavailable");
  }

  const smeeClient = new SmeeClientConstructor({
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
  fetch?: Function | undefined;
  smeeClient?: SmeeClientConstructor | undefined;
  loadSmeeClient?: (() => Promise<SmeeClientModule>) | undefined;
}
