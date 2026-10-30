import type { Octokit } from "@octokit/core";
import type { Logger } from "pino";

export function probotRequestLogging(octokit: Octokit) {
  const log = octokit.log as Logger;

  octokit.hook.error("request", (error, options) => {
    if ("status" in error) {
      const { method, url, ...params } =
        octokit.request.endpoint.parse(options);
      const msg = `GitHub request: ${method} ${url} - ${error.status}`;

      log.debug(params.body || {}, msg);
    }

    throw error;
  });

  octokit.hook.after("request", (result, options) => {
    const { method, url, ...params } = octokit.request.endpoint.parse(options);
    const msg = `GitHub request: ${method} ${url} - ${result.status}`;

    log.debug(params.body || {}, msg);
  });
}
