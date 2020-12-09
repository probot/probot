import { RequestListener } from "http";

import { ApplicationFunction } from "./types";
import { MiddlewareOptions } from "./types";

export function createNodeMiddleware(
  appFn: ApplicationFunction,
  { probot }: MiddlewareOptions
): RequestListener {
  probot.load(appFn);

  return probot.webhooks.middleware;
}
