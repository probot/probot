import path from "path";

import express from "express";

import { getLoggingMiddleware } from "./logging-middleware";

import type { Logger } from "pino";

// Teach express to properly handle async errors
// tslint:disable-next-line:no-var-requires
require("express-async-errors");

export const createServer = (options: ServerOptions) => {
  const app: express.Application = express();

  app.use(getLoggingMiddleware(options.logger));
  app.use(
    "/probot/static/",
    express.static(path.join(__dirname, "..", "..", "static"))
  );
  app.use(options.webhook);
  app.set("view engine", "hbs");
  app.set("views", path.join(__dirname, "..", "..", "views"));
  app.get("/ping", (req, res) => res.end("PONG"));

  return app;
};

export interface ServerOptions {
  webhook: express.Application;
  logger: Logger;
}
