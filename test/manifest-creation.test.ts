import { jest } from "@jest/globals";
import fs from "fs";
import nock from "nock";
import pkg from "../package.json";
import { ManifestCreation } from "../src/manifest-creation";
import response from "./fixtures/setup/response.json";

describe("ManifestCreation", () => {
  let setup: ManifestCreation;

  beforeEach(() => {
    setup = new ManifestCreation();
  });

  describe("createWebhookChannel", () => {
    beforeEach(async () => {
      delete process.env.NODE_ENV;
      delete process.env.PROJECT_DOMAIN;
      delete process.env.WEBHOOK_PROXY_URL;

      setup.updateEnv = jest.fn(async () => {
        return {};
      });

      const SmeeClient: typeof import("smee-client") = (
        await import("smee-client")
      ).default;
      SmeeClient.createChannel = jest
        .fn(async () => {
          return "https://smee.io/1234abc";
        })
        .mockReturnValue(Promise.resolve("https://smee.io/1234abc"));
    });

    afterEach(() => {
      delete process.env.WEBHOOK_PROXY_URL;
    });

    test("writes new webhook channel to .env", async () => {
      await setup.createWebhookChannel();
      expect(setup.updateEnv).toHaveBeenCalledWith({
        WEBHOOK_PROXY_URL: "https://smee.io/1234abc",
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
        "https://github.com/settings/apps/new"
      );
    });

    test("creates an app url when github org is set", () => {
      process.env.GH_ORG = "testorg";
      expect(setup.createAppUrl).toEqual(
        "https://github.com/organizations/testorg/settings/apps/new"
      );
    });

    test("creates an app url when github host env is set", () => {
      process.env.GHE_HOST = "hiimbex.github.com";
      expect(setup.createAppUrl).toEqual(
        "https://hiimbex.github.com/settings/apps/new"
      );
    });

    test("creates an app url when github host env and github org is set", () => {
      process.env.GHE_HOST = "hiimbex.github.com";
      process.env.GH_ORG = "testorg";
      expect(setup.createAppUrl).toEqual(
        "https://hiimbex.github.com/organizations/testorg/settings/apps/new"
      );
    });

    test("creates an app url when github host env and protocol are set", () => {
      process.env.GHE_HOST = "hiimbex.github.com";
      process.env.GHE_PROTOCOL = "http";
      expect(setup.createAppUrl).toEqual(
        "http://hiimbex.github.com/settings/apps/new"
      );
    });
  });

  describe("createAppFromCode", () => {
    beforeEach(() => {
      setup.updateEnv = jest.fn(async () => ({}));
    });

    afterEach(() => {
      delete process.env.APP_ID;
      delete process.env.PRIVATE_KEY;
      delete process.env.WEBHOOK_SECRET;
      delete process.env.GHE_HOST;
    });

    test("creates an app from a code", async () => {
      nock("https://api.github.com")
        .post("/app-manifests/123abc/conversions")
        .reply(200, response);

      const createdApp = await setup.createAppFromCode("123abc");
      expect(createdApp).toEqual("https://github.com/apps/testerino0000000");
      // expect dotenv to be called with id, webhook_secret, pem
      expect(setup.updateEnv).toHaveBeenCalledWith({
        APP_ID: "6666",
        PRIVATE_KEY:
          '"-----BEGIN RSA PRIVATE KEY-----\nsecrets\n-----END RSA PRIVATE KEY-----\n"',
        WEBHOOK_SECRET: "12345abcde",
      });
    });

    test("creates an app from a code when github host env is set", async () => {
      process.env.GHE_HOST = "swinton.github.com";

      nock("https://swinton.github.com")
        .post("/api/v3/app-manifests/123abc/conversions")
        .reply(200, response);

      const createdApp = await setup.createAppFromCode("123abc");
      expect(createdApp).toEqual("https://github.com/apps/testerino0000000");
      // expect dotenv to be called with id, webhook_secret, pem
      expect(setup.updateEnv).toHaveBeenCalledWith({
        APP_ID: "6666",
        PRIVATE_KEY:
          '"-----BEGIN RSA PRIVATE KEY-----\nsecrets\n-----END RSA PRIVATE KEY-----\n"',
        WEBHOOK_SECRET: "12345abcde",
      });
    });
  });

  describe("getManifest", () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test("creates an app from a code", () => {
      // checks that getManifest returns a JSON.stringified manifest
      expect(setup.getManifest(pkg, "localhost://3000")).toEqual(
        '{"description":"A framework for building GitHub Apps to automate and improve your workflow","hook_attributes":{"url":"localhost://3000/"},"name":"probot","public":true,"redirect_url":"localhost://3000/probot/setup","url":"https://probot.github.io","version":"v1"}'
      );
    });

    test("creates an app from a code with overrided values from app.yml", () => {
      const appYaml =
        "name: cool-app\ndescription: A description for a cool app";
      jest.spyOn(fs, "readFileSync").mockReturnValue(appYaml);

      // checks that getManifest returns the correct JSON.stringified manifest
      expect(setup.getManifest(pkg, "localhost://3000")).toEqual(
        '{"description":"A description for a cool app","hook_attributes":{"url":"localhost://3000/"},"name":"cool-app","public":true,"redirect_url":"localhost://3000/probot/setup","url":"https://probot.github.io","version":"v1"}'
      );
    });
  });
});
