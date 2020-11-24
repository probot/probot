require("dotenv").config();

import pkgConf from "pkg-conf";

import { ApplicationFunction, Options } from "./types";
import { Probot } from "./index";
import { setupAppFactory } from "./apps/setup";
import { logWarningsForObsoleteEnvironmentVariables } from "./helpers/log-warnings-for-obsolete-environment-variables";
import { getLog, GetLogOptions } from "./helpers/get-log";
import { readCliOptions } from "./bin/read-cli-options";
import { readEnvOptions } from "./bin/read-env-options";
import { Server, ServerOptions } from "./server/server";
import { defaultApp } from "./apps/default";
import { resolveAppFunction } from "./helpers/resolve-app-function";
import { load } from "./load";

type AdditionalOptions = {
  env: Record<string, string | undefined>;
};

/**
 *
 * @param appFnOrArgv set to either a probot application function: `({ app }) => { ... }` or to process.argv
 */
export async function run(
  appFnOrArgv: ApplicationFunction | string[],
  additionalOptions?: AdditionalOptions
) {
  const {
    // log options
    logLevel: level,
    logFormat,
    logLevelInString,
    sentryDsn,

    // server options
    host,
    port,
    webhookPath,
    webhookProxy,

    // probot options
    appId,
    privateKey,
    redisConfig,
    secret,
    baseUrl,

    // others
    args,
  } = Array.isArray(appFnOrArgv)
    ? readCliOptions(appFnOrArgv)
    : readEnvOptions(additionalOptions?.env);

  const logOptions: GetLogOptions = {
    level,
    logFormat,
    logLevelInString,
    sentryDsn,
  };

  const log = getLog(logOptions);
  logWarningsForObsoleteEnvironmentVariables(log);

  const probotOptions: Options = {
    appId,
    privateKey,
    redisConfig,
    secret,
    baseUrl,
    log: log.child({ name: "probot" }),
  };
  const serverOptions: ServerOptions = {
    host,
    port,
    webhookPath,
    webhookProxy,
    log: log.child({ name: "server" }),
    Probot: Probot.defaults(probotOptions),
  };

  let server: Server;

  if (!appId || !privateKey) {
    if (process.env.NODE_ENV === "production") {
      if (!appId) {
        throw new Error(
          "Application ID is missing, and is required to run in production mode. " +
            "To resolve, ensure the APP_ID environment variable is set."
        );
      } else if (!privateKey) {
        throw new Error(
          "Certificate is missing, and is required to run in production mode. " +
            "To resolve, ensure either the PRIVATE_KEY or PRIVATE_KEY_PATH environment variable is set and contains a valid certificate"
        );
      }
    }
    server = new Server(setupAppFactory(host, port), serverOptions);
    await server.start();
    return server;
  }

  if (Array.isArray(appFnOrArgv)) {
    const pkg = await pkgConf("probot");

    const combinedApps: ApplicationFunction = ({ app }) => {
      load(app, server.router(), defaultApp);

      if (Array.isArray(pkg.apps)) {
        for (const appPath of pkg.apps) {
          const appFn = resolveAppFunction(appPath);
          load(app, server.router(), appFn);
        }
      }

      const [appPath] = args;
      const appFn = resolveAppFunction(appPath);
      load(app, server.router(), appFn);
    };

    server = new Server(combinedApps, serverOptions);
    await server.start();
    return server;
  }

  server = new Server(appFnOrArgv, serverOptions);
  await server.start();

  return server;
}
