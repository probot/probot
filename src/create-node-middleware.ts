import { RequestListener } from "http";

import { Deprecation } from "deprecation";

import { ApplicationFunction } from "./types";
import { MiddlewareOptions } from "./types";

export function createNodeMiddleware(
  appFn: ApplicationFunction,
  { probot, Probot }: MiddlewareOptions
): RequestListener {
  if (Probot) {
    probot = new Probot();
    probot.log.warn(
      new Deprecation(
        `"createNodeMiddleware(app, { Probot })" is deprecated. Use "createNodeMiddleware(app, { probot })" instead`
      )
    );
  }

  probot.load(appFn);

  return probot.webhooks.middleware;
}
