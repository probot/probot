import { RequestListener } from "http";
import { createNodeMiddleware as createWebhooksMiddleware } from "@octokit/webhooks";

import { ApplicationFunction } from "./types";
import { MiddlewareOptions } from "./types";

export function createNodeMiddleware(
  appFn: ApplicationFunction,
  { probot, webhooksPath }: MiddlewareOptions
): RequestListener {
  probot.load(appFn);

  return createWebhooksMiddleware(probot.webhooks, {
    path: webhooksPath || "/",
  });
}
