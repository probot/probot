import {
  type Server as HttpServer,
  createServer,
  IncomingMessage,
  ServerResponse,
} from "node:http";
import fs from "node:fs";
import path from "node:path";

import express, { Router, type Application } from "express";
import type { Logger } from "pino";
import { createNodeHandler as createWebhooksHandler } from "@octokit/webhooks";

// import { getLoggingMiddleware } from "./logging-middleware.js";
import { createWebhookProxy } from "../helpers/webhook-proxy.js";
import { VERSION } from "../version.js";
import type { ApplicationFunction, ServerOptions } from "../types.js";
import { Probot } from "../index.js";
import type EventSource from "eventsource";

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
    options = {
      ...options,
      request: options.request,
      secret: options.secret || process.env.WEBHOOK_SECRET,
      appId: options.appId || process.env.APP_ID,
      port:
        options.port ||
        (process.env.PORT && parseInt(process.env.PORT, 10)) ||
        3000,
      privateKey: options.privateKey || process.env.PRIVATE_KEY,
      webhookPath:
        options.webhookPath || process.env.WEBHOOK_PATH || defaultWebhooksPath,
      Probot: options.Probot,
      loggingOptions: {
        ...options.loggingOptions,
        level: options.loggingOptions?.level || process.env.LOG_LEVEL || "info",
      },
    };
    this.probotApp =
      (options.Probot && new options.Probot(options)) || new Probot(options);
    this.log =
      options.log ||
      this.probotApp.log.child({
        level: options.loggingOptions?.level,
        name: "server",
      });
    this.probotApp.log.level = "silent";
    this.log.level = "silent";

    this.state = {
      cwd: options.cwd || process.cwd(),
      port: options.port,
      host: options.host,
      webhookPath: options.webhookPath || defaultWebhooksPath,
      webhookProxy: options.webhookProxy,
    };
  }

  public async load(appFn: ApplicationFunction) {
    await appFn(this.probotApp, {
      cwd: this.state.cwd,
    });
  }

  public async start() {
    this.log.info(
      `Running Probot v${this.version} (Node.js: ${process.version})`,
    );
    const { host, webhookPath, webhookProxy, port = 3000 } = this.state;
    const printableHost = host ?? "localhost";

    const primerCss = fs.readFileSync(
      path.join(__dirname, "..", "..", "static", "primer.css"),
    );
    const robotSvg = fs.readFileSync(
      path.join(__dirname, "..", "..", "static", "robot.svg"),
    );
    const probotHeadPng = fs.readFileSync(
      path.join(__dirname, "..", "..", "static", "probot-head.png"),
    );

    const notFoundHandler = (_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(404).end();
    };
    const simpleRouter = {
      POST: {
        [this.state.webhookPath]: createWebhooksHandler(
          this.probotApp.webhooks,
          { log: this.log },
        ),
      },
      GET: {
        "/ping": (_req: IncomingMessage, res: ServerResponse) =>
          res.end("PONG"),
        "/probot/static/primer.css": (
          _req: IncomingMessage,
          res: ServerResponse,
        ) => {
          res.writeHead(200, { "content-type": "text/css" }).end(primerCss);
        },
        "/probot/static/robot.svg": (
          _req: IncomingMessage,
          res: ServerResponse,
        ) => {
          res
            .writeHead(200, {
              "content-type": "image/svg+xml",
            })
            .end(robotSvg);
        },
        "/probot/static/probot-head.png": (
          _req: IncomingMessage,
          res: ServerResponse,
        ) => {
          res
            .writeHead(200, {
              "content-type": "image/png",
            })
            .end(probotHeadPng);
        },
      },
    };

    this.state.httpServer = await new Promise((resolve, reject) => {
      const server = createServer(
        async (req: IncomingMessage, res: ServerResponse) => {
          const handler =
            simpleRouter[req.method as "POST"]?.[req.url!] || notFoundHandler;
          await handler(req, res);
        },
      ).listen(port, ...((host ? [host] : []) as any), async () => {
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
