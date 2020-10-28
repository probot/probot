import { State } from "../types";
import { ProbotOctokit } from "./probot-octokit";

type FactoryOptions = {
  octokit: InstanceType<typeof ProbotOctokit>;
  octokitOptions: ConstructorParameters<typeof ProbotOctokit> & {
    throttle?: Record<string, unknown>;
    auth?: Record<string, unknown>;
  };
  [key: string]: unknown;
};

export async function getAuthenticatedOctokit(
  state: State,
  installationId?: number
) {
  const { log, octokit } = state;

  if (!installationId) return octokit;

  return octokit.auth({
    type: "installation",
    installationId,
    factory: ({ octokit, octokitOptions, ...otherOptions }: FactoryOptions) => {
      const pinoLog = log.child({ name: "github" });

      const options = {
        ...octokitOptions,
        log: {
          fatal: pinoLog.fatal.bind(pinoLog),
          error: pinoLog.error.bind(pinoLog),
          warn: pinoLog.warn.bind(pinoLog),
          info: pinoLog.info.bind(pinoLog),
          debug: pinoLog.debug.bind(pinoLog),
          trace: pinoLog.trace.bind(pinoLog),
        },
        throttle: {
          ...octokitOptions.throttle,
          id: installationId,
        },
        auth: {
          ...octokitOptions.auth,
          otherOptions,
          installationId,
        },
      };

      const Octokit = octokit.constructor as typeof ProbotOctokit;

      return new Octokit(options);
    },
  }) as Promise<InstanceType<typeof ProbotOctokit>>;
}
