import { Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";

import type { RequestRequestOptions } from "@octokit/types";
import type { Logger } from "pino";

import { Probot } from "../probot.js";
import { VERSION } from "../version.js";
import type {
  ApplicationFunction,
  Handler,
  HandlerFactory,
  MiddlewareHandler,
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
import { requireValue } from "../helpers/require-value.js";

import { httpLogger } from "./handlers/http-logger.js";
import { notFoundHandler } from "./handlers/not-found.js";
import { pingHandler } from "./handlers/ping.js";
import { staticFilesHandler } from "./handlers/static-files.js";
import { getLog } from "../helpers/get-log.js";

// the default path as defined in @octokit/webhooks
export const defaultWebhookPath = "/api/github/webhooks";
export const defaultWebhookSecret = "development";

function isAddressInfo(address: unknown): address is AddressInfo {
  if (typeof address !== "object" || address === null) {
    return false;
  }

  const candidate = address as Record<string, unknown>;
  return (
    typeof candidate.port === "number" &&
    typeof candidate.address === "string" &&
    (typeof candidate.family === "string" ||
      typeof candidate.family === "number")
  );
}

export function validateAddressInfo(address: unknown): AddressInfo {
  if (!isAddressInfo(address)) {
    throw new Error("Unable to determine the server address");
  }

  return address;
}

type State = {
  initializeRan: boolean;
  initializationPromise: DeferredPromise<void>;
  cwd: string;
  httpServer: HttpServer;
  port: number;
  host: string;
  log?: Logger | undefined;
  getLog: NonNullable<ServerOptions["getLog"]>;
  loggingOptions?: NonNullable<ServerOptions["loggingOptions"]>;
  probot: Probot | null;
  ProbotBase: typeof Probot;
  request?: RequestRequestOptions | undefined;
  webhookPath: string;
  webhookProxy?: string | undefined;
  loadSmeeClient?: ServerOptions["loadSmeeClient"];
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

  constructor(options: ServerOptions = { Probot }) {
    this.#state = {
      initializeRan: false,
      initializationPromise: createDeferredPromise<void>(),
      probot: null,
      log: options.log,
      getLog: options.getLog || getLog,
      httpServer: new HttpServer(),
      cwd: options.cwd || process.cwd(),
      port: options.port || 3000,
      host: options.host || "localhost",
      webhookPath: options.webhookPath || defaultWebhookPath,
      webhookProxy: options.webhookProxy,
      loadSmeeClient: options.loadSmeeClient,
      eventSource: undefined,
      request: options.request,
      ProbotBase: options.Probot || Probot,
      addedHandlers: [],
      handlers: [],
      enablePing: options.enablePing ?? true,
      enableNotFound: options.enableNotFound ?? true,
      enableStaticFiles: options.enableStaticFiles ?? true,
    };

    this.#state.httpServer.on("request", async (req, res) => {
      requireValue(
        this.#state.httpLogger,
        "Server HTTP logger is not initialized",
      )(req, res);

      try {
        for (const handler of this.#state.handlers) {
          if (await handler(req, res)) {
            return true;
          }
        }
      } catch (e) {
        requireValue(this.#state.log, "Server logger is not initialized").error(
          e,
        );
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
      const log = (this.#state.log = (
        this.#state.log || (await this.#state.getLog())
      ).child({ name: "server" }));

      await (this.#state.probot = createProbot(this.#state, this, log)).ready();

      this.#state.httpLogger = httpLogger(log, this.#state.loggingOptions);

      this.#state.initializationPromise.resolve();
    } catch (error) {
      this.#state.initializationPromise.reject(error);
      if (this.#state.log) {
        this.#state.log.error({ err: error }, "Failed to initialize Server");
      } else {
        console.error("Failed to initialize Server", error);
      }
      throw error;
    }
    return this.#state.initializationPromise.promise;
  }

  public addHandler(handler: Handler | MiddlewareHandler) {
    this.#state.addedHandlers.push(handler as Handler);
  }

  public async loadHandlerFactory(appFn: HandlerFactory) {
    await this.#initialize();

    const handler = await appFn(
      requireValue(this.#state.probot, "Probot is not initialized"),
      {
        cwd: this.#state.cwd,
        addHandler: (handler: Handler | MiddlewareHandler) => {
          this.addHandler(handler);
        },
      },
    );

    this.addHandler(handler);
  }

  public async load(appFn: ApplicationFunction) {
    await this.#initialize();

    await appFn(requireValue(this.#state.probot, "Probot is not initialized"), {
      cwd: this.#state.cwd,
      addHandler: (handler: Handler | MiddlewareHandler) => {
        this.addHandler(handler);
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

    this.#state.handlers.unshift(
      await requireValue(
        this.#state.probot,
        "Probot is not initialized",
      ).getNodeMiddleware(),
    );

    this.#state.handlers.push(...this.#state.addedHandlers);

    if (this.#state.enableNotFound === true) {
      this.#state.handlers.push(notFoundHandler);
    }

    const runtimeName = getRuntimeName(globalThis);
    const runtimeVersion = getRuntimeVersion(globalThis);

    requireValue(this.#state.log, "Server logger is not initialized").info(
      `Running Probot v${VERSION} (${runtimeName}: ${runtimeVersion})`,
    );
    const printableHost = getPrintableHost(this.#state.host);

    this.#state.httpServer = await new Promise((resolve, reject) => {
      const server = this.#state.httpServer.listen(
        { port: this.#state.port, host: this.#state.host },
        () => {
          const { port, address, family } = validateAddressInfo(
            server.address(),
          );

          this.#state.port = port;
          this.#state.host = address;

          if (family === "IPv6") {
            this.#state.host = `[${address}]`;
          }

          requireValue(
            this.#state.log,
            "Server logger is not initialized",
          ).info(`Listening on http://${printableHost}:${port}`);
          resolve(server);
        },
      );

      server.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          error = Object.assign(error, {
            message: `Port ${this.#state.port} is already in use. You can define the PORT environment variable to use a different port.`,
          });
        }

        requireValue(this.#state.log, "Server logger is not initialized").error(
          error,
        );
        reject(error);
      });
    });

    if (this.#state.webhookProxy) {
      this.#state.eventSource = await createWebhookProxy({
        host: this.#state.host,
        port: this.#state.port,
        path: this.#state.webhookPath,
        logger: requireValue(
          this.#state.log,
          "Server logger is not initialized",
        ),
        url: this.#state.webhookProxy,
        loadSmeeClient: this.#state.loadSmeeClient,
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

function createProbot(state: State, server: Server, log: Logger): Probot {
  return new state.ProbotBase({
    request: state.request,
    log,
    server,
    webhookPath: state.webhookPath,
  });
}
