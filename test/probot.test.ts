import Stream from "node:stream";

import type {
  EmitterWebhookEvent,
  EmitterWebhookEvent as WebhookEvent,
} from "@octokit/webhooks";
import Bottleneck from "bottleneck";
import fetchMock from "fetch-mock";
import { pino, type LogFn } from "pino";
import { describe, expect, test, beforeEach, it, vi, type Mock } from "vitest";

import { Probot, ProbotOctokit, Context } from "../src/index.js";

import webhookExamples, {
  type WebhookDefinition,
} from "@octokit/webhooks-examples";
import type { EmitterWebhookEventName } from "@octokit/webhooks/dist-types/types.js";

const appId = 1;
const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1c7+9z5Pad7OejecsQ0bu3aozN3tihPmljnnudb9G3HECdnH
lWu2/a1gB9JW5TBQ+AVpum9Okx7KfqkfBKL9mcHgSL0yWMdjMfNOqNtrQqKlN4kE
p6RD++7sGbzbfZ9arwrlD/HSDAWGdGGJTSOBM6pHehyLmSC3DJoR/CTu0vTGTWXQ
rO64Z8tyXQPtVPb/YXrcUhbBp8i72b9Xky0fD6PkEebOy0Ip58XVAn2UPNlNOSPS
ye+Qjtius0Md4Nie4+X8kwVI2Qjk3dSm0sw/720KJkdVDmrayeljtKBx6AtNQsSX
gzQbeMmiqFFkwrG1+zx6E7H7jqIQ9B6bvWKXGwIDAQABAoIBAD8kBBPL6PPhAqUB
K1r1/gycfDkUCQRP4DbZHt+458JlFHm8QL6VstKzkrp8mYDRhffY0WJnYJL98tr4
4tohsDbqFGwmw2mIaHjl24LuWXyyP4xpAGDpl9IcusjXBxLQLp2m4AKXbWpzb0OL
Ulrfc1ZooPck2uz7xlMIZOtLlOPjLz2DuejVe24JcwwHzrQWKOfA11R/9e50DVse
hnSH/w46Q763y4I0E3BIoUMsolEKzh2ydAAyzkgabGQBUuamZotNfvJoDXeCi1LD
8yNCWyTlYpJZJDDXooBU5EAsCvhN1sSRoaXWrlMSDB7r/E+aQyKua4KONqvmoJuC
21vSKeECgYEA7yW6wBkVoNhgXnk8XSZv3W+Q0xtdVpidJeNGBWnczlZrummt4xw3
xs6zV+rGUDy59yDkKwBKjMMa42Mni7T9Fx8+EKUuhVK3PVQyajoyQqFwT1GORJNz
c/eYQ6VYOCSC8OyZmsBM2p+0D4FF2/abwSPMmy0NgyFLCUFVc3OECpkCgYEA5OAm
I3wt5s+clg18qS7BKR2DuOFWrzNVcHYXhjx8vOSWV033Oy3yvdUBAhu9A1LUqpwy
Ma+unIgxmvmUMQEdyHQMcgBsVs10dR/g2xGjMLcwj6kn+xr3JVIZnbRT50YuPhf+
ns1ScdhP6upo9I0/sRsIuN96Gb65JJx94gQ4k9MCgYBO5V6gA2aMQvZAFLUicgzT
u/vGea+oYv7tQfaW0J8E/6PYwwaX93Y7Q3QNXCoCzJX5fsNnoFf36mIThGHGiHY6
y5bZPPWFDI3hUMa1Hu/35XS85kYOP6sGJjf4kTLyirEcNKJUWH7CXY+00cwvTkOC
S4Iz64Aas8AilIhRZ1m3eQKBgQCUW1s9azQRxgeZGFrzC3R340LL530aCeta/6FW
CQVOJ9nv84DLYohTVqvVowdNDTb+9Epw/JDxtDJ7Y0YU0cVtdxPOHcocJgdUGHrX
ZcJjRIt8w8g/s4X6MhKasBYm9s3owALzCuJjGzUKcDHiO2DKu1xXAb0SzRcTzUCn
7daCswKBgQDOYPZ2JGmhibqKjjLFm0qzpcQ6RPvPK1/7g0NInmjPMebP0K6eSPx0
9/49J6WTD++EajN7FhktUSYxukdWaCocAQJTDNYP0K88G4rtC2IYy5JFn9SWz5oh
x//0u+zd/R/QRUzLOw4N72/Hu+UG6MNt5iDZFCtapRaKt6OvSBwy8w==
-----END RSA PRIVATE KEY-----`;

const getPayloadExamples = <TName extends EmitterWebhookEventName>(
  name: TName,
) => {
  return (webhookExamples as unknown as WebhookDefinition[]).filter(
    (event) => event.name === name.split(".")[0],
  )[0].examples as EmitterWebhookEvent<TName>["payload"][];
};
const getPayloadExample = <TName extends EmitterWebhookEventName>(
  name: TName,
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
describe("Probot", () => {
  let probot: Probot;
  let event: WebhookEvent<
    "push" | "pull_request" | "installation" | "check_run"
  >;
  let output: any;

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, _encoding, done) => {
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
      const fetch = fetchMock.sandbox().getOnce("https://api.github.com/app", {
        status: 200,
        body: {
          id: 1,
        },
      });

      const MyProbot = Probot.defaults({ appId, privateKey });
      const probot = new MyProbot({
        request: { fetch },
      });
      const octokit = await probot.auth();
      await octokit.apps.getAuthenticated();
    });
  });

  describe("constructor", () => {
    it("no options", () => {
      expect(() => new Probot()).toThrow(
        "[@octokit/auth-app] appId option is required",
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

      const MyOctokit = ProbotOctokit.plugin((_octokit, options) => {
        expect(options.throttle?.enabled).toEqual(true);
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

      probot.log.error = vi.fn() as LogFn;
      probot.webhooks.on("push", () => {
        throw new Error("X-Hub-Signature-256 does not match blob signature");
      });

      try {
        await probot.webhooks.receive(event);
      } catch (e) {
        expect((probot.log.error as Mock).mock.calls[0][1]).toMatchSnapshot();
      }
    });

    it("responds with the correct error if webhook secret is not found", async () => {
      expect.assertions(1);

      probot.log.error = vi.fn() as LogFn;
      probot.webhooks.on("push", () => {
        throw new Error("No X-Hub-Signature-256 found on request");
      });

      try {
        await probot.webhooks.receive(event);
      } catch (e) {
        expect((probot.log.error as Mock).mock.calls[0][1]).toMatchSnapshot();
      }
    });

    it("responds with the correct error if webhook secret is wrong", async () => {
      expect.assertions(1);

      probot.log.error = vi.fn() as LogFn;
      probot.webhooks.on("push", () => {
        throw Error(
          "webhooks:receiver ignored: POST / due to missing headers: x-hub-signature-256",
        );
      });

      try {
        await probot.webhooks.receive(event);
      } catch (e) {
        expect((probot.log.error as Mock).mock.calls[0][1]).toMatchSnapshot();
      }
    });

    it("responds with the correct error if the PEM file is missing", async () => {
      expect.assertions(1);

      probot.log.error = vi.fn() as LogFn;
      probot.webhooks.onAny(() => {
        throw new Error(
          "error:0906D06C:PEM routines:PEM_read_bio:no start line",
        );
      });

      try {
        await probot.webhooks.receive(event);
      } catch (e) {
        expect((probot.log.error as Mock).mock.calls[0][1]).toMatchSnapshot();
      }
    });

    it("responds with the correct error if the jwt could not be decoded", async () => {
      expect.assertions(1);

      probot.log.error = vi.fn() as LogFn;
      probot.webhooks.onAny(() => {
        throw new Error(
          '{"message":"A JSON web token could not be decoded","documentation_url":"https://developer.github.com/v3"}',
        );
      });

      try {
        await probot.webhooks.receive(event);
      } catch (e) {
        expect((probot.log.error as Mock).mock.calls[0][1]).toMatchSnapshot();
      }
    });
  });

  describe("ghe support", () => {
    it("requests from the correct API URL", async () => {
      const appFn = async (app: Probot) => {
        const octokit = await app.auth();
        expect(octokit.request.endpoint.DEFAULTS.baseUrl).toEqual(
          "https://notreallygithub.com/api/v3",
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
          "https://notreallygithub.com/api/v3",
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
          "http://notreallygithub.com/api/v3",
        );
      };

      new Probot({
        appId,
        privateKey,
        baseUrl: "http://notreallygithub.com/api/v3",
      }).load(appFn);
    });
  });

  describe.skipIf(process.env.REDIS_URL === undefined)(
    "options.redisConfig as string",
    () => {
      it("sets throttle options", async () => {
        expect.assertions(2);

        probot = new Probot({
          githubToken: "faketoken",
          redisConfig: process.env.REDIS_URL,
          Octokit: ProbotOctokit.plugin((_octokit, options) => {
            expect(options.throttle?.Bottleneck).toBe(Bottleneck);
            expect(options.throttle?.connection).toBeInstanceOf(
              Bottleneck.IORedisConnection,
            );
          }),
        });
      });
    },
  );

  describe.skipIf(process.env.REDIS_URL === undefined)(
    "redis configuration object",
    () => {
      it("sets throttle options", async () => {
        expect.assertions(2);
        const redisConfig = {
          host: process.env.REDIS_URL,
        };

        probot = new Probot({
          githubToken: "faketoken",
          redisConfig,
          Octokit: ProbotOctokit.plugin((_octokit, options) => {
            expect(options.throttle?.Bottleneck).toBe(Bottleneck);
            expect(options.throttle?.connection).toBeInstanceOf(
              Bottleneck.IORedisConnection,
            );
          }),
        });
      });
    },
  );

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

      const spy = vi.fn();
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

      const spy = vi.fn();
      probot.on("pull_request.opened", spy);

      const event: WebhookEvent<"pull_request.opened"> = {
        id: "123-456",
        name: "pull_request",
        payload: getPayloadExample("pull_request.opened"),
      };

      await probot.receive(event);
      expect(spy).toHaveBeenCalled();
    });

    it("does not call callback with different action", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      const spy = vi.fn();
      probot.on("pull_request.closed", spy);

      await probot.receive(event);
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it("calls callback with onAny", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      const spy = vi.fn();
      probot.onAny(spy);

      await probot.receive(event);
      expect(spy).toHaveBeenCalled();
    });

    it("calls callback x amount of times when an array of x actions is passed", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      const event: WebhookEvent<"pull_request.opened"> = {
        id: "123-456",
        name: "pull_request",
        payload: getPayloadExample("pull_request.opened"),
      };

      const event2: WebhookEvent<"issues.opened"> = {
        id: "123",
        name: "issues",
        payload: getPayloadExample("issues.opened"),
      };

      const spy = vi.fn();
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

      const handler = vi.fn().mockImplementation((context) => {
        expect(context.log.info).toBeDefined();
        context.log.info("testing");

        expect(output[0]).toEqual(
          expect.objectContaining({
            id: context.id,
            msg: "testing",
          }),
        );
      });

      probot.on("pull_request", handler);
      await probot.receive(event).catch(console.error);
      expect(handler).toHaveBeenCalled();
    });

    it("returns an authenticated client for installation.created", async () => {
      const fetch = fetchMock
        .sandbox()
        .postOnce("https://api.github.com/app/installations/1/access_tokens", {
          status: 201,
          body: {
            token: "v1.1f699f1069f60xxx",
            permissions: {
              issues: "write",
              contents: "read",
            },
          },
        })
        .getOnce(
          function (url, opts) {
            if (url === "https://api.github.com/") {
              expect(
                (opts.headers as Record<string, string>).authorization,
              ).toEqual("token v1.1f699f1069f60xxx");
              return true;
            }
            throw new Error("Should have matched");
          },
          {
            status: 200,
            body: {},
          },
        );

      const probot = new Probot({
        appId,
        privateKey,
        request: {
          fetch,
        },
      });

      event = {
        id: "123-456",
        name: "installation",
        payload: getPayloadExample("installation.created"),
      };
      event.payload.installation.id = 1;

      probot.on("installation.created", async (context) => {
        await context.octokit.request("/");
      });

      await probot.receive(event);
    });

    it("returns an unauthenticated client for installation.deleted", async () => {
      const fetch = fetchMock.sandbox().getOnce(
        function (url, opts) {
          if (url === "https://api.github.com/") {
            expect(
              (opts.headers as Record<string, string>).authorization,
            ).toEqual(undefined);
            return true;
          }
          throw new Error("Should have matched");
        },
        {
          body: {},
        },
      );

      const probot = new Probot({
        appId,
        privateKey,
        request: {
          fetch,
        },
      });

      event = {
        id: "123-456",
        name: "installation",
        payload: getPayloadExample("installation.deleted"),
      };
      event.payload.installation.id = 1;

      probot.on("installation.deleted", async (context) => {
        await context.octokit.request("/");
      });

      await probot.receive(event).catch(console.log);
    });

    it("returns an authenticated client for events without an installation", async () => {
      const fetch = fetchMock.sandbox().mock(
        function (url, opts) {
          if (url === "https://api.github.com/") {
            expect(
              (opts.headers as Record<string, string>).authorization,
            ).toEqual(undefined);
            return true;
          }
          throw new Error("Should have matched");
        },
        {
          body: {},
        },
      );

      const probot = new Probot({
        appId,
        privateKey,
        request: {
          fetch,
        },
      });

      event = {
        id: "123-456",
        name: "check_run",
        payload: getPayloadExamples("check_run").filter(
          (event) => typeof event.installation === "undefined",
        )[0],
      };

      probot.on("check_run", async (context) => {
        await context.octokit.request("/");
      });

      await probot.receive(event).catch(console.log);
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

      const spy = vi.fn();
      probot.on("pull_request", spy);

      await probot.receive(event);

      expect(spy).toHaveBeenCalled();
    });

    it("waits for async events to resolve", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      const spy = vi.fn();
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
        expect((error as Error).message).toMatch(/error from app/);
      }
    });

    it("passes logger to webhooks", async () => {
      const probot = new Probot({
        appId,
        privateKey,
        log: pino(streamLogsToOutput),
      });

      // @ts-expect-error
      probot.on("unknown-event", () => {});

      expect(output.length).toEqual(1);
      expect(output[0].msg).toEqual(
        '"unknown-event" is not a known webhook name (https://developer.github.com/v3/activity/events/types/)',
      );
    });
  });
});
