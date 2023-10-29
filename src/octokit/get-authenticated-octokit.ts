import type { State } from "../types";
import { ProbotOctokit } from "./probot-octokit";
import type { OctokitOptions } from "../types";

type FactoryOptions = {
  octokit: InstanceType<typeof ProbotOctokit>;
  octokitOptions: OctokitOptions & {
    throttle?: Record<string, unknown>;
    auth?: Record<string, unknown>;
  };
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
        log: { fatal: any; trace: any };
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
        // @ts-expect-error The correct properties are always passed into here
        throttle: {
          ...octokitOptions.throttle,
          id: String(installationId),
        },
        auth: {
          ...octokitOptions.auth,
          otherOptions,
          installationId,
          request: state.request,
        },
        request: state.request,
      };

      const Octokit = octokit.constructor as typeof ProbotOctokit;

      return new Octokit(options as any);
    },
  }) as Promise<InstanceType<typeof ProbotOctokit>>;
}
