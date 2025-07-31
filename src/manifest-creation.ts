import fs from "node:fs";
import path from "node:path";

import { npxImport } from "npx-import-light";
import yaml from "js-yaml";
import type { RequestParameters } from "@octokit/types";
import type { Logger } from "pino";

import type { Manifest, OctokitOptions, PackageJson } from "./types.js";
import { ProbotOctokit } from "./octokit/probot-octokit.js";
import { loadPackageJson } from "./helpers/load-package-json.js";
import { updateEnv } from "./helpers/update-env.js";

export class ManifestCreation {
  #updateEnv: typeof updateEnv;

  constructor(
    options: {
      updateEnv?: typeof updateEnv;
    } = { updateEnv },
  ) {
    this.#updateEnv = options.updateEnv || updateEnv;
  }
  get pkg() {
    return loadPackageJson();
  }

  public async createWebhookChannel(
    { SmeeClient: SmeeClientParam, log = console } = {} as {
      SmeeClient: any;
      log?: Logger | undefined;
    },
  ): Promise<string | undefined> {
    let SmeeClient: any;
    try {
      SmeeClient =
        SmeeClientParam ||
        (await npxImport("smee-client@4.3.1", { onlyPackageRunner: true }))
          .SmeeClient;
    } catch {
      log.warn("SmeeClient is not available");
      return void 0;
    }
    try {
      const WEBHOOK_PROXY_URL = await SmeeClient.createChannel();
      this.#updateEnv({
        WEBHOOK_PROXY_URL,
      });
      return WEBHOOK_PROXY_URL;
    } catch {
      log.warn("Unable to connect to smee.io, try restarting your server.");
      return void 0;
    }
  }

  public getManifest(options: {
    pkg: PackageJson;
    baseUrl: string;
    readFileSync?: typeof fs.readFileSync;
  }): string {
    let manifest: Partial<Manifest> = {};

    const { pkg, baseUrl, readFileSync = fs.readFileSync } = options;

    try {
      const file = readFileSync(path.join(process.cwd(), "app.yml"), "utf8");
      manifest = yaml.load(file) as Manifest;
    } catch (error) {
      // App config does not exist, which is ok.
      if ((error as Error & { code?: string }).code !== "ENOENT") {
        throw error;
      }
    }

    const generatedManifest = JSON.stringify({
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
      ...manifest,
    });

    return generatedManifest;
  }

  public async createAppFromCode(
    code: string,
    probotOptions?: OctokitOptions | undefined,
  ) {
    const octokit = new ProbotOctokit(probotOptions);
    const options: RequestParameters = {
      ...probotOptions,
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
      options,
    );

    const { id, client_id, client_secret, webhook_secret, pem } = response.data;
    this.#updateEnv({
      APP_ID: id.toString(),
      PRIVATE_KEY: `"${pem}"`,
      WEBHOOK_SECRET: webhook_secret,
      GITHUB_CLIENT_ID: client_id,
      GITHUB_CLIENT_SECRET: client_secret,
    });

    return response.data.html_url;
  }

  get createAppUrl() {
    const githubHost = process.env.GHE_HOST || `github.com`;
    return `${process.env.GHE_PROTOCOL || "https"}://${githubHost}${
      process.env.GH_ORG ? `/organizations/${process.env.GH_ORG}` : ""
    }/settings/apps/new`;
  }
}
