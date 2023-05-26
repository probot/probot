import { createNodeMiddleware as createWebbhooksMiddleware } from "@octokit/webhooks";
import { RequestListener } from "http";

import { ApplicationFunction, MiddlewareOptions } from "./types.js";

export function createNodeMiddleware(
  appFn: ApplicationFunction,
  { probot, webhooksPath }: MiddlewareOptions
): RequestListener {
  probot.load(appFn);

  return createWebbhooksMiddleware(probot.webhooks, {
    path: webhooksPath || "/",
  });
}
