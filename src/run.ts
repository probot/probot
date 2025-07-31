import { packageConfig } from "package-config";
import type { Logger } from "pino";

import type {
  ApplicationFunction,
  Env,
  Options,
  ServerOptions,
  StripUndefined,
} from "./types.js";
import type { ProbotOctokit } from "./octokit/probot-octokit.js";
import { setupAppFactory } from "./apps/setup.js";
import { getLog } from "./helpers/get-log.js";
import { readCliOptions } from "./bin/read-cli-options.js";
import { readEnvOptions } from "./bin/read-env-options.js";
import { defaultApp as defaultAppHandler } from "./apps/default.js";
import { defaultWebhookPath, Server } from "./server/server.js";
import { resolveAppFunction } from "./helpers/resolve-app-function.js";
import { isProduction } from "./helpers/is-production.js";
import { config as dotenvConfig } from "dotenv";
import { updateEnv } from "./helpers/update-env.js";
import { Probot } from "./probot.js";

type AdditionalOptions = {
  env?: Env;
  Octokit?: typeof ProbotOctokit;
  log?: Logger;
  updateEnv?: typeof updateEnv;
  SmeeClient?: { createChannel: () => Promise<string | undefined> };
};

/**
 *
 * @param appFnOrArgv set to either a probot application function: `(app) => { ... }` or to process.argv
 */
export async function run(
  appFnOrArgv: ApplicationFunction | string[],
  additionalOptions?: AdditionalOptions,
): Promise<Server> {
  dotenvConfig({ quiet: true });

  const envOptions = readEnvOptions(additionalOptions?.env);
  const cliOptions = Array.isArray(appFnOrArgv)
    ? readCliOptions(appFnOrArgv)
    : {};

  const {
    // log options
    logLevel: level,
    logFormat,
    logLevelInString,
    logMessageKey,
    sentryDsn,

    // server options
    host = "localhost",
    port = 3000,
    webhookPath = defaultWebhookPath,
    webhookProxy,

    // probot options
    appId,
    privateKey,
    redisConfig,
    secret,
    baseUrl,

    // others
    args,
  } = { ...envOptions, ...cliOptions };

  const log =
    additionalOptions?.log ||
    (await getLog({
      level,
      logFormat,
      logLevelInString,
      logMessageKey,
      sentryDsn,
    }));

  const probotOptions: Options = {
    appId,
    privateKey,
    redisConfig,
    secret,
    baseUrl,
    log,
    Octokit: additionalOptions?.Octokit || undefined,
  };

  type ServerOptionsLocal = StripUndefined<
    Required<
      NonNullable<
        Pick<ServerOptions, "host" | "port" | "webhookPath" | "log" | "Probot">
      >
    >
  > &
    Pick<ServerOptions, "webhookProxy">;

  const serverOptions: ServerOptionsLocal = {
    host,
    port,
    webhookPath,
    webhookProxy,
    log,
    Probot: Probot.defaults(probotOptions),
  };

  let server: Server;

  if (!appId || !privateKey) {
    if (isProduction()) {
      if (!appId) {
        throw new Error(
          "App ID is missing, and is required to run in production mode. " +
            "To resolve, ensure the APP_ID environment variable is set.",
        );
      } else if (!privateKey) {
        throw new Error(
          "Certificate is missing, and is required to run in production mode. " +
            "To resolve, ensure either the PRIVATE_KEY or PRIVATE_KEY_PATH environment variable is set and contains a valid certificate",
        );
      }
    }

    // Workaround for setup (#1512)
    // When probot is started for the first time, it gets into a setup mode
    // where `appId` and `privateKey` are not present. The setup mode gets
    // these credentials. In order to not throw an error, we set the values
    // to anything, as the Probot instance is not used in setup it makes no
    // difference anyway.
    server = new Server({
      ...serverOptions,
      Probot: Probot.defaults({
        ...probotOptions,
        appId: 1,
        privateKey: "dummy value for setup, see #1512",
      }),
    });

    const setupAppHandler = setupAppFactory({
      host: server.host,
      port: server.port,
      log: serverOptions.log.child({ name: "setup" }),
      updateEnv: additionalOptions?.updateEnv || updateEnv,
      SmeeClient: additionalOptions?.SmeeClient,
    });

    await server.loadHandlerFactory(setupAppHandler);

    await server.start();

    return server;
  }

  if (Array.isArray(appFnOrArgv)) {
    const [appPath] = args;

    if (!appPath) {
      console.error(
        "No app path provided. Please provide the path to the app you want to run.",
      );
      process.exit(1);
    }

    const pkg = await packageConfig("probot");
    server = new Server(serverOptions);

    await server.loadHandlerFactory(defaultAppHandler);

    if (Array.isArray(pkg.apps)) {
      for (const appPath of pkg.apps) {
        const appFn = await resolveAppFunction(appPath);
        await server.load(appFn);
      }
    }

    const appFn = await resolveAppFunction(appPath);
    await server.load(appFn);

    await server.start();
    return server;
  }

  server = new Server(serverOptions);
  await server.load(appFnOrArgv);
  await server.start();

  return server;
}
