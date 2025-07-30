import { randomUUID as uuidv4 } from "node:crypto";

import { pinoHttp, startTime, type Options, type HttpLogger } from "pino-http";
import type { Logger } from "pino";

export function httpLogger(logger: Logger, options?: Options): HttpLogger {
  return pinoHttp({
    ...options,
    logger: logger.child({ name: "http" }),
    customSuccessMessage(req, res) {
      const responseTime = Date.now() - res[startTime];
      return `${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`;
    },
    customErrorMessage(req, res, _err) {
      const responseTime = Date.now() - res[startTime];
      return `${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`;
    },
    genReqId: (req) =>
      req.headers["x-request-id"] ||
      req.headers["x-github-delivery"] ||
      uuidv4(),
  });
}
