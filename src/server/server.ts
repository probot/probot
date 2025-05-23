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
  NodeHandler,
  ServerOptions,
} from "../types.js";
import type { Probot } from "../exports.js";
import { rebindLog } from "../helpers/rebind-log.js";

import { loggingHandler } from "./handlers/logging.js";
import { getPrintableHost } from "./helpers/get-printable-host.js";

import { notFoundHandler } from "./handlers/not-found.js";
import { pingHandler } from "./handlers/ping.js";
import { staticFilesHandler } from "./handlers/static-files.js";

// the default path as defined in @octokit/webhooks
export const defaultWebhooksPath = "/api/github/webhooks";

type State = {
  cwd: string;
  httpServer: HttpServer;
  port: number;
  host: string;
  webhookPath: string;
  webhookProxy?: string;
  eventSource?: EventSource;
};

export class Server {
  static version = VERSION;

  public log: Logger;
  public version = VERSION;
  public probotApp: Probot;
  public handlers: Handler[] = [];

  #state: State;

  constructor(options: ServerOptions = {} as ServerOptions) {
    this.#state = {
      httpServer: new HttpServer(),
      cwd: options.cwd || process.cwd(),
      port: options.port || 3000,
      host: options.host || "localhost",
      webhookPath: options.webhookPath || defaultWebhooksPath,
      webhookProxy: options.webhookProxy,
    };

    this.probotApp = new options.Probot({
      request: options.request,
    });
    this.log = options.log
      ? rebindLog(options.log)
      : rebindLog(this.probotApp.log.child({ name: "server" }));

    const logger = loggingHandler(this.log, options.loggingOptions);

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
    });

    this.handlers.push(handler);
  }

  public async load(appFn: ApplicationFunction) {
    await appFn(this.probotApp, {
      cwd: this.#state.cwd,
      addHandler: (handler: NodeHandler) => {
        this.addHandler(handler as unknown as Handler);
      },
    });
  }

  public async start(): Promise<HttpServer> {
    this.log.info(
      `Running Probot v${this.version} (Node.js: ${process.version})`,
    );
    const { port, host, webhookPath, webhookProxy } = this.#state;
    const printableHost = getPrintableHost(host);

    this.#state.httpServer = await new Promise((resolve, reject) => {
      const server = this.#state.httpServer!.listen(port, host, async () => {
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
