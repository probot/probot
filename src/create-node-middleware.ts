import type { IncomingMessage, ServerResponse } from "node:http";

import type {
  ApplicationFunction,
  Handler,
  MiddlewareOptions,
} from "./types.js";
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
 * const middleware = await createNodeMiddleware(appFn, { probot: await createProbot() });
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
  { probot, webhooksPath } = {} as MiddlewareOptions,
): Promise<
  (
    request: IncomingMessage,
    response: ServerResponse,
    next?: () => void,
  ) => boolean | void | Promise<void | boolean>
> {
  const handlers: Handler[] = [];

  const probotInstance = probot || (await createProbot());
  await probotInstance.load(appFn, {
    cwd: process.cwd(),
    addHandler: (handler) => {
      handlers.push(handler);
    },
  });

  handlers.push(
    await probotInstance.getNodeMiddleware({
      path: webhooksPath,
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
      probotInstance.log.error(e);
      res.writeHead(500).end();
      return true;
    }

    return false;
  };

  return mainHandler;
}
