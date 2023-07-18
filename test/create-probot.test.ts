import { createProbot, Probot } from "../src";
import { captureLogOutput } from "./helpers/capture-log-output";

const env = {
  APP_ID: "1",
  PRIVATE_KEY: `-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEArt/ScvMkbGF1h16mITuZ/1MmLXQ6GR6oxJ5olxvIKCmFVVAF
76ViLpR2/3bVkraBElSuXRUix/K4iCuK+LeV7JSFANdzMQ0Vt9NcxfXZo3rCbOHZ
yFViWWHcTzCQ8oyxDopXGt6377BSn9d8u9aZ/d7ew0sLKY4LjplY60NvTis3keTp
/RaI1oCnvYQraeBfWOK2xH8aC6MwlmSJ+CT8CVUR/zEhOQEkL3JcrOgJqzNmTK8p
J5aupC/YtN0sE72b+kv86+giLQrcGndzxgu8lCqFPmzQbO16sDmdjnpzVYIsM0OU
7wCU6NHthSJ69d9JQuJgsKRiyV3fldls4yJ9UwIDAQABAoIBAFYg2q/O3QOcRJx1
m3EGv+Qm+citU+gHV6vvMSgrgLt3J7pK/YF4fRDgAnPz/WCTDqMOngouXMEJ5KT8
fSfek7K/u3ocoxlnjmjJawn8+kIwNg4WdoLauuO29SDzlJBBhvrYW+paA1HEEA21
vjNtkM6etCyPi2HeGgcTs927ith+U4XJM6KB4Ixzt0C7BasSeFCcPGlDrEL2mu0V
fCJuYH2rH73GxEXYJTWzU0ttjNdovx9T4rxgWjYX+/U8mN1YQEyYd5VkziyVtIet
YEAStOwimZBEgk9w6XMVvDO+fPyTdjBFuinIMTookyaHhbmUMEHN8SGfmm4eOT2i
ccKnHCECgYEA5KrTuiecOD4ZT9vn/QtpdPWgW/l0v694Y70WsQ6PgB4+yy3qEcXO
uM0kErC6Yr2K/C7K3neV3/qAjA0RfES2BCWVkBKXWGsfAXd3a2B/P6CfJaEV4mqP
ZLHwqdANzV/ENAapvtXvrtZCxqdlDcTpYBbuBf2aBO5VmN/PZD1tNLkCgYEAw8bw
wNUh+EmxgFuq4dlZDUq3TG0KV0MI2yCV5k0BDd2zzwz+pibhb0FvYrFBJQJknYJ7
WNGTJbH2mX+EYqfLKTODzrhBc+qHjGzU20HZ62CVv/BYiwePhXT8/mQ5+odafdTJ
2QU8Rhl199eEQdTFKueaTBPv1Ch3ZV+0KR/XFGsCgYBCP4el2BH3bW5R56kXc7Xy
z7LM0sHTQxgC9WZcl5ZVjO2uWbgFvCQ/ABfiXlcxgi6BD2FxAH5obJ/Pc33MXe/J
1cW1/tzgHfDWsPDlKAjVu0hAU6IOfcbban4KBJ/rD0K9u+xzwHF3WtXvzdGGIrVm
RF5jV+zGXvJnnvfr16wK6QKBgGqkjHJN5uIrqk/EHzJFRbfy0iQEZZShBErw1haM
LZ3S/WY0quXw2e3TlAwLh/PT+OC/udbo2iG3bh+xEXj387euwwaw4Z51y35Xrh79
IOqRQyE5l9Grvacx0bn0+IwafNV8OrNHocyBg/wMXpPJhdlYLXlxhrtni5oh5q5c
FLmfAoGAc1sDXdvLG9dAwU76tWxsI/ND/mH8FqyoynfACf6O+2xYBRvHYlUwhH+2
ktF/AGF6qGtiTlkQp6W/9W8TCp66WeNOPaFFHWFlQ5uyxCn/N/Z3NnUvlD4YRi+P
+FrbrdG1hrbLgmCrDA+rZA/SqdsQy6PSJ97+JvRFhmBxoNxaYm0=
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
    const outputData = await captureLogOutput(() => {
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
    });
    expect(JSON.parse(outputData).myMessage).toEqual("Ciao");
  });

  test("env, octokit logger set", async () => {
    const outputData = await captureLogOutput(async () => {
      const probot = createProbot({
        env: {
          ...env,
          LOG_LEVEL: "info",
          LOG_FORMAT: "json",
          LOG_MESSAGE_KEY: "myMessage",
        },
      });

      const octokit = await probot.auth();
      octokit.log.info("Ciao");
    });
    expect(JSON.parse(outputData)).toMatchObject({
      myMessage: "Ciao",
      name: "octokit",
    });
  });
});
