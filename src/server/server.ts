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
};

export class Server {
  public log: Logger;
  public probotApp: Probot;
  public handlers: Handler[] = [];

  #state: State;

  constructor(options: ServerOptions = {} as ServerOptions) {
    this.#state = {
      httpServer: new HttpServer(),
      cwd: options.cwd || process.cwd(),
      port: options.port || 3000,
      host: options.host || "localhost",
      webhookPath: options.webhookPath || defaultWebhookPath,
      webhookProxy: options.webhookProxy,
      eventSource: undefined,
    };

    this.probotApp = new options.Probot({
      request: options.request,
      server: this,
    });
    this.log = options.log
      ? rebindLog(options.log)
      : rebindLog(this.probotApp.log.child({ name: "server" }));

    const logger = httpLogger(this.log, options.loggingOptions);

    const {
      enablePing = true,
      enableNotFound = true,
      enableStaticFiles = true,
    } = options;

    const mainHandler: Handler = async (req, res) => {
      logger(req, res);

      try {
        for (const handler of this.handlers) {
          if (await handler(req, res)) {
            return true;
          }
        }

        if (enableNotFound) {
          notFoundHandler(req, res);
        }
      } catch (e) {
        this.log.error(e);
        res.writeHead(500).end();
        return true;
      }

      return false;
    };

    const webhookHandler = createNodeMiddleware(this.probotApp.webhooks, {
      log: this.log,
      path: this.#state.webhookPath,
    });

    this.addHandler(webhookHandler);

    if (enableStaticFiles) {
      this.addHandler(staticFilesHandler);
    }

    if (enablePing) {
      this.addHandler(pingHandler);
    }

    this.#state.httpServer.on("request", mainHandler);
  }

  public addHandler(handler: Handler) {
    this.handlers.push(handler);
  }

  public async loadHandlerFactory(appFn: HandlerFactory) {
    const handler = await appFn(this.probotApp, {
      cwd: this.#state.cwd,
      addHandler: (handler: Handler) => {
        this.addHandler(handler as unknown as Handler);
      },
    });

    this.handlers.push(handler);
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
    const runtimeName = getRuntimeName(globalThis);
    const runtimeVersion = getRuntimeVersion(globalThis);

    this.log.info(
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

          this.log.info(`Listening on http://${printableHost}:${port}`);
          resolve(server);
        },
      );

      server.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          error = Object.assign(error, {
            message: `Port ${this.#state.port} is already in use. You can define the PORT environment variable to use a different port.`,
          });
        }

        this.log.error(error);
        reject(error);
      });
    });

    if (this.#state.webhookProxy) {
      this.#state.eventSource = await createWebhookProxy({
        host: this.#state.host,
        port: this.#state.port,
        path: this.#state.webhookPath,
        logger: this.log,
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
