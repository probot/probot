import { RequestListener, IncomingMessage, ServerResponse } from "http";

import { Deprecation } from "deprecation";
import { NextFunction } from "express";

import { ApplicationFunction } from "./types";
import { MiddlewareOptions } from "./types";

export function createNodeMiddleware(
  appFn: ApplicationFunction,
  { probot, Probot }: MiddlewareOptions
): RequestListener {
  return (
    request: IncomingMessage,
    response: ServerResponse,
    next?: NextFunction
  ) => {
    if (Probot) {
      probot = new Probot();
      probot.log.warn(
        new Deprecation(
          `"createNodeMiddleware(app, { Probot })" is deprecated. Use "createNodeMiddleware(app, { probot })" instead`
        )
      );
    }

    probot.load(appFn);
    probot.webhooks.middleware(request, response, next);
  };
}
