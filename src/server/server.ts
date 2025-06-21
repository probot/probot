import { Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";

import type { RequestRequestOptions } from "@octokit/types";
import type { Logger } from "pino";

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

import { loggingHandler } from "./handlers/logging.js";
import { notFoundHandler } from "./handlers/not-found.js";
import { pingHandler } from "./handlers/ping.js";
import { staticFilesHandler } from "./handlers/static-files.js";

// the default path as defined in @octokit/webhooks
export const defaultWebhookPath = "/api/github/webhooks";
export const defaultWebhookSecret = "development";

type State = {
  initialized: boolean;
  cwd: string;
  httpServer: HttpServer;
  port: number;
  host: string;
  log?: Logger;
  loggingOptions?: Record<string, unknown>;
  probot: Probot | null;
  ProbotBase: typeof Probot;
  request?: RequestRequestOptions;
  webhookPath: string;
  webhookProxy?: string;
  eventSource: EventSource | undefined;
  handlers: Handler[];
  addedHandlers: Handler[];
  enablePing?: boolean;
  enableNotFound?: boolean;
  enableStaticFiles?: boolean;
};

export class Server {
  static version = VERSION;

  #state: State;

  constructor(options: ServerOptions = {} as ServerOptions) {
    this.#state = {
      initialized: false,
      probot: null,
      log: options.log,
      httpServer: new HttpServer(),
      cwd: options.cwd || process.cwd(),
      port: options.port || 3000,
      host: options.host || "localhost",
      webhookPath: options.webhookPath || defaultWebhookPath,
      webhookProxy: options.webhookProxy,
      eventSource: undefined,
      request: options.request,
      ProbotBase: options.Probot,
      handlers: [],
      addedHandlers: [],
      enablePing: options.enablePing ?? true,
      enableNotFound: options.enableNotFound ?? true,
      enableStaticFiles: options.enableStaticFiles ?? true,
    };
  }

  #initialize(): void {
    if (this.#state.initialized) {
      return;
    }
    const probot = new this.#state.ProbotBase({
      request: this.#state.request,
      server: this,
      webhookPath: this.#state.webhookPath,
    });

    this.#state.probot = probot;
    this.#state.log = rebindLog(
      this.#state.log || probot.log.child({ name: "server" }),
    );

    const logger = loggingHandler(this.#state.log, this.#state.loggingOptions);

    this.#state.httpServer.on("request", async (req, res) => {
      logger(req, res);

      try {
        for (const handler of this.#state.handlers) {
          if (await handler(req, res)) {
            return true;
          }
        }
      } catch (e) {
        this.#state.log!.error(e);
        res.writeHead(500).end();
        return true;
      }

      return false;
    });
    this.#state.initialized = true;
  }

  public addHandler(handler: Handler) {
    this.#state.addedHandlers.push(handler);
  }

  public async loadHandlerFactory(appFn: HandlerFactory) {
    this.#initialize();

    const handler = await appFn(this.#state.probot!, {
      cwd: this.#state.cwd,
      addHandler: (handler: Handler) => {
        this.addHandler(handler as unknown as Handler);
      },
    });

    this.addHandler(handler);
  }

  get version(): string {
    return VERSION;
  }

  public async load(appFn: ApplicationFunction) {
    this.#initialize();

    await appFn(this.#state.probot!, {
      cwd: this.#state.cwd,
      addHandler: (handler: Handler) => {
        this.addHandler(handler as unknown as Handler);
      },
    });
  }

  public async start(): Promise<HttpServer> {
    this.#initialize();

    this.#state.handlers = [];

    if (this.#state.enableStaticFiles === true) {
      this.#state.handlers.unshift(staticFilesHandler);
    }

    if (this.#state.enablePing === true) {
      this.#state.handlers.unshift(pingHandler);
    }

    this.#state.handlers.unshift(await this.#state.probot!.getNodeMiddleware());

    this.#state.handlers.push(...this.#state.addedHandlers);

    if (this.#state.enableNotFound === true) {
      this.#state.handlers.push(notFoundHandler);
    }

    const runtimeName = getRuntimeName(globalThis);
    const runtimeVersion = getRuntimeVersion(globalThis);

    this.#state.log!.info(
      `Running Probot v${this.version} (${runtimeName}: ${runtimeVersion})`,
    );
    const printableHost = getPrintableHost(this.#state.host);

    await new Promise<void>((resolve, reject) => {
      const server = this.#state.httpServer.listen(
        { port: this.#state.port, host: this.#state.host },
        async () => {
          let {
            port,
            address: host,
            family,
          } = this.#state.httpServer.address() as AddressInfo;

          if (family === "ipv6") {
            host = `[${host}]`;
          }

          this.#state.host = host;
          this.#state.port = port;

          this.#state.log!.info(
            `Listening on http://${printableHost}:${this.#state.port}`,
          );
          resolve();
        },
      );

      server.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          error = Object.assign(error, {
            message: `Port ${this.#state.port} is already in use. You can define the PORT environment variable to use a different port.`,
          });
        }

        this.#state.log!.error(error);
        reject(error);
      });
    });

    if (this.#state.webhookProxy) {
      this.#state.eventSource = await createWebhookProxy({
        host: this.#state.host,
        port: this.#state.port,
        path: this.#state.webhookPath,
        logger: this.#state.log!,
        url: this.#state.webhookProxy,
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
