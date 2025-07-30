import fs from "node:fs";
import path from "node:path";
import fetchMock from "fetch-mock";
import { describe, expect, test } from "vitest";

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

  const reset = (env = {} as Env) => {
    delete process.env.NODE_ENV;
    delete process.env.PROJECT_DOMAIN;
    delete process.env.WEBHOOK_PROXY_URL;

    delete process.env.GHE_HOST;
    delete process.env.GH_ORG;
    delete process.env.GHE_PROTOCOL;

    delete process.env.APP_ID;
    delete process.env.PRIVATE_KEY;
    delete process.env.WEBHOOK_SECRET;
    delete process.env.GHE_HOST;

    for (const key of Object.keys(env)) {
      process.env[key] = env[key];
    }

    updateEnvCalls = [];
    SmeeClientCreateChannelCalls = [];

    setup = new ManifestCreation({
      updateEnv,
    });
  };

  describe("createWebhookChannel", () => {
    test("writes new webhook channel to .env", async () => {
      reset();

      await setup.createWebhookChannel({ SmeeClient });
      expect(updateEnvCalls.length).toBe(1);
      expect(Object.keys(updateEnvCalls[0]).length).toBe(1);
      expect(updateEnvCalls[0].WEBHOOK_PROXY_URL).toBe(
        "https://smee.io/1234ab1234",
      );
    });
  });

  describe("pkg", () => {
    test("gets pkg from package.json", () => {
      reset();

      expect(JSON.stringify(setup.pkg)).toBe(JSON.stringify(pkg));
    });
  });

  describe("createAppUrl", () => {
    test("creates an app url", () => {
      reset();

      expect(setup.createAppUrl).toBe("https://github.com/settings/apps/new");
    });

    test("creates an app url when github org is set", () => {
      reset({
        GH_ORG: "testorg",
      });

      expect(setup.createAppUrl).toBe(
        "https://github.com/organizations/testorg/settings/apps/new",
      );
    });

    test("creates an app url when github host env is set", () => {
      reset({
        GHE_HOST: "hiimbex.github.com",
      });

      expect(setup.createAppUrl).toBe(
        "https://hiimbex.github.com/settings/apps/new",
      );
    });

    test("creates an app url when github host env and github org is set", () => {
      reset({
        GHE_HOST: "hiimbex.github.com",
        GH_ORG: "testorg",
      });

      expect(setup.createAppUrl).toBe(
        "https://hiimbex.github.com/organizations/testorg/settings/apps/new",
      );
    });

    test("creates an app url when github host env and protocol are set", () => {
      reset({
        GHE_HOST: "hiimbex.github.com",
        GHE_PROTOCOL: "http",
      });

      expect(setup.createAppUrl).toBe(
        "http://hiimbex.github.com/settings/apps/new",
      );
    });
  });

  describe("createAppFromCode", () => {
    test("creates an app from a code", async () => {
      reset();

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
      expect(createdApp).toBe("https://github.com/apps/testerino0000000");
      // expect dotenv to be called with id, webhook_secret, pem
      expect(updateEnvCalls.length).toBe(1);

      expect(Object.keys(updateEnvCalls[0]).length).toBe(5);
      expect(updateEnvCalls[0].APP_ID).toBe("6666");
      expect(updateEnvCalls[0].PRIVATE_KEY).toBe(
        '"-----BEGIN RSA PRIVATE KEY-----\nsecrets\n-----END RSA PRIVATE KEY-----\n"',
      );
      expect(updateEnvCalls[0].WEBHOOK_SECRET).toBe("12345abcde");
      expect(updateEnvCalls[0].GITHUB_CLIENT_ID).toBe(undefined);
      expect(updateEnvCalls[0].GITHUB_CLIENT_SECRET).toBe(undefined);
    });

    test("creates an app from a code when github host env is set", async () => {
      reset({
        GHE_HOST: "swinton.github.com",
      });

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
        throttle: {
          enabled: false, // disable throttling for tests
        },
        request: {
          fetch: mock.fetchHandler,
        },
      });
      expect(createdApp).toBe("https://github.com/apps/testerino0000000");
      // expect dotenv to be called with id, webhook_secret, pem
      expect(updateEnvCalls.length).toBe(1);

      expect(Object.keys(updateEnvCalls[0]).length).toBe(5);
      expect(updateEnvCalls[0].APP_ID).toBe("6666");
      expect(updateEnvCalls[0].PRIVATE_KEY).toBe(
        '"-----BEGIN RSA PRIVATE KEY-----\nsecrets\n-----END RSA PRIVATE KEY-----\n"',
      );
      expect(updateEnvCalls[0].WEBHOOK_SECRET).toBe("12345abcde");
      expect(updateEnvCalls[0].GITHUB_CLIENT_ID).toBe(undefined);
      expect(updateEnvCalls[0].GITHUB_CLIENT_SECRET).toBe(undefined);
    });
  });

  describe("getManifest", () => {
    test("creates an app from a code", () => {
      reset();
      // checks that getManifest returns a JSON.stringified manifest
      expect(setup.getManifest({ pkg, baseUrl: "localhost://3000" })).toBe(
        '{"description":"A framework for building GitHub Apps to automate and improve your workflow","hook_attributes":{"url":"localhost://3000/"},"name":"probot","public":true,"redirect_url":"localhost://3000/probot/setup","url":"https://probot.github.io","version":"v1"}',
      );
    });

    test("creates an app from a code with overrided values from app.yml", () => {
      reset();

      const appYaml =
        "name: cool-app\ndescription: A description for a cool app";

      const readFileSync: typeof fs.readFileSync = () => {
        return appYaml as any;
      };

      // checks that getManifest returns the correct JSON.stringified manifest
      expect(
        setup.getManifest({ pkg, baseUrl: "localhost://3000", readFileSync }),
      ).toBe(
        '{"description":"A description for a cool app","hook_attributes":{"url":"localhost://3000/"},"name":"cool-app","public":true,"redirect_url":"localhost://3000/probot/setup","url":"https://probot.github.io","version":"v1"}',
      );
    });
  });
});
