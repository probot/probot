require("dotenv").config();

import pkgConf from "pkg-conf";
import program from "commander";

import { ApplicationFunction } from "./types";
import { Probot } from "./index";
import { setupAppFactory } from "./apps/setup";
import { logWarningsForObsoleteEnvironmentVariables } from "./helpers/log-warnings-for-obsolete-environment-variables";
import { getLog } from "./helpers/get-log";
import { readCliOptions } from "./bin/read-cli-options";
import { readEnvOptions } from "./bin/read-env-options";

export async function run(appFnOrArgv: ApplicationFunction | string[]) {
  const {
    logLevel: level,
    logFormat,
    logLevelInString,
    sentryDsn,
    ...options
  } = Array.isArray(appFnOrArgv)
    ? readCliOptions(appFnOrArgv)
    : readEnvOptions();

  const log = getLog({ level, logFormat, logLevelInString, sentryDsn });
  logWarningsForObsoleteEnvironmentVariables(log);

  const probot = new Probot({ log, ...options });

  if (!options.id || !options.privateKey) {
    if (process.env.NODE_ENV === "production") {
      if (!options.id) {
        throw new Error(
          "Application ID is missing, and is required to run in production mode. " +
            "To resolve, ensure the APP_ID environment variable is set."
        );
      } else if (!options.privateKey) {
        throw new Error(
          "Certificate is missing, and is required to run in production mode. " +
            "To resolve, ensure either the PRIVATE_KEY or PRIVATE_KEY_PATH environment variable is set and contains a valid certificate"
        );
      }
    }
    probot.load(setupAppFactory(options.host, options.port));
  } else if (Array.isArray(appFnOrArgv)) {
    const pkg = await pkgConf("probot");
    probot.setup(program.args.concat((pkg.apps as string[]) || []));
  } else {
    probot.load(appFnOrArgv);
  }
  probot.start();

  return probot;
}
