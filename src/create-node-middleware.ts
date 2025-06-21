import type { IncomingMessage, ServerResponse } from "node:http";

import type {
  ApplicationFunction,
  Handler,
  MiddlewareOptions,
} from "./types.js";
import { defaultWebhookPath } from "./server/server.js";
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
export async function createNodeMiddleware(
  appFn: ApplicationFunction,
  { probot = createProbot(), webhooksPath } = {} as MiddlewareOptions,
): Promise<
  (
    request: IncomingMessage,
    response: ServerResponse,
    next?: () => void,
  ) => boolean | void | Promise<void | boolean>
> {
  const handlers: Handler[] = [];

  await probot.ready();

  probot.load(appFn, {
    cwd: process.cwd(),
    addHandler: (handler) => {
      handlers.push(handler);
    },
  });

  handlers.push(
    await probot.getNodeMiddleware({
      path: webhooksPath || probot.webhookPath || defaultWebhookPath,
    }),
  );

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

  return mainHandler;
}
