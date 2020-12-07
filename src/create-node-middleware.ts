import { RequestListener, IncomingMessage, ServerResponse } from "http";
import { NextFunction } from "express";

import { ApplicationFunction } from "./types";
import { MiddlewareOptions } from "./types";

export function createNodeMiddleware(
  appFn: ApplicationFunction,
  { probot }: MiddlewareOptions
): RequestListener {
  return (
    request: IncomingMessage,
    response: ServerResponse,
    next?: NextFunction
  ) => {
    probot.load(appFn);
    probot.webhooks.middleware(request, response, next);
  };
}
