import SonicBoom from "sonic-boom";
import { createProbot, Probot } from "../src";

const env = {
  APP_ID: "1",
  PRIVATE_KEY: `-----BEGIN RSA PRIVATE KEY-----
MIIBOQIBAAJBAIILhiN9IFpaE0pUXsesuuoaj6eeDiAqCiE49WB1tMB8ZMhC37kY
Fl52NUYbUxb7JEf6pH5H9vqw1Wp69u78XeUCAwEAAQJAb88urnaXiXdmnIK71tuo
/TyHBKt9I6Rhfzz0o9Gv7coL7a537FVDvV5UCARXHJMF41tKwj+zlt9EEUw7a1HY
wQIhAL4F/VHWSPHeTgXYf4EaX2OlpSOk/n7lsFtL/6bWRzRVAiEArzJs2vopJitv
A1yBjz3q2nX+zthk+GLXrJQkYOnIk1ECIHfeFV8TWm5gej1LxZquBTA5pINoqDVq
NKZSuZEHqGEFAiB6EDrxkovq8SYGhIQsJeqkTMO8n94xhMRZlFmIQDokEQIgAq5U
r1UQNnUExRh7ZT0kFbMfO9jKYZVlQdCL9Dn93vo=
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

  test("env, logger message key", () => {
    let outputData = "";

    const sbWrite = SonicBoom.prototype.write;
    SonicBoom.prototype.write = function (data) {
      outputData += data;
    };

    const probot = createProbot({
      env: {
        ...env,
        LOG_LEVEL: "info",
        LOG_FORMAT: "json",
        LOG_MESSAGE_KEY: "myMessage",
      },
      defaults: { logLevel: "trace" },
    });

    probot.log.info("Ciao");

    try {
      expect(JSON.parse(outputData).myMessage).toEqual("Ciao");
    } finally {
      SonicBoom.prototype.write = sbWrite;
    }
  });
});
