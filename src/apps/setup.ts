import { exec } from "child_process";
import { Request, Response } from "express";
import { Application } from "../application";
import { ManifestCreation } from "../manifest-creation";

import { getLoggingMiddleware } from "../server/logging-middleware";

export const setupAppFactory = (
  host: string | undefined,
  port: number | undefined
) =>
  async function setupApp(app: Application) {
    const setup: ManifestCreation = new ManifestCreation();

    // If not on Glitch or Production, create a smee URL
    if (
      process.env.NODE_ENV !== "production" &&
      !(process.env.PROJECT_DOMAIN || process.env.WEBHOOK_PROXY_URL)
    ) {
      await setup.createWebhookChannel();
    }

    const route = app.route();

    route.use(getLoggingMiddleware(app.log));

    printWelcomeMessage(app, host, port);

    route.get("/probot", async (req, res) => {
      const protocols = req.headers["x-forwarded-proto"] || req.protocol;
      const protocol =
        typeof protocols === "string" ? protocols.split(",")[0] : protocols[0];
      const host = req.headers["x-forwarded-host"] || req.get("host");
      const baseUrl = `${protocol}://${host}`;

      const pkg = setup.pkg;
      const manifest = setup.getManifest(pkg, baseUrl);
      const createAppUrl = setup.createAppUrl;
      // Pass the manifest to be POST'd
      res.render("setup.hbs", { pkg, createAppUrl, manifest });
    });

    route.get("/probot/setup", async (req: Request, res: Response) => {
      const { code } = req.query;
      const response = await setup.createAppFromCode(code);

      // If using glitch, restart the app
      if (process.env.PROJECT_DOMAIN) {
        exec("refresh", (error) => {
          if (error) {
            app.log.error(error);
          }
        });
      }

      res.redirect(`${response}/installations/new`);
    });

    route.get("/probot/success", async (req, res) => {
      res.render("success.hbs");
    });

    route.get("/", (req, res, next) => res.redirect("/probot"));
  };

function printWelcomeMessage(
  app: Application,
  host: string | undefined,
  port: number | undefined
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
