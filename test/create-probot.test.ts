import { createProbot, Probot } from "../src";
import { captureLogOutput } from "./helpers/capture-log-output";

const env = {
  APP_ID: "1",
  PRIVATE_KEY: `-----BEGIN RSA PRIVATE KEY-----
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
-----END RSA PRIVATE KEY-----`,
  WEBHOOK_SECRET: "secret",
};
// tslint:disable:no-empty
describe("createProbot", () => {
  test("createProbot()", () => {
    const probot = createProbot({ env });
    expect(probot).toBeInstanceOf(Probot);
  });

  test("defaults, env", () => {
    const probot = createProbot({
      env: {
        ...env,
        LOG_LEVEL: "debug",
      },
      defaults: { logLevel: "trace" },
    });
    expect(probot.log.level).toEqual("debug");
  });

  test("defaults, overrides", () => {
    const probot = createProbot({
      env,
      defaults: { logLevel: "debug" },
      overrides: { logLevel: "trace" },
    });
    expect(probot.log.level).toEqual("trace");
  });

  test("env, overrides", () => {
    const probot = createProbot({
      env: {
        ...env,
        LOG_LEVEL: "fatal",
      },
      overrides: { logLevel: "trace" },
    });
    expect(probot.log.level).toEqual("trace");
  });

  test("defaults, env, overrides", () => {
    const probot = createProbot({
      env: {
        ...env,
        LOG_LEVEL: "fatal",
      },
      defaults: { logLevel: "debug" },
      overrides: { logLevel: "trace" },
    });
    expect(probot.log.level).toEqual("trace");
  });

  test("env, logger message key", async () => {
    const probot = createProbot({
      env: {
        ...env,
        LOG_LEVEL: "info",
        LOG_FORMAT: "json",
        LOG_MESSAGE_KEY: "myMessage",
      },
      defaults: { logLevel: "trace" },
    });
    const outputData = await captureLogOutput(() => {
      probot.log.info("Ciao");
      // @ts-expect-error We need to access this private prop for debugging
    }, probot._logger);
    expect(JSON.parse(outputData).myMessage).toEqual("Ciao");
  });

  test("env, octokit logger set", async () => {
    const probot = createProbot({
      env: {
        ...env,
        LOG_LEVEL: "info",
        LOG_FORMAT: "json",
        LOG_MESSAGE_KEY: "myMessage",
      },
    });
    const outputData = await captureLogOutput(async () => {
      const octokit = await probot.auth();
      octokit.log.info("Ciao");
      // @ts-expect-error We need to access this private prop for debugging
    }, probot._logger);
    expect(JSON.parse(outputData)).toMatchObject({
      myMessage: "Ciao",
      name: "octokit",
    });
  });
});
