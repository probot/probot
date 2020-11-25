import { RequestListener, IncomingMessage, ServerResponse } from "http";
import { NextFunction } from "express";

import { ApplicationFunction } from "./types";
import { ServerOptions } from "./types";

export function createNodeMiddleware(
  appFn: ApplicationFunction,
  options: ServerOptions
): RequestListener {
  return (
    request: IncomingMessage,
    response: ServerResponse,
    next?: NextFunction
  ) => {
    const probot = new options.Probot();
    probot.load(appFn);
    probot.webhooks.middleware(request, response, next);
  };
}
