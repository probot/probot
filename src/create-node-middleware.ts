import type { RequestListener } from "http";
import { createNodeMiddleware as createWebhooksMiddleware } from "@octokit/webhooks";

import type { ApplicationFunction, MiddlewareOptions } from "./types";
import { defaultWebhooksPath } from "./server/server";
import { createProbot } from ".";

export function createNodeMiddleware(
  appFn: ApplicationFunction,
  { probot = createProbot(), webhooksPath }: MiddlewareOptions,
): RequestListener {
  probot.load(appFn);

  return createWebhooksMiddleware(probot.webhooks, {
    path: webhooksPath || probot.webhookPath || defaultWebhooksPath,
  });
}
