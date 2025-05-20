import fs from "node:fs";
import path from "node:path";
import fetchMock from "fetch-mock";
import { describe, expect, test, beforeEach, afterEach } from "vitest";

import type { Env } from "../src/types.js";
import { ManifestCreation } from "../src/manifest-creation.js";
import { loadPackageJson } from "../src/helpers/load-package-json.js";

describe("ManifestCreation", () => {
  let setup: ManifestCreation;

  let updateEnvCalls: Env[] = [];

  function updateEnv(env: Env): Env {
    updateEnvCalls.push(env);
    return env;
  }

  const pkg = loadPackageJson();
  const response = JSON.parse(
    fs.readFileSync(
      path.resolve(process.cwd(), "./test/fixtures/setup/response.json"),
      "utf8",
    ),
  );

  let SmeeClientCreateChannelCalls: any[] = [];

  const SmeeClient = {
    createChannel: () => {
      SmeeClientCreateChannelCalls.push("createChannel");
      return "https://smee.io/1234ab1234";
    },
  };

  beforeEach(() => {
    updateEnvCalls = [];
    setup = new ManifestCreation({
      updateEnv,
    });
  });

  describe("createWebhookChannel", () => {
    beforeEach(() => {
      SmeeClientCreateChannelCalls = [];
      delete process.env.NODE_ENV;
      delete process.env.PROJECT_DOMAIN;
      delete process.env.WEBHOOK_PROXY_URL;
    });

    afterEach(() => {
      delete process.env.WEBHOOK_PROXY_URL;
    });

    test("writes new webhook channel to .env", async () => {
      await setup.createWebhookChannel({ SmeeClient });
      expect(updateEnvCalls.length).toEqual(1);
      expect(updateEnvCalls[0]).toEqual({
        WEBHOOK_PROXY_URL: "https://smee.io/1234ab1234",
      });
    });
  });

  describe("pkg", () => {
    test("gets pkg from package.json", () => {
      expect(setup.pkg).toEqual(pkg);
    });
  });

  describe("createAppUrl", () => {
    afterEach(() => {
      delete process.env.GHE_HOST;
      delete process.env.GH_ORG;
      delete process.env.GHE_PROTOCOL;
    });

    test("creates an app url", () => {
      expect(setup.createAppUrl).toEqual(
        "https://github.com/settings/apps/new",
      );
    });

    test("creates an app url when github org is set", () => {
      process.env.GH_ORG = "testorg";
      expect(setup.createAppUrl).toEqual(
        "https://github.com/organizations/testorg/settings/apps/new",
      );
    });

    test("creates an app url when github host env is set", () => {
      process.env.GHE_HOST = "hiimbex.github.com";
      expect(setup.createAppUrl).toEqual(
        "https://hiimbex.github.com/settings/apps/new",
      );
    });

    test("creates an app url when github host env and github org is set", () => {
      process.env.GHE_HOST = "hiimbex.github.com";
      process.env.GH_ORG = "testorg";
      expect(setup.createAppUrl).toEqual(
        "https://hiimbex.github.com/organizations/testorg/settings/apps/new",
      );
    });

    test("creates an app url when github host env and protocol are set", () => {
      process.env.GHE_HOST = "hiimbex.github.com";
      process.env.GHE_PROTOCOL = "http";
      expect(setup.createAppUrl).toEqual(
        "http://hiimbex.github.com/settings/apps/new",
      );
    });
  });

  describe("createAppFromCode", () => {
    afterEach(() => {
      delete process.env.APP_ID;
      delete process.env.PRIVATE_KEY;
      delete process.env.WEBHOOK_SECRET;
      delete process.env.GHE_HOST;
    });

    test("creates an app from a code", async () => {
      const mock = fetchMock
        .createInstance()
        .postOnce("https://api.github.com/app-manifests/123abc/conversions", {
          status: 200,
          body: response,
        });

      const createdApp = await setup.createAppFromCode("123abc", {
        request: {
          fetch: mock.fetchHandler,
        },
      });
      expect(createdApp).toEqual("https://github.com/apps/testerino0000000");
      // expect dotenv to be called with id, webhook_secret, pem
      expect(updateEnvCalls.length).toEqual(1);
      expect(updateEnvCalls[0]).toEqual({
        APP_ID: "6666",
        PRIVATE_KEY:
          '"-----BEGIN RSA PRIVATE KEY-----\nsecrets\n-----END RSA PRIVATE KEY-----\n"',
        WEBHOOK_SECRET: "12345abcde",
      });
    });

    test("creates an app from a code when github host env is set", async () => {
      process.env.GHE_HOST = "swinton.github.com";

      const mock = fetchMock
        .createInstance()
        .postOnce(
          "https://swinton.github.com/api/v3/app-manifests/123abc/conversions",
          {
            status: 200,
            body: response,
          },
        );

      const createdApp = await setup.createAppFromCode("123abc", {
        request: {
          fetch: mock.fetchHandler,
        },
      });
      expect(createdApp).toEqual("https://github.com/apps/testerino0000000");
      // expect dotenv to be called with id, webhook_secret, pem
      expect(updateEnvCalls.length).toEqual(1);
      expect(updateEnvCalls[0]).toEqual({
        APP_ID: "6666",
        PRIVATE_KEY:
          '"-----BEGIN RSA PRIVATE KEY-----\nsecrets\n-----END RSA PRIVATE KEY-----\n"',
        WEBHOOK_SECRET: "12345abcde",
      });
    });
  });

  describe("getManifest", () => {
    test("creates an app from a code", () => {
      // checks that getManifest returns a JSON.stringified manifest
      expect(setup.getManifest({ pkg, baseUrl: "localhost://3000" })).toEqual(
        '{"description":"A framework for building GitHub Apps to automate and improve your workflow","hook_attributes":{"url":"localhost://3000/"},"name":"probot","public":true,"redirect_url":"localhost://3000/probot/setup","url":"https://probot.github.io","version":"v1"}',
      );
    });

    test("creates an app from a code with overrided values from app.yml", () => {
      const appYaml =
        "name: cool-app\ndescription: A description for a cool app";

      const readFileSync: typeof fs.readFileSync = () => {
        return appYaml as any;
      };

      // checks that getManifest returns the correct JSON.stringified manifest
      expect(
        setup.getManifest({ pkg, baseUrl: "localhost://3000", readFileSync }),
      ).toEqual(
        '{"description":"A description for a cool app","hook_attributes":{"url":"localhost://3000/"},"name":"cool-app","public":true,"redirect_url":"localhost://3000/probot/setup","url":"https://probot.github.io","version":"v1"}',
      );
    });
  });
});
