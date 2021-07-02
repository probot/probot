import { Server as HttpServer } from "http";

import express, { Application, Router } from "express";
import { join } from "path";
import { Logger } from "pino";
import { createNodeMiddleware as createWebhooksMiddleware } from "@octokit/webhooks";

import { getLog } from "../helpers/get-log";
import { getLoggingMiddleware } from "./logging-middleware";
import { createWebhookProxy } from "../helpers/webhook-proxy";
import { VERSION } from "../version";
import { ApplicationFunction, ServerOptions } from "../types";
import { Probot } from "../";

type State = {
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
    this.log = options.log || getLog().child({ name: "server" });
    this.probotApp = new options.Probot();

    this.state = {
      port: options.port,
      host: options.host,
      webhookPath: options.webhookPath || "/",
      webhookProxy: options.webhookProxy,
    };

    this.expressApp.use(getLoggingMiddleware(this.log));
    this.expressApp.use(
      "/probot/static/",
      express.static(join(__dirname, "..", "..", "static"))
    );
    this.expressApp.use(
      this.state.webhookPath,
      createWebhooksMiddleware(this.probotApp.webhooks, {
        path: "/",
      })
    );

    this.expressApp.set("view engine", "hbs");
    this.expressApp.set("views", join(__dirname, "..", "..", "views"));
    this.expressApp.get("/ping", (req, res) => res.end("PONG"));
  }

  public async load(appFn: ApplicationFunction) {
    await appFn(this.probotApp, {
      getRouter: (path) => this.router(path),
    });
  }

  public async start() {
    this.log.info(
      `Running Probot v${this.version} (Node.js: ${process.version})`
    );
    const port = this.state.port || 3000;
    const { host, webhookPath, webhookProxy } = this.state;
    const printableHost = host ?? "localhost";

    this.state.httpServer = (await new Promise((resolve, reject) => {
      const server = this.expressApp.listen(
        port,
        ...((host ? [host] : []) as any),
        () => {
          if (webhookProxy) {
            this.state.eventSource = createWebhookProxy({
              logger: this.log,
              path: webhookPath,
              port: port,
              url: webhookProxy,
            }) as EventSource;
          }
          this.log.info(`Listening on http://${printableHost}:${port}`);
          resolve(server);
        }
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
    })) as HttpServer;

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
