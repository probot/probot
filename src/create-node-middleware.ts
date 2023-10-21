import type { RequestListener } from "http";
import { createNodeMiddleware as createWebhooksMiddleware } from "@octokit/webhooks";

import type { ApplicationFunction } from "./types";
import type { MiddlewareOptions } from "./types";
import { defaultWebhooksPath } from "./server/server";

export function createNodeMiddleware(
  appFn: ApplicationFunction,
  { probot, webhooksPath }: MiddlewareOptions
): RequestListener {
  probot.load(appFn);

  return createWebhooksMiddleware(probot.webhooks, {
    path: webhooksPath || defaultWebhooksPath,
  });
}
