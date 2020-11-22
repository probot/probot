import { Server as HttpServer } from "http";

import express, { Application, Router } from "express";
import { join } from "path";
import { Logger } from "pino";

import { getLog } from "../helpers/get-log";
import { getLoggingMiddleware } from "./logging-middleware";
import { createWebhookProxy } from "../helpers/webhook-proxy";
import { VERSION } from "../version";

export type ServerOptions = {
  log?: Logger;
  port?: number;
  host?: string;
  webhookPath?: string;
  webhookProxy?: string;
};

type State = {
  httpServer?: HttpServer;
  port?: number;
  host?: string;
  webhookPath?: string;
  webhookProxy?: string;
  router: Router;
};

export class Server {
  public app: Application;
  public log: Logger;
  public version = VERSION;

  private state: State;

  constructor(options: ServerOptions = {}) {
    this.app = express();
    this.log = options.log || getLog().child({ name: "server" });

    this.state = {
      port: options.port,
      host: options.host,
      webhookPath: options.webhookPath || "/",
      webhookProxy: options.webhookProxy,
      router: Router(),
    };

    this.app.use(getLoggingMiddleware(this.log));
    this.app.use(
      "/probot/static/",
      express.static(join(__dirname, "..", "..", "static"))
    );
    this.app.set("view engine", "hbs");
    this.app.set("views", join(__dirname, "..", "..", "views"));
    this.app.get("/ping", (req, res) => res.end("PONG"));
    this.app.use(this.state.router);
  }

  public async start() {
    this.log.info(
      `Running Probot v${this.version} (Node.js: ${process.version})`
    );
    const port = this.state.port || 3000;
    const { host, webhookPath, webhookProxy } = this.state;
    const printableHost = host ?? "localhost";

    this.state.httpServer = (await new Promise((resolve, reject) => {
      const server = this.app.listen(
        port,
        ...((host ? [host] : []) as any),
        () => {
          if (webhookProxy) {
            createWebhookProxy({
              logger: this.log,
              path: webhookPath,
              port: port,
              url: webhookProxy,
            });
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
    if (!this.state.httpServer) return;
    const server = this.state.httpServer;
    return new Promise((resolve) => server.close(resolve));
  }

  public router(path?: string) {
    if (path) {
      const newRouter = Router();
      this.state.router.use(path, newRouter);
      return newRouter;
    }

    return this.state.router;
  }
}
