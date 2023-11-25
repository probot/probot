import { exec } from "node:child_process";

import type { IncomingMessage, ServerResponse } from "http";
import { parse as parseQuery } from "querystring";
import express from "express";
import updateDotenv from "update-dotenv";

import { Probot } from "../probot.js";
import { ManifestCreation } from "../manifest-creation.js";
import { getLoggingMiddleware } from "../server/logging-middleware.js";
import type { ApplicationFunctionOptions } from "../types.js";
import { isProduction } from "../helpers/is-production.js";

import { importView } from "../views/import.js";
import { setupView } from "../views/setup.js";
import { successView } from "../views/success.js";

export const setupAppFactory = (
  host: string | undefined,
  port: number | undefined,
) =>
  async function setupApp(
    app: Probot,
    { getRouter }: ApplicationFunctionOptions,
  ) {
    if (!getRouter) {
      throw new Error("getRouter is required to use the setup app");
    }

    const setup: ManifestCreation = new ManifestCreation();
    const pkg = setup.pkg;

    // If not on Glitch or Production, create a smee URL
    if (
      !isProduction() &&
      !(
        process.env.PROJECT_DOMAIN ||
        process.env.WEBHOOK_PROXY_URL ||
        process.env.NO_SMEE_SETUP === "true"
      )
    ) {
      await setup.createWebhookChannel();
    }

    const route = getRouter();

    route.use(getLoggingMiddleware(app.log));

    printWelcomeMessage(app, host, port);

    route.get("/probot", async (req: IncomingMessage, res: ServerResponse) => {
      const baseUrl = getBaseUrl(req);
      const manifest = setup.getManifest(pkg, baseUrl);
      const createAppUrl = setup.createAppUrl;
      // Pass the manifest to be POST'd
      res.writeHead(200, { "content-type": "text/html" }).end(
        setupView({
          name: pkg.name,
          version: pkg.version,
          description: pkg.description,
          createAppUrl,
          manifest,
        }),
      );
    });

    route.get(
      "/probot/setup",
      async (req: IncomingMessage, res: ServerResponse) => {
        // @ts-expect-error query could be set by a framework, e.g. express
        const { code } = req.query || parseQuery(req.url?.split("?")[1] || "");

        if (!code || typeof code !== "string" || code.length === 0) {
          res
            .writeHead(400, { "content-type": "text/plain" })
            .end("code missing or invalid");
          return;
        }

        const response = await setup.createAppFromCode(code, {
          // @ts-expect-error
          request: app.state.request,
        });

        // If using glitch, restart the app
        if (process.env.PROJECT_DOMAIN) {
          exec("refresh", (error) => {
            if (error) {
              app.log.error(error);
            }
          });
        } else {
          printRestartMessage(app);
        }

        res
          .writeHead(302, {
            "content-type": "text/plain",
            location: `${response}/installations/new`,
          })
          .end(`Found. Redirecting to ${response}/installations/new`);
      },
    );

    const { WEBHOOK_PROXY_URL, GHE_HOST } = process.env;
    const GH_HOST = `https://${GHE_HOST ?? "github.com"}`;

    const importViewRendered = importView({
      name: pkg.name,
      WEBHOOK_PROXY_URL,
      GH_HOST,
    });

    route.get(
      "/probot/import",
      (_req: IncomingMessage, res: ServerResponse) => {
        res
          .writeHead(200, {
            "content-type": "text/html",
          })
          .end(importViewRendered);
      },
    );

    route.post(
      "/probot/import",
      express.json(),
      (req: IncomingMessage, res: ServerResponse) => {
        const { appId, pem, webhook_secret } = (req as unknown as { body: any })
          .body;
        if (!appId || !pem || !webhook_secret) {
          res
            .writeHead(400, {
              "content-type": "text/plain",
            })
            .end("appId and/or pem and/or webhook_secret missing");
          return;
        }
        updateDotenv({
          APP_ID: appId,
          PRIVATE_KEY: `"${pem}"`,
          WEBHOOK_SECRET: webhook_secret,
        });
        res.end();
        printRestartMessage(app);
      },
    );

    const successViewRendered = successView({ name: pkg.name });

    route.get(
      "/probot/success",
      (_req: IncomingMessage, res: ServerResponse) => {
        res
          .writeHead(200, { "content-type": "text/html" })
          .end(successViewRendered);
      },
    );

    route.get("/", (_req, res: ServerResponse) =>
      res
        .writeHead(302, { "content-type": "text/plain", location: `/probot` })
        .end(`Found. Redirecting to /probot`),
    );
  };

function printWelcomeMessage(
  app: Probot,
  host: string | undefined,
  port: number | undefined,
) {
  // use glitch env to get correct domain welcome message
  // https://glitch.com/help/project/
  const domain =
    process.env.PROJECT_DOMAIN ||
    `http://${host ?? "localhost"}:${port || 3000}`;

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
    app.log.info(line);
  });
}

function printRestartMessage(app: Probot) {
  app.log.info("");
  app.log.info("Probot has been set up, please restart the server!");
  app.log.info("");
}

function getBaseUrl(req: IncomingMessage): string {
  const protocols =
    req.headers["x-forwarded-proto"] ||
    // @ts-expect-error based on the functionality of express
    req.socket?.encrypted
      ? "https"
      : "http";
  const protocol =
    typeof protocols === "string" ? protocols.split(",")[0] : protocols[0];
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const baseUrl = `${protocol}://${host}`;
  return baseUrl;
}
