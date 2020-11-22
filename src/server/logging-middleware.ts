import pinoHttp from "pino-http";
import type { Logger } from "pino";
import { v4 as uuidv4 } from "uuid";

export function getLoggingMiddleware(logger: Logger) {
  return pinoHttp({
    logger: logger.child({ name: "http" }),
    customSuccessMessage(res) {
      const responseTime = Date.now() - res[pinoHttp.startTime];
      // @ts-ignore
      return `${res.req.method} ${res.req.url} ${res.statusCode} - ${responseTime}ms`;
    },
    customErrorMessage(err, res) {
      const responseTime = Date.now() - res[pinoHttp.startTime];
      // @ts-ignore
      return `${res.req.method} ${res.req.url} ${res.statusCode} - ${responseTime}ms`;
    },
    genReqId: (req) =>
      req.headers["x-request-id"] ||
      req.headers["x-github-delivery"] ||
      uuidv4(),
  });
}
