import type { State } from "../types.js";
import type { ProbotOctokit } from "./probot-octokit.js";
import type { OctokitOptions } from "../types.js";
import type { LogFn, Level, Logger } from "pino";
import { rebindLog } from "../helpers/rebind-log.js";

type FactoryOptions = {
  octokit: ProbotOctokit;
  octokitOptions: OctokitOptions;
  [key: string]: unknown;
};

export async function getAuthenticatedOctokit(
  state: State,
  installationId?: number,
  log?: Logger,
) {
  const { octokit } = state;

  if (!installationId) return octokit;

  return octokit.auth({
    type: "installation",
    installationId,
    factory: ({ octokit, octokitOptions, ...otherOptions }: FactoryOptions) => {
      const pinoLog = log || state.log.child({ name: "github" });

      const options: ConstructorParameters<typeof ProbotOctokit>[0] & {
        log: Record<Level, LogFn>;
      } = {
        ...octokitOptions,
        log: rebindLog(pinoLog),
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
