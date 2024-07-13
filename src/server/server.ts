import type { Server as HttpServer } from "node:http";
import { join } from "node:path";

import express, { Router, type Application } from "express";
import type { Logger } from "pino";
import { createNodeMiddleware as createWebhooksMiddleware } from "@octokit/webhooks";

import { getLoggingMiddleware } from "./logging-middleware.js";
import { createWebhookProxy } from "../helpers/webhook-proxy.js";
import { VERSION } from "../version.js";
import type { ApplicationFunction, ServerOptions } from "../types.js";
import type { Probot } from "../index.js";
import { rebindLog } from "../helpers/rebind-log.js";

// the default path as defined in @octokit/webhooks
export const defaultWebhooksPath = "/api/github/webhooks";

type State = {
  cwd?: string;
  httpServer?: HttpServer;
  port?: number;
  host?: string;
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

  private state: State;

  constructor(options: ServerOptions = {} as ServerOptions) {
    this.expressApp = express();
    this.probotApp = new options.Probot({
      request: options.request,
    });
    this.log = options.log
      ? rebindLog(options.log)
      : rebindLog(this.probotApp.log.child({ name: "server" }));

    this.state = {
      cwd: options.cwd || process.cwd(),
      port: options.port,
      host: options.host,
      webhookPath: options.webhookPath || defaultWebhooksPath,
      webhookProxy: options.webhookProxy,
    };

    this.expressApp.use(getLoggingMiddleware(this.log, options.loggingOptions));
    this.expressApp.use(
      "/probot/static/",
      express.static(join(__dirname, "..", "..", "static")),
    );
    this.expressApp.use(
      createWebhooksMiddleware(this.probotApp.webhooks, {
        path: this.state.webhookPath,
      }),
    );

    this.expressApp.get("/ping", (_req, res) => res.end("PONG"));
  }

  public async load(appFn: ApplicationFunction) {
    await appFn(this.probotApp, {
      cwd: this.state.cwd,
      getRouter: (path) => this.router(path),
    });
  }

  public async start() {
    this.log.info(
      `Running Probot v${this.version} (Node.js: ${process.version})`,
    );
    const port = this.state.port || 3000;
    const { host, webhookPath, webhookProxy } = this.state;
    const printableHost = host ?? "localhost";

    this.state.httpServer = await new Promise((resolve, reject) => {
      const server = this.expressApp.listen(
        port,
        ...((host ? [host] : []) as any),
        async () => {
          if (webhookProxy) {
            this.state.eventSource = await createWebhookProxy({
              logger: this.log,
              path: webhookPath,
              port: port,
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

    return this.state.httpServer;
  }

  public async stop() {
    if (this.state.eventSource) this.state.eventSource.close();
    if (!this.state.httpServer) return;
    const server = this.state.httpServer;
    return new Promise((resolve) => server.close(resolve));
  }

  public router(path: string = "/") {
    const newRouter = Router();
    this.expressApp.use(path, newRouter);
    return newRouter;
  }
}
