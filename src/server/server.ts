import { isIPv6 } from "node:net";
import { Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";

import type { Logger } from "pino";
import { createNodeMiddleware } from "@octokit/webhooks";

import { createWebhookProxy } from "../helpers/webhook-proxy.js";
import { VERSION } from "../version.js";
import type {
  ApplicationFunction,
  Handler,
  HandlerFactory,
  ServerOptions,
} from "../types.js";
import type { Probot } from "../exports.js";

import { rebindLog } from "../helpers/rebind-log.js";
import { getPrintableHost } from "../helpers/get-printable-host.js";
import { getRuntimeName } from "../helpers/get-runtime-name.js";
import { getRuntimeVersion } from "../helpers/get-runtime-version.js";

import { httpLogger } from "./handlers/http-logger.js";
import { notFoundHandler } from "./handlers/not-found.js";
import { pingHandler } from "./handlers/ping.js";
import { staticFilesHandler } from "./handlers/static-files.js";

// the default path as defined in @octokit/webhooks
export const defaultWebhookPath = "/api/github/webhooks";
export const defaultWebhookSecret = "development";

type State = {
  cwd: string;
  httpServer: HttpServer;
  port: number;
  host: string;
  webhookPath: string;
  webhookProxy?: string;
  eventSource: EventSource | undefined;
  httpLogger: ReturnType<typeof httpLogger>;
  handlers: Handler[];
  addedHandlers: Handler[];
  enablePing?: boolean;
  enableNotFound?: boolean;
  enableStaticFiles?: boolean;
};

export class Server {
  static version = VERSION;

  public log: Logger;
  public version = VERSION;
  public probotApp: Probot;
  public handlers: Handler[] = [];

  #state: State;

  constructor(options: ServerOptions = {} as ServerOptions) {
    this.probotApp = new options.Probot({
      request: options.request,
      server: this,
    });
    this.log = options.log
      ? rebindLog(options.log)
      : rebindLog(this.probotApp.log.child({ name: "server" }));

    this.#state = {
      httpLogger: httpLogger(this.log, options.loggingOptions),
      httpServer: new HttpServer(),
      cwd: options.cwd || process.cwd(),
      port: options.port || 3000,
      host: options.host || "localhost",
      webhookPath: options.webhookPath || defaultWebhookPath,
      webhookProxy: options.webhookProxy,
      eventSource: undefined,
      addedHandlers: [],
      handlers: [],
      enablePing: options.enablePing ?? true,
      enableNotFound: options.enableNotFound ?? true,
      enableStaticFiles: options.enableStaticFiles ?? true,
    };

    this.#state.httpServer.on("request", async (req, res) => {
      this.#state.httpLogger!(req, res);

      try {
        for (const handler of this.#state.handlers) {
          if (await handler(req, res)) {
            return true;
          }
        }
      } catch (e) {
        this.log!.error(e);
        res.writeHead(500).end();
        return true;
      }

      return false;
    });
  }

  public addHandler(handler: Handler) {
    this.#state.addedHandlers.push(handler);
  }

  public async loadHandlerFactory(appFn: HandlerFactory) {
    const handler = await appFn(this.probotApp, {
      cwd: this.#state.cwd,
      addHandler: (handler: Handler) => {
        this.addHandler(handler as unknown as Handler);
      },
    });

    this.addHandler(handler);
  }

  public async load(appFn: ApplicationFunction) {
    await appFn(this.probotApp, {
      cwd: this.#state.cwd,
      addHandler: (handler: Handler) => {
        this.addHandler(handler as unknown as Handler);
      },
    });
  }

  public async start(): Promise<HttpServer> {
    this.#state.handlers = [];

    if (this.#state.enableStaticFiles === true) {
      this.#state.handlers.unshift(staticFilesHandler);
    }

    if (this.#state.enablePing === true) {
      this.#state.handlers.unshift(pingHandler);
    }

    this.#state.handlers.unshift(
      createNodeMiddleware(this.probotApp.webhooks, {
        log: this.log,
        path: this.#state.webhookPath,
      }),
    );

    this.#state.handlers.push(...this.#state.addedHandlers);

    if (this.#state.enableNotFound === true) {
      this.#state.handlers.push(notFoundHandler);
    }

    const runtimeName = getRuntimeName(globalThis);
    const runtimeVersion = getRuntimeVersion(globalThis);

    this.log.info(
      `Running Probot v${this.version} (${runtimeName}: ${runtimeVersion})`,
    );
    const { port, host, webhookPath, webhookProxy } = this.#state;
    const printableHost = getPrintableHost(host);

    this.#state.httpServer = await new Promise((resolve, reject) => {
      const server = this.#state.httpServer.listen({ port, host }, async () => {
        this.#state.port = (server.address() as AddressInfo).port;
        this.#state.host = (server.address() as AddressInfo).address;

        if (isIPv6(this.#state.host)) {
          this.#state.host = `[${this.#state.host}]`;
        }

        this.log.info(`Listening on http://${printableHost}:${port}`);
        resolve(server);
      });

      server.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          error = Object.assign(error, {
            message: `Port ${port} is already in use. You can define the PORT environment variable to use a different port.`,
          });
        }

        this.log.error(error);
        reject(error);
      });
    });

    if (webhookProxy) {
      this.#state.eventSource = await createWebhookProxy({
        host: this.#state.host,
        port: this.#state.port,
        path: webhookPath,
        logger: this.log,
        url: webhookProxy,
      });
    }

    return this.#state.httpServer;
  }

  public async stop(): Promise<void> {
    if (this.#state.eventSource) {
      this.#state.eventSource.close();
      this.#state.eventSource = undefined;
    }
    if (this.#state.httpServer.listening === false) {
      return;
    }
    const server = this.#state.httpServer;
    return new Promise((resolve, reject) =>
      server.close((err) => {
        err ? reject(err) : resolve();
      }),
    );
  }

  get port(): number {
    return this.#state.port;
  }

  get host(): string {
    return this.#state.host;
  }
}
