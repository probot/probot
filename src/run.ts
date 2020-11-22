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
import { load } from "./load";
import { defaultApp } from "./apps/default";

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
    id,
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

  const serverOptions: ServerOptions = {
    host,
    port,
    webhookPath,
    webhookProxy,
    log: log.child({ name: "server" }),
  };

  const server = new Server(serverOptions);
  const router = server.router();

  const probotOptions: Options = {
    id,
    privateKey,
    redisConfig,
    secret,
    baseUrl,
    log: log.child({ name: "probot" }),
  };
  const probot = new Probot(probotOptions);

  if (!id || !privateKey) {
    if (process.env.NODE_ENV === "production") {
      if (!id) {
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
    load(probot, router, setupAppFactory(host, port));
  } else if (Array.isArray(appFnOrArgv)) {
    const pkg = await pkgConf("probot");
    load(probot, router, defaultApp);

    if (Array.isArray(pkg.apps)) {
      for (const app of pkg.apps) {
        load(probot, router, app);
      }
    }

    const [appFn] = args;

    load(probot, router, appFn);

    server.app.use(webhookPath ? webhookPath : "/", probot.webhooks.middleware);
  } else {
    load(probot, router, appFnOrArgv);

    server.app.use(webhookPath ? webhookPath : "/", probot.webhooks.middleware);
  }
  await server.start();

  return server;
}
