import type { IncomingMessage, ServerResponse } from "node:http";
import { createNodeMiddleware as createWebhooksMiddleware } from "@octokit/webhooks";

import type {
  ApplicationFunction,
  Handler,
  MiddlewareOptions,
} from "./types.js";
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
) => boolean | void | Promise<void | boolean> {
  const handlers: Handler[] = [];

  probot.load(appFn, {
    cwd: process.cwd(),
    addHandler: (handler) => {
      handlers.push(handler);
    },
  });

  const mainHandler: Handler = async (req, res) => {
    try {
      for (const handler of handlers) {
        if (await handler(req, res)) {
          return true;
        }
      }
    } catch (e) {
      probot.log.error(e);
      res.writeHead(500).end();
      return true;
    }

    return false;
  };

  handlers.push(
    createWebhooksMiddleware(probot.webhooks, {
      path: webhooksPath || probot.webhookPath || defaultWebhooksPath,
    }),
  );

  return mainHandler;
}
