import type { RequestListener } from "http";
import { createNodeMiddleware as createWebhooksMiddleware } from "@octokit/webhooks";

import type { ApplicationFunction, MiddlewareOptions } from "./types.js";
import { defaultWebhooksPath } from "./server/server.js";
import { createProbot } from "./create-probot.js";

export function createNodeMiddleware(
  appFn: ApplicationFunction,
  { probot = createProbot(), webhooksPath } = {} as MiddlewareOptions,
): RequestListener {
  probot.load(appFn);

  return createWebhooksMiddleware(probot.webhooks, {
    path: webhooksPath || probot.webhookPath || defaultWebhooksPath,
  });
}
