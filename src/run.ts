import pkgConf from "pkg-conf";
import program from "commander";
import { getPrivateKey } from "@probot/get-private-key";

import { ApplicationFunction, Options } from "./types";
import { Probot } from "./index";
import { setupAppFactory } from "./apps/setup";

export async function run(appFn: ApplicationFunction | string[]) {
  const readOptions = (): Options => {
    if (Array.isArray(appFn)) {
      program
        .usage("[options] <apps...>")
        .option(
          "-p, --port <n>",
          "Port to start the server on",
          String(process.env.PORT || 3000)
        )
        .option(
          "-H --host <host>",
          "Host to start the server on",
          process.env.HOST
        )
        .option(
          "-W, --webhook-proxy <url>",
          "URL of the webhook proxy service.`",
          process.env.WEBHOOK_PROXY_URL
        )
        .option(
          "-w, --webhook-path <path>",
          "URL path which receives webhooks. Ex: `/webhook`",
          process.env.WEBHOOK_PATH
        )
        .option("-a, --app <id>", "ID of the GitHub App", process.env.APP_ID)
        .option(
          "-s, --secret <secret>",
          "Webhook secret of the GitHub App",
          process.env.WEBHOOK_SECRET
        )
        .option(
          "-P, --private-key <file>",
          "Path to certificate of the GitHub App",
          process.env.PRIVATE_KEY_PATH
        )
        .parse(appFn);

      return {
        privateKey:
          getPrivateKey({ filepath: program.privateKey }) || undefined,
        id: program.app,
        port: program.port,
        host: program.host,
        secret: program.secret,
        webhookPath: program.webhookPath,
        webhookProxy: program.webhookProxy,
      };
    }

    const privateKey = getPrivateKey();
    return {
      privateKey: (privateKey && privateKey.toString()) || undefined,
      id: Number(process.env.APP_ID),
      port: Number(process.env.PORT) || 3000,
      host: process.env.HOST,
      secret: process.env.WEBHOOK_SECRET,
      webhookPath: process.env.WEBHOOK_PATH,
      webhookProxy: process.env.WEBHOOK_PROXY_URL,
    };
  };

  const options = readOptions();
  const probot = new Probot(options);

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
    probot.load(setupAppFactory(probot.options.host, probot.options.port));
  } else if (Array.isArray(appFn)) {
    const pkg = await pkgConf("probot");
    probot.setup(program.args.concat((pkg.apps as string[]) || []));
  } else {
    probot.load(appFn);
  }
  probot.start();

  return probot;
}
