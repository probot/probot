import type { IncomingMessage, ServerResponse } from "node:http";
import { createNodeMiddleware as createWebhooksMiddleware } from "@octokit/webhooks";

import type { ApplicationFunction, MiddlewareOptions } from "./types.js";
import { defaultWebhooksPath } from "./server/server.js";
import { createProbot } from "./create-probot.js";

/**
 * Create a Node/Express middleware.
 *
 * ```javascript
 * import { createServer } from "node:http"
 * import { createProbot, createNodeMiddleware } from "probot"
 *
 * const appFn = (app) => {
 *   app.on("issues.opened", async (context) => {
 *     const issueComment = context.issue({
 *       body: "Thanks for opening this issue!",
 *     });
 *     return context.octokit.issues.createComment(issueComment);
 *   });
 * };
 *
 * const middleware = createNodeMiddleware(appFn, { probot: createProbot() });
 *
 * const server = createServer((req, res) => {
 *   middleware(req, res, () => {
 *     res.writeHead(404);
 *     res.end();
 *   });
 * });
 * ```
 */
export function createNodeMiddleware(
  appFn: ApplicationFunction,
  { probot = createProbot(), webhooksPath } = {} as MiddlewareOptions,
): (
  request: IncomingMessage,
  response: ServerResponse,
  next?: () => void,
) => Promise<boolean> {
  probot.load(appFn);

  return createWebhooksMiddleware(probot.webhooks, {
    path: webhooksPath || probot.webhookPath || defaultWebhooksPath,
  });
}
