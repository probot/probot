import { State } from "../types";

export async function getAuthenticatedOctokit(
  state: State,
  installationId?: number
) {
  const { githubToken, log, Octokit, octokit } = state;

  if (!installationId) return octokit;

  const constructorAuthOptions = githubToken
    ? {}
    : { auth: { installationId: installationId } };

  const pinoLog = log.child({ name: "github" });
  const options = {
    log: {
      fatal: pinoLog.fatal.bind(pinoLog),
      error: pinoLog.error.bind(pinoLog),
      warn: pinoLog.warn.bind(pinoLog),
      info: pinoLog.info.bind(pinoLog),
      debug: pinoLog.debug.bind(pinoLog),
      trace: pinoLog.trace.bind(pinoLog),
    },
    throttle: {
      id: installationId,
    },
    ...constructorAuthOptions,
  };

  return new Octokit(options);
}
