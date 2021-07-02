import { RequestListener } from "http";
import { createNodeMiddleware as createWebbhooksMiddleware } from "@octokit/webhooks";

import { ApplicationFunction } from "./types";
import { MiddlewareOptions } from "./types";

export function createNodeMiddleware(
  appFn: ApplicationFunction,
  { probot, webhooksPath }: MiddlewareOptions
): RequestListener {
  probot.load(appFn);

  return createWebbhooksMiddleware(probot.webhooks, {
    path: webhooksPath || "/",
  });
}
