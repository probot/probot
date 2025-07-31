import { Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";

import type { RequestRequestOptions } from "@octokit/types";
import type { Logger } from "pino";

import type { Probot } from "../probot.js";
import { VERSION } from "../version.js";
import type {
  ApplicationFunction,
  Handler,
  HandlerFactory,
  ServerOptions,
} from "../types.js";

import {
  createDeferredPromise,
  type DeferredPromise,
} from "../helpers/create-deferred-promise.js";
import { createWebhookProxy } from "../helpers/webhook-proxy.js";
import { getPrintableHost } from "../helpers/get-printable-host.js";
import { getRuntimeName } from "../helpers/get-runtime-name.js";
import { getRuntimeVersion } from "../helpers/get-runtime-version.js";

import { httpLogger } from "./handlers/http-logger.js";
import { notFoundHandler } from "./handlers/not-found.js";
import { pingHandler } from "./handlers/ping.js";
import { staticFilesHandler } from "./handlers/static-files.js";
import { getLog } from "../helpers/get-log.js";

// the default path as defined in @octokit/webhooks
export const defaultWebhookPath = "/api/github/webhooks";
export const defaultWebhookSecret = "development";

type State = {
  initializeRan: boolean;
  initializationPromise: DeferredPromise<void>;
  cwd: string;
  httpServer: HttpServer;
  port: number;
  host: string;
  log?: Logger | undefined;
  loggingOptions?: Record<string, unknown>;
  probot: Probot | null;
  ProbotBase: typeof Probot;
  request?: RequestRequestOptions | undefined;
  webhookPath: string;
  webhookProxy?: string | undefined;
  eventSource: EventSource | undefined;
  httpLogger?: ReturnType<typeof httpLogger>;
  handlers: Handler[];
  addedHandlers: Handler[];
  enablePing: boolean;
  enableNotFound: boolean;
  enableStaticFiles: boolean;
};

export class Server {
  #state: State;

  constructor(options: ServerOptions = {} as ServerOptions) {
    this.#state = {
      initializeRan: false,
      initializationPromise: createDeferredPromise<void>(),
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
        this.#state.log!.error(e);
        res.writeHead(500).end();
        return true;
      }

      return false;
    });
  }

  async #initialize(): Promise<void> {
    if (this.#state.initializeRan === true) {
      return this.#state.initializationPromise.promise;
    }

    this.#state.initializeRan = true;

    try {
      this.#state.log = this.#state.log || (await getLog());
      this.#state.log.child({ name: "server" });

      this.#state.probot = new this.#state.ProbotBase({
        request: this.#state.request,
        log: this.#state.log,
        server: this,
        webhookPath: this.#state.webhookPath,
      });

      await this.#state.probot.ready();

      this.#state.httpLogger = httpLogger(
        this.#state.log,
        this.#state.loggingOptions,
      );

      this.#state.initializationPromise.resolve();
    } catch (error) {
      this.#state.initializationPromise.reject(error);
      (this.#state.log || console).error(
        { err: error },
        "Failed to initialize Server",
      );
      throw error;
    }
    return this.#state.initializationPromise.promise;
  }

  public addHandler(handler: Handler) {
    this.#state.addedHandlers.push(handler);
  }

  public async loadHandlerFactory(appFn: HandlerFactory) {
    await this.#initialize();

    const handler = await appFn(this.#state.probot!, {
      cwd: this.#state.cwd,
      addHandler: (handler: Handler) => {
        this.addHandler(handler as unknown as Handler);
      },
    });

    this.addHandler(handler);
  }

  public async load(appFn: ApplicationFunction) {
    await this.#initialize();

    await appFn(this.#state.probot!, {
      cwd: this.#state.cwd,
      addHandler: (handler: Handler) => {
        this.addHandler(handler as unknown as Handler);
      },
    });
  }

  public async start(): Promise<HttpServer> {
    await this.#initialize();

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
      `Running Probot v${VERSION} (${runtimeName}: ${runtimeVersion})`,
    );
    const printableHost = getPrintableHost(this.#state.host);

    this.#state.httpServer = await new Promise((resolve, reject) => {
      const server = this.#state.httpServer.listen(
        { port: this.#state.port, host: this.#state.host },
        () => {
          const { port, address, family } = server.address() as AddressInfo;

          this.#state.port = port;
          this.#state.host = address;

          if (family === "IPv6") {
            this.#state.host = `[${address}]`;
          }

          this.#state.log!.info(`Listening on http://${printableHost}:${port}`);
          resolve(server);
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

  static get version(): string {
    return VERSION;
  }

  get version(): string {
    return VERSION;
  }
}
