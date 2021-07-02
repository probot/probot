import Stream from "stream";

import {
  EmitterWebhookEvent,
  EmitterWebhookEvent as WebhookEvent,
} from "@octokit/webhooks";
import Bottleneck from "bottleneck";
import nock from "nock";
import pino from "pino";

import { Probot, ProbotOctokit, Context } from "../src";

import webhookExamples from "@octokit/webhooks-examples";
import { EmitterWebhookEventName } from "@octokit/webhooks/dist-types/types";

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

const getPayloadExamples = <TName extends EmitterWebhookEventName>(
  name: TName
) => {
  return webhookExamples.filter((event) => event.name === name.split(".")[0])[0]
    .examples as EmitterWebhookEvent<TName>["payload"][];
};
const getPayloadExample = <TName extends EmitterWebhookEventName>(
  name: TName
) => {
  const examples = getPayloadExamples<TName>(name);
  if (name.includes(".")) {
    const [, action] = name.split(".");
    return examples.filter((payload) => {
      // @ts-expect-error
      return payload.action === action;
    })[0];
  }
  return examples[0];
};
// tslint:disable:no-empty
describe("Probot", () => {
  let probot: Probot;
  let event: WebhookEvent<
    "push" | "pull_request" | "installation" | "check_run"
  >;
  let output: any;

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  beforeEach(() => {
    // Clear log output
    output = [];
    probot = new Probot({ githubToken: "faketoken" });
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
      expect(() => new Probot()).toThrow(
        "[@octokit/auth-app] appId option is required"
      );
    });

    it('{ githubToken: "faketoken" }', () => {
      // probot with token. Should not throw
      new Probot({ githubToken: "faketoken" });
    });

    it('{ appId, privateKey" }', () => {
      // probot with appId/privateKey
      new Probot({ appId, privateKey });
    });

    it("shouldn't overwrite `options.throttle` passed to `{Octokit: ProbotOctokit.defaults(options)}`", () => {
      expect.assertions(1);

      const MyOctokit = ProbotOctokit.plugin((octokit, options) => {
        expect(options.throttle.enabled).toEqual(false);
      }).defaults({
        appId,
        privateKey,
        throttle: {
          enabled: false,
        },
      });

      new Probot({ Octokit: MyOctokit, appId, privateKey });
    });

    it("sets version", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });
      expect(probot.version).toBe("0.0.0-development");
    });
  });

  describe("webhooks", () => {
    let event: WebhookEvent<"push"> = {
      id: "0",
      name: "push",
      payload: getPayloadExample("push"),
    };

    it("responds with the correct error if webhook secret does not match", async () => {
      expect.assertions(1);

      probot.log.error = jest.fn();
      probot.webhooks.on("push", () => {
        throw new Error("X-Hub-Signature-256 does not match blob signature");
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
        throw new Error("No X-Hub-Signature-256 found on request");
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
        throw Error(
          "webhooks:receiver ignored: POST / due to missing headers: x-hub-signature-256"
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

  describe("ghe support", () => {
    it("requests from the correct API URL", async () => {
      const appFn = async (app: Probot) => {
        const octokit = await app.auth();
        expect(octokit.request.endpoint.DEFAULTS.baseUrl).toEqual(
          "https://notreallygithub.com/api/v3"
        );
      };

      new Probot({
        appId,
        privateKey,
        baseUrl: "https://notreallygithub.com/api/v3",
      }).load(appFn);
    });

    it("requests from the correct API URL when setting `baseUrl` on Octokit constructor", async () => {
      const appFn = async (app: Probot) => {
        const octokit = await app.auth();
        expect(octokit.request.endpoint.DEFAULTS.baseUrl).toEqual(
          "https://notreallygithub.com/api/v3"
        );
      };

      new Probot({
        appId,
        privateKey,
        Octokit: ProbotOctokit.defaults({
          baseUrl: "https://notreallygithub.com/api/v3",
        }),
      }).load(appFn);
    });
  });

  describe("ghe support with http", () => {
    it("requests from the correct API URL", async () => {
      const appFn = async (app: Probot) => {
        const octokit = await app.auth();
        expect(octokit.request.endpoint.DEFAULTS.baseUrl).toEqual(
          "http://notreallygithub.com/api/v3"
        );
      };

      new Probot({
        appId,
        privateKey,
        baseUrl: "http://notreallygithub.com/api/v3",
      }).load(appFn);
    });
  });

  describe.skip("options.redisConfig as string", () => {
    it("sets throttle options", async () => {
      expect.assertions(2);

      probot = new Probot({
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

  describe.skip("redis configuration object", () => {
    it("sets throttle options", async () => {
      expect.assertions(2);
      const redisConfig = {
        host: "test",
      };

      probot = new Probot({
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

  describe("on", () => {
    beforeEach(() => {
      event = {
        id: "123-456",
        name: "pull_request",
        payload: getPayloadExample("pull_request"),
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

    it("calls callback with onAny", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      const spy = jest.fn();
      probot.onAny(spy);

      await probot.receive(event);
      expect(spy).toHaveBeenCalled();
    });

    it("calls callback x amount of times when an array of x actions is passed", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      const event2: WebhookEvent<"issues.opened"> = {
        id: "123",
        name: "issues",
        payload: getPayloadExample("issues.opened"),
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
        payload: getPayloadExample("installation.created"),
      };
      event.payload.installation.id = 1;

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
        payload: getPayloadExample("installation.deleted"),
      };
      event.payload.installation.id = 1;

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
        payload: getPayloadExamples("check_run").filter(
          (event) => typeof event.installation === "undefined"
        )[0],
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
        payload: getPayloadExample("pull_request.opened"),
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
        log: pino(streamLogsToOutput),
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
});
