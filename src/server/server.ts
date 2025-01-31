import fs from "node:fs";
import { Server as HttpServer } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { Logger } from "pino";
import { createNodeMiddleware } from "@octokit/webhooks";

import { getLoggingMiddleware } from "./logging-middleware.js";
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

// the default path as defined in @octokit/webhooks
export const defaultWebhooksPath = "/api/github/webhooks";

const __dirname = dirname(fileURLToPath(import.meta.url));

const robotSvg = fs.readFileSync(
  join(__dirname, "..", "..", "static", "robot.svg"),
  "utf-8",
);
const probotHeadPng = fs.readFileSync(
  join(__dirname, "..", "..", "static", "probot-head.png"),
  "utf-8",
);
const primerCss = fs.readFileSync(
  join(__dirname, "..", "..", "static", "primer.css"),
  "utf-8",
);

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

  public log: Logger;
  public version = VERSION;
  public probotApp: Probot;
  public handlers: Handler[] = [];

  private state: State;

  constructor(options: ServerOptions = {} as ServerOptions) {
    this.probotApp = new options.Probot({
      request: options.request,
    });
    this.log = options.log
      ? rebindLog(options.log)
      : rebindLog(this.probotApp.log.child({ name: "server" }));

    const logger = getLoggingMiddleware(this.log, options.loggingOptions);

    const handler: Handler = async (req, res) => {
      logger(req, res);

      try {
        for (const handler of this.handlers) {
          if (await handler(req, res)) {
            return true;
          }
        }
      } catch (e) {
        this.log.error(e);
        res.writeHead(500).end();
        return true;
      }
      res.writeHead(404).end();

      return true;
    };

    this.state = {
      httpServer: new HttpServer(handler),
      cwd: options.cwd || process.cwd(),
      port: options.port,
      host: options.host,
      webhookPath: options.webhookPath || defaultWebhooksPath,
      webhookProxy: options.webhookProxy,
    };

    const staticFilesHandler: Handler = (req, res) => {
      if (req.method === "GET") {
        const path = req.url?.split("?")[0] || "";
        if (path === "/probot/static/robot.svg") {
          res.writeHead(200, { "content-type": "image/svg+xml" }).end(robotSvg);
          return true;
        }
        if (path === "/probot/static/probot-head.png") {
          res
            .writeHead(200, { "content-type": "image/png" })
            .end(probotHeadPng);
          return true;
        }
        if (path === "/probot/static/primer.css") {
          res.writeHead(200, { "content-type": "text/css" }).end(primerCss);
          return true;
        }
      }
      return false;
    };

    const pingPongHandler: Handler = (req, res) => {
      if (req.method === "GET") {
        const path = req.url?.split("?")[0] || "";
        if (path === "/ping") {
          res.writeHead(200, { "content-type": "text/plain" }).end("PONG");
          return true;
        }
      }
      return false;
    };

    this.handlers.push(staticFilesHandler);

    const webhookHandler = createNodeMiddleware(this.probotApp.webhooks, {
      log: this.log,
      path: this.state.webhookPath,
    });

    this.handlers.push(webhookHandler);

    this.handlers.push(pingPongHandler);
  }

  public async loadHandler(appFn: HandlerFactory) {
    this.handlers.push(
      await appFn(this.probotApp, {
        cwd: this.state.cwd,
      }),
    );
  }

  public async load(appFn: ApplicationFunction) {
    await appFn(this.probotApp, {
      cwd: this.state.cwd,
    });
  }

  public async start(): Promise<HttpServer> {
    this.log.info(
      `Running Probot v${this.version} (Node.js: ${process.version})`,
    );
    const port = this.state.port || 3000;
    const { host, webhookPath, webhookProxy } = this.state;
    const printableHost = host ?? "localhost";

    this.state.httpServer = await new Promise((resolve, reject) => {
      const server = this.state.httpServer!.listen(
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

  public async stop(): Promise<unknown> {
    if (this.state.eventSource) this.state.eventSource.close();
    if (!this.state.httpServer) return;
    const server = this.state.httpServer;
    return new Promise((resolve) => server.close(resolve));
  }
}
