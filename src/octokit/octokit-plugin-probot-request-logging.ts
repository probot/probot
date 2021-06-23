// tslint:disable-next-line
import type { Octokit } from "@octokit/core";

export function probotRequestLogging(octokit: Octokit) {
  octokit.hook.error("request", (error, options) => {
    if ("status" in error) {
      const { method, url, request, ...params } =
        octokit.request.endpoint.parse(options);
      const msg = `GitHub request: ${method} ${url} - ${error.status}`;

      // @ts-expect-error log.debug is a pino log method and accepts a fields object
      octokit.log.debug(params.body || {}, msg);
    }

    throw error;
  });

  octokit.hook.after("request", (result, options) => {
    const { method, url, request, ...params } =
      octokit.request.endpoint.parse(options);
    const msg = `GitHub request: ${method} ${url} - ${result.status}`;

    // @ts-ignore log.debug is a pino log method and accepts a fields object
    octokit.log.debug(params.body || {}, msg);
  });
}
