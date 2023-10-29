import pinoHttp, { startTime, Options } from "pino-http";
import type { Logger } from "pino";
import { randomUUID as uuidv4 } from "crypto";

export function getLoggingMiddleware(logger: Logger, options?: Options) {
  return pinoHttp({
    ...options,
    logger: logger.child({ name: "http" }),
    customSuccessMessage(_req, res) {
      const responseTime = Date.now() - res[startTime];
      return `${res.req.method} ${res.req.url} ${res.statusCode} - ${responseTime}ms`;
    },
    customErrorMessage(_err, res) {
      const responseTime = Date.now() - res[startTime];
      return `${res.req.method} ${res.req.url} ${res.statusCode} - ${responseTime}ms`;
    },
    genReqId: (req) =>
      req.headers["x-request-id"] ||
      req.headers["x-github-delivery"] ||
      uuidv4(),
  });
}
