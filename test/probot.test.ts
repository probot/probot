import Stream from "stream";

import { WebhookEvent } from "@octokit/webhooks";
import Bottleneck from "bottleneck";
import nock from "nock";
import pino from "pino";

import { Probot, ProbotOctokit, Context } from "../src";

import { WebhookEvents } from "@octokit/webhooks";

const appId = 1;
const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIBOQIBAAJBAIILhiN9IFpaE0pUXsesuuoaj6eeDiAqCiE49WB1tMB8ZMhC37kY
Fl52NUYbUxb7JEf6pH5H9vqw1Wp69u78XeUCAwEAAQJAb88urnaXiXdmnIK71tuo
/TyHBKt9I6Rhfzz0o9Gv7coL7a537FVDvV5UCARXHJMF41tKwj+zlt9EEUw7a1HY
wQIhAL4F/VHWSPHeTgXYf4EaX2OlpSOk/n7lsFtL/6bWRzRVAiEArzJs2vopJitv
A1yBjz3q2nX+zthk+GLXrJQkYOnIk1ECIHfeFV8TWm5gej1LxZquBTA5pINoqDVq
NKZSuZEHqGEFAiB6EDrxkovq8SYGhIQsJeqkTMO8n94xhMRZlFmIQDokEQIgAq5U
r1UQNnUExRh7ZT0kFbMfO9jKYZVlQdCL9Dn93vo=
-----END RSA PRIVATE KEY-----`;

// tslint:disable:no-empty
describe("Probot", () => {
  let probot: Probot;
  let event: {
    id: string;
    name: WebhookEvents;
    payload: any;
  };
  let output: any;

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  beforeEach(() => {
    // Clear log output
    output = [];
    process.env.DISABLE_WEBHOOK_EVENT_CHECK = "true";
    probot = new Probot({ githubToken: "faketoken" });

    event = {
      id: "0",
      name: "push",
      payload: require("./fixtures/webhook/push"),
    };
  });

  test(".version", () => {
    expect(Probot.version).toEqual("0.0.0-development");
  });

  describe(".defaults()", () => {
    test("sets default options for constructor", async () => {
      const mock = nock("https://api.github.com").get("/app").reply(200, {
        id: 1,
      });

      const MyProbot = Probot.defaults({ appId, privateKey });
      const probot = new MyProbot();
      const octokit = await probot.auth();
      await octokit.apps.getAuthenticated();
      expect(mock.activeMocks()).toStrictEqual([]);
    });
  });

  describe("constructor", () => {
    it("no options", () => {
      new Probot();
    });

    it('{ githubToken: "faketoken" }', () => {
      // probot with token. Should not throw
      new Probot({ githubToken: "faketoken" });
    });

    it('{ appId, privateKey" }', () => {
      // probot with appId/privateKey
      new Probot({ appId, privateKey });
    });

    it("shouldn't overwrite `options.throttle` passed to `{Octokit: ProbotOctokit.defaults(optiosn)}`", () => {
      expect.assertions(1);

      const MyOctokit = ProbotOctokit.plugin((octokit, options) => {
        expect(options.throttle.enabled).toEqual(false);
      }).defaults({
        throttle: {
          enabled: false,
        },
      });

      new Probot({ Octokit: MyOctokit });
    });

    it("sets version", async () => {
      const probot = new Probot({});
      expect(probot.version).toBe("0.0.0-development");
    });
  });

  describe("webhooks", () => {
    it("responds with the correct error if webhook secret does not match", async () => {
      expect.assertions(1);

      probot.log.error = jest.fn();
      probot.webhooks.on("push", () => {
        throw new Error("X-Hub-Signature does not match blob signature");
      });

      try {
        await probot.webhooks.receive(event);
      } catch (e) {
        expect(
          (probot.log.error as jest.Mock).mock.calls[0][1]
        ).toMatchSnapshot();
      }
    });

    it("responds with the correct error if webhook secret is not found", async () => {
      expect.assertions(1);

      probot.log.error = jest.fn();
      probot.webhooks.on("push", () => {
        throw new Error("No X-Hub-Signature found on request");
      });

      try {
        await probot.webhooks.receive(event);
      } catch (e) {
        expect(
          (probot.log.error as jest.Mock).mock.calls[0][1]
        ).toMatchSnapshot();
      }
    });

    it("responds with the correct error if webhook secret is wrong", async () => {
      expect.assertions(1);

      probot.log.error = jest.fn();
      probot.webhooks.on("push", () => {
        throw new Error(
          "webhooks:receiver ignored: POST / due to missing headers: x-hub-signature"
        );
      });

      try {
        await probot.webhooks.receive(event);
      } catch (e) {
        expect(
          (probot.log.error as jest.Mock).mock.calls[0][1]
        ).toMatchSnapshot();
      }
    });

    it("responds with the correct error if the PEM file is missing", async () => {
      expect.assertions(1);

      probot.log.error = jest.fn();
      probot.webhooks.onAny(() => {
        throw new Error(
          "error:0906D06C:PEM routines:PEM_read_bio:no start line"
        );
      });

      try {
        await probot.webhooks.receive(event);
      } catch (e) {
        expect(
          (probot.log.error as jest.Mock).mock.calls[0][1]
        ).toMatchSnapshot();
      }
    });

    it("responds with the correct error if the jwt could not be decoded", async () => {
      expect.assertions(1);

      probot.log.error = jest.fn();
      probot.webhooks.onAny(() => {
        throw new Error(
          '{"message":"A JSON web token could not be decoded","documentation_url":"https://developer.github.com/v3"}'
        );
      });

      try {
        await probot.webhooks.receive(event);
      } catch (e) {
        expect(
          (probot.log.error as jest.Mock).mock.calls[0][1]
        ).toMatchSnapshot();
      }
    });
  });

  describe("receive", () => {
    it("forwards events to each app", async () => {
      const spy = jest.fn();

      probot.load(({ app }: { app: Probot }) => app.on("push", spy));

      await probot.receive(event);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("ghe support", () => {
    beforeEach(() => {
      process.env.GHE_HOST = "notreallygithub.com";
    });

    afterEach(() => {
      delete process.env.GHE_HOST;
    });

    it("requests from the correct API URL", async () => {
      const appFn = async ({ app }: { app: Probot }) => {
        const github = await app.auth();
        expect(github.request.endpoint.DEFAULTS.baseUrl).toEqual(
          "https://notreallygithub.com/api/v3"
        );
      };

      new Probot({}).load(appFn);
    });

    it("throws if the GHE host includes a protocol", async () => {
      process.env.GHE_HOST = "https://notreallygithub.com";

      try {
        require("../src/bin/probot");
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
  });

  describe("ghe support with http", () => {
    beforeEach(() => {
      process.env.GHE_HOST = "notreallygithub.com";
      process.env.GHE_PROTOCOL = "http";
    });

    afterEach(() => {
      delete process.env.GHE_HOST;
      delete process.env.GHE_PROTOCOL;
    });

    it("requests from the correct API URL", async () => {
      const appFn = async ({ app }: { app: Probot }) => {
        const github = await app.auth();
        expect(github.request.endpoint.DEFAULTS.baseUrl).toEqual(
          "http://notreallygithub.com/api/v3"
        );
      };

      new Probot({}).load(appFn);
    });

    it("throws if the GHE host includes a protocol", async () => {
      process.env.GHE_HOST = "http://notreallygithub.com";

      try {
        require("../src/bin/probot");
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
  });

  describe("options.redisConfig as string", () => {
    it("sets throttleOptions", async () => {
      expect.assertions(2);

      probot = new Probot({
        webhookPath: "/webhook",
        githubToken: "faketoken",
        redisConfig: "test",
        Octokit: ProbotOctokit.plugin((octokit, options) => {
          expect(options.throttle.Bottleneck).toBe(Bottleneck);
          expect(options.throttle.connection).toBeInstanceOf(
            Bottleneck.IORedisConnection
          );
        }),
      });
    });
  });

  describe("redis configuration object", () => {
    it("sets throttleOptions", async () => {
      expect.assertions(2);
      const redisConfig = {
        host: "test",
      };

      probot = new Probot({
        webhookPath: "/webhook",
        githubToken: "faketoken",
        redisConfig,
        Octokit: ProbotOctokit.plugin((octokit, options) => {
          expect(options.throttle.Bottleneck).toBe(Bottleneck);
          expect(options.throttle.connection).toBeInstanceOf(
            Bottleneck.IORedisConnection
          );
        }),
      });
    });
  });

  describe("custom Octokit constructor", () => {
    beforeEach(() => {
      const MyOctokit = ProbotOctokit.plugin(function fooBar() {
        return {
          foo: "bar",
        };
      });

      probot = new Probot({
        Octokit: MyOctokit,
        githubToken: "faketoken",
      });
    });

    it("is propagated to Octokit", async () => {
      const app = probot.load(() => {});
      const octokit: InstanceType<typeof ProbotOctokit> = await app.auth();
      expect(octokit.foo).toBe("bar");
    });
  });

  describe("load", () => {
    it("app sends request with JWT authentication", async () => {
      expect.assertions(3);

      const mock = nock("https://api.github.com")
        .get("/app")
        .reply(200, {
          id: 1,
        })
        .post("/app/installations/1/access_tokens")
        .reply(201, {
          token: "v1.123",
          permissions: {},
        })
        .get("/repos/octocat/hello-world")
        .matchHeader("authorization", "token v1.123")
        .reply(200, { id: 4 });

      const probot = new Probot({
        appId,
        privateKey,
      });

      await new Promise((resolve, reject) => {
        probot.load(async ({ app }: { app: Probot }) => {
          const octokit = await app.auth();
          try {
            const { data: appData } = await octokit.apps.getAuthenticated();

            expect(appData.id).toEqual(1);

            const installationOctokit = await app.auth(1);

            const { data: repoData } = await installationOctokit.repos.get({
              owner: "octocat",
              repo: "hello-world",
            });

            expect(repoData.id).toEqual(4);
            expect(mock.activeMocks()).toStrictEqual([]);

            resolve(null);
          } catch (error) {
            reject(error);
          }
        });
      });
    });

    it("accepts an array of app functions", () => {
      expect.assertions(2);

      const probot = new Probot({
        appId,
        privateKey,
      });

      const app = ({ app }: { app: Probot }) => {
        expect(app).toBeInstanceOf(Probot);
      };

      probot.load([app, app]);
    });
  });

  describe("on", () => {
    beforeEach(() => {
      event = {
        id: "123-456",
        name: "pull_request",
        payload: {
          action: "opened",
          installation: { id: 1 },
        },
      };
    });

    it("calls callback when no action is specified", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      const spy = jest.fn();
      probot.on("pull_request", spy);

      expect(spy).toHaveBeenCalledTimes(0);
      await probot.receive(event);
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0]).toBeInstanceOf(Context);
      expect(spy.mock.calls[0][0].payload).toBe(event.payload);
    });

    it("calls callback with same action", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      const spy = jest.fn();
      probot.on("pull_request.opened", spy);

      await probot.receive(event);
      expect(spy).toHaveBeenCalled();
    });

    it("does not call callback with different action", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      const spy = jest.fn();
      probot.on("pull_request.closed", spy);

      await probot.receive(event);
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it("calls callback with *", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      const spy = jest.fn();
      probot.on("*", spy);

      await probot.receive(event);
      expect(spy).toHaveBeenCalled();
    });

    it("calls callback x amount of times when an array of x actions is passed", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      const event2: WebhookEvent = {
        id: "123",
        name: "issues",
        payload: {
          action: "opened",
          installation: { id: 2 },
        },
      };

      const spy = jest.fn();
      probot.on(["pull_request.opened", "issues.opened"], spy);

      await probot.receive(event);
      await probot.receive(event2);
      expect(spy.mock.calls.length).toEqual(2);
    });

    it("adds a logger on the context", async () => {
      const probot = new Probot({
        appId,
        privateKey,
        log: pino(streamLogsToOutput),
      });

      const handler = jest.fn().mockImplementation((context) => {
        expect(context.log.info).toBeDefined();
        context.log.info("testing");

        expect(output[0]).toEqual(
          expect.objectContaining({
            id: context.id,
            msg: "testing",
          })
        );
      });

      probot.on("pull_request", handler);
      await probot.receive(event).catch(console.error);
      expect(handler).toHaveBeenCalled();
    });

    it("returns an authenticated client for installation.created", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      event = {
        id: "123-456",
        name: "installation",
        payload: {
          action: "created",
          installation: { id: 1 },
        },
      };

      const mock = nock("https://api.github.com")
        .post("/app/installations/1/access_tokens")
        .reply(201, {
          token: "v1.1f699f1069f60xxx",
          permissions: {
            issues: "write",
            contents: "read",
          },
        })
        .get("/")
        .matchHeader("authorization", "token v1.1f699f1069f60xxx")
        .reply(200, {});

      probot.on("installation.created", async (context) => {
        await context.octokit.request("/");
      });

      await probot.receive(event);

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("returns an unauthenticated client for installation.deleted", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      event = {
        id: "123-456",
        name: "installation",
        payload: {
          action: "deleted",
          installation: { id: 1 },
        },
      };

      const mock = nock("https://api.github.com")
        .get("/")
        .matchHeader("authorization", (value) => value === undefined)
        .reply(200, {});

      probot.on("installation.deleted", async (context) => {
        await context.octokit.request("/");
      });

      await probot.receive(event).catch(console.log);

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("returns an authenticated client for events without an installation", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      event = {
        id: "123-456",
        name: "check_run",
        payload: {
          /* no installation */
        },
      };

      const mock = nock("https://api.github.com")
        .get("/")
        .matchHeader("authorization", (value) => value === undefined)
        .reply(200, {});

      probot.on("check_run", async (context) => {
        await context.octokit.request("/");
      });

      await probot.receive(event).catch(console.log);

      expect(mock.activeMocks()).toStrictEqual([]);
    });
  });

  describe("receive", () => {
    beforeEach(() => {
      event = {
        id: "123-456",
        name: "pull_request",
        payload: {
          action: "opened",
          installation: { id: 1 },
        },
      };
    });

    it("delivers the event", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      const spy = jest.fn();
      probot.on("pull_request", spy);

      await probot.receive(event);

      expect(spy).toHaveBeenCalled();
    });

    it("waits for async events to resolve", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      const spy = jest.fn();
      probot.on("pull_request", () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            spy();
            resolve(null);
          }, 1);
        });
      });

      await probot.receive(event);

      expect(spy).toHaveBeenCalled();
    });

    it("returns a reject errors thrown in apps", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      probot.on("pull_request", () => {
        throw new Error("error from app");
      });

      try {
        await probot.receive(event);
        throw new Error("expected error to be raised from app");
      } catch (error) {
        expect(error.message).toMatch(/error from app/);
      }
    });
  });

  describe("auth", () => {
    it("throttleOptions", async () => {
      const probot = new Probot({
        Octokit: ProbotOctokit.plugin((octokit: any, options: any) => {
          return {
            pluginLoaded: true,
            test() {
              expect(options.throttle.id).toBe(1);
              expect(options.throttle.foo).toBe("bar");
            },
          };
        }),
        id: 1,
        privateKey: "private key",
        secret: "secret",
        throttleOptions: {
          foo: "bar",
          onAbuseLimit: () => true,
          onRateLimit: () => true,
        },
      } as any);

      const result = await probot.auth(1);
      expect(result.pluginLoaded).toEqual(true);
      result.test();
    });
  });
});
