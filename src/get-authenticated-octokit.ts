import { State } from "./types";

export async function getAuthenticatedOctokit(
  state: State,
  installationId?: number
) {
  const { githubToken, log, Octokit, octokit, throttleOptions } = state;

  if (!installationId) return octokit;

  const constructorAuthOptions = githubToken
    ? {}
    : { auth: { installationId: installationId } };
  const constructorThrottleOptions = throttleOptions
    ? {
        throttle: {
          id: installationId,
          ...throttleOptions,
        },
      }
    : {};

  const options = {
    log: log.child({ name: "github" }),
    ...constructorAuthOptions,
    ...constructorThrottleOptions,
  };

  return new Octokit(options);
}
