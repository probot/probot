import { getOptions } from "../src";

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
describe("getOptions", () => {
  test("getOptions()", () => {
    const options = getOptions({ env });
    expect(Object.keys(options).sort()).toStrictEqual([
      "Probot",
      "host",
      "log",
      "port",
      "webhookPath",
      "webhookProxy",
    ]);

    expect(options.port).toEqual(3000);
  });

  test("defaults, env", () => {
    const options = getOptions({
      env: {
        ...env,
        PORT: "2222",
      },
      defaults: { port: 1111 },
    });
    expect(options.port).toEqual(2222);
  });

  test("defaults, overrides", () => {
    const options = getOptions({
      defaults: { port: 1111 },
      overrides: { port: 3333 },
    });
    expect(options.port).toEqual(3333);
  });

  test("env, overrides", () => {
    const options = getOptions({
      env: {
        ...env,
        PORT: "2222",
      },
      overrides: { port: 3333 },
    });
    expect(options.port).toEqual(3333);
  });

  test("defaults, env, overrides", () => {
    const options = getOptions({
      env: {
        ...env,
        PORT: "2222",
      },
      defaults: { port: 1111 },
      overrides: { port: 3333 },
    });
    expect(options.port).toEqual(3333);
  });
});
