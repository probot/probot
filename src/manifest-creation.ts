import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import updateDotenv from "update-dotenv";
import { ProbotOctokit } from "./octokit/probot-octokit";

export class ManifestCreation {
  get pkg() {
    let pkg: any;
    try {
      pkg = require(path.join(process.cwd(), "package.json"));
    } catch (e) {
      pkg = {};
    }
    return pkg;
  }

  public async createWebhookChannel() {
    try {
      // tslint:disable:no-var-requires
      const SmeeClient = require("smee-client");

      await this.updateEnv({
        WEBHOOK_PROXY_URL: await SmeeClient.createChannel(),
      });
    } catch (error) {
      // Smee is not available, so we'll just move on
      // tslint:disable:no-console
      console.warn("Unable to connect to smee.io, try restarting your server.");
    }
  }

  public getManifest(pkg: any, baseUrl: any) {
    let manifest: any = {};
    try {
      const file = fs.readFileSync(path.join(process.cwd(), "app.yml"), "utf8");
      manifest = yaml.safeLoad(file);
    } catch (error) {
      // App config does not exist, which is ok.
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    const generatedManifest = JSON.stringify(
      Object.assign(
        {
          description: manifest.description || pkg.description,
          hook_attributes: {
            url: process.env.WEBHOOK_PROXY_URL || `${baseUrl}/`,
          },
          name: process.env.PROJECT_DOMAIN || manifest.name || pkg.name,
          public: manifest.public || true,
          redirect_url: `${baseUrl}/probot/setup`,
          // TODO: add setup url
          // setup_url:`${baseUrl}/probot/success`,
          url: manifest.url || pkg.homepage || pkg.repository,
          version: "v1",
        },
        manifest
      )
    );

    return generatedManifest;
  }

  public async createAppFromCode(code: any) {
    const octokit = new ProbotOctokit();
    const options: any = {
      code,
      mediaType: {
        previews: ["fury"], // needed for GHES 2.20 and older
      },
      ...(process.env.GHE_HOST && {
        baseUrl: `${process.env.GHE_PROTOCOL || "https"}://${
          process.env.GHE_HOST
        }/api/v3`,
      }),
    };
    const response = await octokit.request(
      "POST /app-manifests/:code/conversions",
      options
    );

    const { id, client_id, client_secret, webhook_secret, pem } = response.data;
    await this.updateEnv({
      APP_ID: id.toString(),
      PRIVATE_KEY: `"${pem}"`,
      WEBHOOK_SECRET: webhook_secret,
      GITHUB_CLIENT_ID: client_id,
      GITHUB_CLIENT_SECRET: client_secret,
    });

    return response.data.html_url;
  }

  public async updateEnv(env: any) {
    // Needs to be public due to tests
    return updateDotenv(env);
  }

  get createAppUrl() {
    const githubHost = process.env.GHE_HOST || `github.com`;
    return `${
      process.env.GHE_PROTOCOL || "https"
    }://${githubHost}/settings/apps/new`;
  }
}
