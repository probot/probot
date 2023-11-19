import type { State } from "../types.js";
import type { ProbotOctokit } from "./probot-octokit.js";
import type { OctokitOptions } from "../types.js";
import type { LogFn, Level } from "pino";

type FactoryOptions = {
  octokit: ProbotOctokit;
  octokitOptions: OctokitOptions;
  [key: string]: unknown;
};

export async function getAuthenticatedOctokit(
  state: State,
  installationId?: number,
) {
  const { log, octokit } = state;

  if (!installationId) return octokit;

  return octokit.auth({
    type: "installation",
    installationId,
    factory: ({ octokit, octokitOptions, ...otherOptions }: FactoryOptions) => {
      const pinoLog = log.child({ name: "github" });

      const options: ConstructorParameters<typeof ProbotOctokit>[0] & {
        log: Record<Level, LogFn>;
      } = {
        ...octokitOptions,
        log: {
          fatal: pinoLog.fatal.bind(pinoLog),
          error: pinoLog.error.bind(pinoLog),
          warn: pinoLog.warn.bind(pinoLog),
          info: pinoLog.info.bind(pinoLog),
          debug: pinoLog.debug.bind(pinoLog),
          trace: pinoLog.trace.bind(pinoLog),
        },
        throttle: octokitOptions.throttle?.enabled
          ? {
              ...octokitOptions.throttle,
              id: String(installationId),
            }
          : { enabled: false },
        auth: {
          ...octokitOptions.auth,
          otherOptions,
          installationId,
        },
      };

      const Octokit = octokit.constructor as typeof ProbotOctokit;

      return new Octokit(options);
    },
  }) as Promise<ProbotOctokit>;
}
