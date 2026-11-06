import type { IncomingMessage } from "node:http";
import { parse as parseQuery } from "node:querystring";
import { randomBytes } from "node:crypto";

import type { Logger } from "pino";

import { ManifestCreation } from "../manifest-creation.js";
import { getPrintableHost } from "../helpers/get-printable-host.js";
import { isProduction } from "../helpers/is-production.js";
import type { Handler, StripUndefined } from "../types.js";
import { getPayload } from "../helpers/get-payload.js";

import type { Env, ServerOptions } from "../types.js";
import { updateEnv } from "../helpers/update-env.js";

import { importView } from "../views/import.js";
import { setupView } from "../views/setup.js";
import { successView } from "../views/success.js";

type SetupFactoryOptions = StripUndefined<
  Required<Pick<ServerOptions, "log" | "port" | "host">>
> &
  Pick<ServerOptions, "request"> & {
    updateEnv?: (env: Env) => Env;
    env?: Env;
    SmeeClient?:
      | { createChannel: () => Promise<string | undefined> }
      | undefined;
  };

export const setupAppFactory = (options: SetupFactoryOptions) => {
  const { host, port, log, request, SmeeClient } = options;
  const env = options.env || process.env;
  const applyEnv =
    options.updateEnv || ((values: Env) => updateEnv(values, { env }));

  const setupToken = env.PROBOT_SETUP_TOKEN || randomBytes(32).toString("hex");

  return async function setupApp(): Promise<Handler> {
    const setup: ManifestCreation = new ManifestCreation({
      updateEnv: applyEnv,
      env,
    });

    const pkg = setup.pkg;
    const { WEBHOOK_PROXY_URL, GHE_HOST } = env;
    const GH_HOST = `https://${GHE_HOST ?? "github.com"}`;

    // If not on Production and no WEBHOOK_PROXY_URL is set, create a smee URL
    if (
      !isProduction() &&
      !(env.WEBHOOK_PROXY_URL || env.NO_SMEE_SETUP === "true")
    ) {
      await setup.createWebhookChannel({ SmeeClient, log });
    }

    const importViewRendered = importView({
      name: pkg.name,
      WEBHOOK_PROXY_URL,
      GH_HOST,
    });
    const successViewRendered = successView({ name: pkg.name });

    printWelcomeMessage(log, host, port);

    const setupHandler: Handler = async (req, res) => {
      const [path, query = ""] = req.url?.split("?") ?? [req.url, ""];
      if (req.method === "GET") {
        if (path === "/") {
          res
            .writeHead(302, {
              "content-type": "text/plain",
              location: `/probot`,
            })
            .end(`Found. Redirecting to /probot`);
          return true;
        }
        if (path === "/probot") {
          const baseUrl = getBaseUrl(req);
          const manifest = setup.getManifest({ pkg, baseUrl });
          const createAppUrl = new URL(setup.createAppUrl);
          createAppUrl.searchParams.set("state", setupToken);
          res.writeHead(200, { "content-type": "text/html" }).end(
            setupView({
              name: pkg.name,
              version: pkg.version,
              description: pkg.description,
              createAppUrl: createAppUrl.toString(),
              manifest,
            }),
          );
          return true;
        }
        if (path === "/probot/setup") {
          const { code, state } =
            // @ts-expect-error query could be set by a framework, e.g. express
            req.query || parseQuery(query);

          if (state !== setupToken) {
            res
              .writeHead(403, { "content-type": "text/plain" })
              .end("state missing or invalid");
            return true;
          }

          if (!code || typeof code !== "string" || code.length === 0) {
            res
              .writeHead(400, { "content-type": "text/plain" })
              .end("code missing or invalid");
            return true;
          }

          const response = await setup.createAppFromCode(code, {
            request: request || {},
          });

          printRestartMessage(log);

          res
            .writeHead(302, {
              "content-type": "text/plain",
              location: `${response}/installations/new`,
            })
            .end(`Found. Redirecting to ${response}/installations/new`);
          return true;
        }
        if (path === "/probot/import") {
          res
            .writeHead(200, {
              "content-type": "text/html",
              "set-cookie": `probot_setup_token=${setupToken}; Path=/probot; HttpOnly; SameSite=Strict`,
            })
            .end(importViewRendered);
          return true;
        }
        if (path === "/probot/success") {
          res
            .writeHead(200, { "content-type": "text/html" })
            .end(successViewRendered);
          return true;
        }
      }

      if (req.method === "POST") {
        if (path === "/probot/import") {
          const cookieToken = getCookie(
            req.headers?.cookie,
            "probot_setup_token",
          );
          if (cookieToken !== setupToken) {
            res
              .writeHead(403, { "content-type": "text/plain" })
              .end("setup token missing or invalid, reload /probot/import");
            return true;
          }
          const { appId, pem, webhook_secret } = JSON.parse(
            await getPayload(req),
          );
          if (!appId || !pem || !webhook_secret) {
            res
              .writeHead(400, {
                "content-type": "text/plain",
              })
              .end("appId and/or pem and/or webhook_secret missing");
            return true;
          }
          applyEnv({
            APP_ID: appId,
            PRIVATE_KEY: `"${pem}"`,
            WEBHOOK_SECRET: webhook_secret,
          });
          res.end();
          printRestartMessage(log);
          return true;
        }
      }

      return false;
    };

    return setupHandler;
  };
};

function getCookie(header: string | undefined, name: string) {
  for (const pair of header?.split(";") ?? []) {
    const [key, ...value] = pair.trim().split("=");
    if (key === name) return value.join("=");
  }
  return undefined;
}

function printWelcomeMessage(
  log: Logger,
  host: string | undefined,
  port: number | undefined,
) {
  const domain = `http://${getPrintableHost(host)}:${port}`;

  [
    ``,
    `Welcome to Probot!`,
    `Probot is in setup mode, webhooks cannot be received and`,
    `custom routes will not work until APP_ID and PRIVATE_KEY`,
    `are configured in .env.`,
    `Please follow the instructions at ${domain} to configure .env.`,
    `Once you are done, restart the server.`,
    ``,
  ].forEach((line) => {
    log.info(line);
  });
}

function printRestartMessage(log: Logger) {
  log.info("");
  log.info("Probot has been set up, please restart the server!");
  log.info("");
}

type RequestLike = Pick<IncomingMessage, "headers"> & {
  socket?: unknown;
};

function getBaseUrl(req: RequestLike): string {
  const socket = req.socket;
  const encrypted =
    typeof socket === "object" &&
    socket !== null &&
    "encrypted" in socket &&
    socket.encrypted === true;
  const protocols =
    req.headers["x-forwarded-proto"] || encrypted ? "https" : "http";
  const protocol = protocols.split(",")[0];
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const baseUrl = `${protocol}://${host}`;
  return baseUrl;
}
