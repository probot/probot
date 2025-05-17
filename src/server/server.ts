import { createServer, type Server as HttpServer } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import express, { Router, type Application } from "express";
import type { Logger } from "pino";
import { createNodeMiddleware as createWebhooksMiddleware } from "@octokit/webhooks";

import { getLoggingMiddleware } from "./logging-middleware.js";
import { createWebhookProxy } from "../helpers/webhook-proxy.js";
import { VERSION } from "../version.js";
import type { ApplicationFunction, ServerOptions } from "../types.js";
import type { Probot } from "../exports.js";
import { rebindLog } from "../helpers/rebind-log.js";
import { getPrintableHost } from "./get-printable-host.js";

// the default path as defined in @octokit/webhooks
export const defaultWebhooksPath = "/api/github/webhooks";

const __dirname = dirname(fileURLToPath(import.meta.url));

type State = {
  cwd?: string;
  httpServer?: HttpServer;
  port: number;
  host: string;
  webhookPath: string;
  webhookProxy?: string;
  eventSource?: EventSource;
};

export class Server {
  static version = VERSION;

  public expressApp: Application;
  public log: Logger;
  public version = VERSION;
  public probotApp: Probot;

  #state: State;

  constructor(options: ServerOptions = {} as ServerOptions) {
    this.expressApp = express();
    this.probotApp = new options.Probot({
      request: options.request,
    });
    this.log = options.log
      ? rebindLog(options.log)
      : rebindLog(this.probotApp.log.child({ name: "server" }));

    this.#state = {
      cwd: options.cwd || process.cwd(),
      port: options.port || 3000,
      host: options.host || "localhost",
      webhookPath: options.webhookPath || defaultWebhooksPath,
      webhookProxy: options.webhookProxy,
    };

    this.expressApp.use(getLoggingMiddleware(this.log, options.loggingOptions));
    this.expressApp.use(
      "/probot/static/",
      express.static(join(__dirname, "..", "..", "static")),
    );
    // Wrap the webhooks middleware in a function that returns void due to changes in the types for express@v5
    // Before, the express types for middleware simply had a return type of void,
    // now they have a return type of `void | Promise<void>`.
    this.expressApp.use(async (req, res, next) => {
      await createWebhooksMiddleware(this.probotApp.webhooks, {
        path: this.#state.webhookPath,
      })(req, res, next);
    });

    this.expressApp.get("/ping", (_req, res) => {
      res.end("PONG");
    });
  }

  public async load(appFn: ApplicationFunction) {
    await appFn(this.probotApp, {
      cwd: this.#state.cwd,
      getRouter: (path) => this.router(path),
    });
  }

  public async start(): Promise<HttpServer> {
    this.log.info(
      `Running Probot v${this.version} (Node.js: ${process.version})`,
    );
    const { host, webhookPath, webhookProxy, port } = this.#state;
    const printableHost = getPrintableHost(host);

    this.#state.httpServer = await new Promise((resolve, reject) => {
      const server = createServer(this.expressApp).listen(
        port,
        ...((host ? [host] : []) as any),
        async () => {
          if (webhookProxy) {
            this.#state.eventSource = await createWebhookProxy({
              host,
              port,
              path: webhookPath,
              logger: this.log,
              url: webhookProxy,
            });
          }
          this.log.info(`Listening on http://${printableHost}:${port}`);
          resolve(server);
        },
      );

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

    return this.#state.httpServer;
  }

  public async stop(): Promise<void> {
    if (this.#state.eventSource) this.#state.eventSource.close();
    if (!this.#state.httpServer) return;
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

  public router(path: string = "/"): Router {
    const newRouter = Router();
    this.expressApp.use(path, newRouter);
    return newRouter;
  }
}
