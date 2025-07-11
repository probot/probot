import type {
  EmitterWebhookEvent as WebhookEvent,
  EmitterWebhookEventName,
} from "@octokit/webhooks";
import webhookExamples, {
  type WebhookDefinition,
} from "@octokit/webhooks-examples";
import Bottleneck from "bottleneck";
import fetchMock from "fetch-mock";
import { pino } from "pino";
import { describe, expect, it } from "vitest";

import { Probot, ProbotOctokit, Context } from "../src/index.js";

import { MockLoggerTarget } from "./utils.js";

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
  )[0].examples as WebhookEvent<TName>["payload"][];
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
  it(".version", () => {
    expect(Probot.version).toBe("0.0.0-development");
  });

  describe(".defaults()", () => {
    it("sets default options for constructor", async () => {
      const mock = fetchMock
        .createInstance()
        .getOnce("https://api.github.com/app", {
          status: 200,
          body: {
            id: 1,
          },
        });

      const MyProbot = Probot.defaults({ appId, privateKey });
      const probot = new MyProbot({
        request: { fetch: mock.fetchHandler },
      });
      const octokit = await probot.auth();
      await octokit.rest.apps.getAuthenticated();
    });
  });

  describe("constructor", () => {
    it("no options", () => {
      try {
        new Probot();
        throw new Error("Should have thrown");
      } catch (e: any) {
        expect(e.message.includes("appId option is required"), e.message).toBe(
          true,
        );
      }
    });

    it("{}", () => {
      try {
        new Probot({});
        throw new Error("Should have thrown");
      } catch (e: any) {
        expect(e.message.includes("appId option is required"), e.message).toBe(
          true,
        );
      }
    });

    it("{ appId }", () => {
      try {
        new Probot({ appId });
        throw new Error("Should have thrown");
      } catch (e: any) {
        expect(
          e.message.includes("privateKey option is required"),
          e.message,
        ).toBe(true);
      }
    });

    it('{ appId, privateKey" }', () => {
      // probot with appId/privateKey
      new Probot({ appId, privateKey });
    });

    it('{ githubToken: "faketoken" }', () => {
      // probot with token. Should not throw
      new Probot({ githubToken: "faketoken" });
    });

    it("shouldn't overwrite `options.throttle` passed to `{Octokit: ProbotOctokit.defaults(options)}`", async () => {
      const pluginCalls: any[] = [];
      const MyOctokit = ProbotOctokit.plugin((_octokit, options) => {
        pluginCalls.push(options);
      }).defaults({
        appId,
        privateKey,
        throttle: {
          enabled: false,
        },
      });

      const probot = new Probot({ Octokit: MyOctokit, appId, privateKey });

      await probot.ready();
      expect(pluginCalls.length).toBe(1);
      expect(pluginCalls[0].throttle?.enabled).toBe(true);
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
    const event: WebhookEvent<"push"> = {
      id: "0",
      name: "push",
      payload: getPayloadExample("push"),
    };

    it("responds with the correct error if webhook secret does not match", async () => {
      const logTarget = new MockLoggerTarget([]);

      const probot = new Probot({
        githubToken: "faketoken",
        log: pino(logTarget),
      });

      probot.on("push", () => {
        throw new Error("X-Hub-Signature-256 does not match blob signature");
      });

      try {
        await probot.receive(event);
        throw new Error("Should have thrown");
      } catch (e) {
        expect(logTarget.entries.length).toBe(1);
        expect(logTarget.entries[0].level).toBe(50); // 50 is the error level in pino
        expect(logTarget.entries[0].msg).toBe(
          "Go to https://github.com/settings/apps/YOUR_APP and verify that the Webhook secret matches the value of the WEBHOOK_SECRET environment variable.",
        );
      }
    });

    it("responds with the correct error if webhook secret is not found", async () => {
      const logTarget = new MockLoggerTarget();

      const probot = new Probot({
        githubToken: "faketoken",
        log: pino(logTarget),
      });

      probot.on("push", () => {
        throw new Error("No X-Hub-Signature-256 found on request");
      });

      try {
        await probot.receive(event);
        throw new Error("Should have thrown");
      } catch (e) {
        expect(logTarget.entries.length).toBe(1);
        expect(logTarget.entries[0].level).toBe(50); // 50 is the error level in pino
        expect(logTarget.entries[0].msg).toBe(
          "Go to https://github.com/settings/apps/YOUR_APP and verify that the Webhook secret matches the value of the WEBHOOK_SECRET environment variable.",
        );
      }
    });

    it("responds with the correct error if webhook secret is wrong", async () => {
      const logTarget = new MockLoggerTarget();

      const probot = new Probot({
        githubToken: "faketoken",
        log: pino(logTarget),
      });

      probot.on("push", () => {
        throw Error(
          "webhooks:receiver ignored: POST / due to missing headers: x-hub-signature-256",
        );
      });

      try {
        await probot.receive(event);
        throw new Error("Should have thrown");
      } catch (e) {
        expect(logTarget.entries.length).toBe(1);
        expect(logTarget.entries[0].level).toBe(50); // 50 is the error level in pino
        expect(logTarget.entries[0].msg).toBe(
          "Go to https://github.com/settings/apps/YOUR_APP and verify that the Webhook secret matches the value of the WEBHOOK_SECRET environment variable.",
        );
      }
    });

    it("responds with the correct error if the PEM file is missing", async () => {
      const logTarget = new MockLoggerTarget();

      const probot = new Probot({
        githubToken: "faketoken",
        log: pino(logTarget),
      });

      probot.onAny(() => {
        throw new Error(
          "error:0906D06C:PEM routines:PEM_read_bio:no start line",
        );
      });

      try {
        await probot.receive(event);
        throw new Error("Should have thrown");
      } catch (e) {
        expect(logTarget.entries.length).toBe(1);
        expect(logTarget.entries[0].level).toBe(50); // 50 is the error level in pino
        expect(logTarget.entries[0].msg).toBe(
          "Your private key (a .pem file or PRIVATE_KEY environment variable) or APP_ID is incorrect. Go to https://github.com/settings/apps/YOUR_APP, verify that APP_ID is set correctly, and generate a new PEM file if necessary.",
        );
      }
    });

    it("responds with the correct error if the jwt could not be decoded", async () => {
      const logTarget = new MockLoggerTarget();

      const probot = new Probot({
        githubToken: "faketoken",
        log: pino(logTarget),
      });

      probot.onAny(() => {
        throw new Error(
          '{"message":"A JSON web token could not be decoded","documentation_url":"https://developer.github.com/v3"}',
        );
      });

      try {
        await probot.receive(event);
        throw new Error("Should have thrown");
      } catch (e) {
        expect(logTarget.entries.length).toBe(1);
        expect(logTarget.entries[0].level).toBe(50); // 50 is the error level in pino
        expect(logTarget.entries[0].msg).toBe(
          "Your private key (a .pem file or PRIVATE_KEY environment variable) or APP_ID is incorrect. Go to https://github.com/settings/apps/YOUR_APP, verify that APP_ID is set correctly, and generate a new PEM file if necessary.",
        );
      }
    });
  });

  describe("ghe support", () => {
    it("requests from the correct API URL", async () => {
      const appFn = async (app: Probot) => {
        const octokit = await app.auth();
        expect(octokit.request.endpoint.DEFAULTS.baseUrl).toBe(
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
        expect(octokit.request.endpoint.DEFAULTS.baseUrl).toBe(
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
        expect(octokit.request.endpoint.DEFAULTS.baseUrl).toBe(
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
        const pluginCalls: any[] = [];
        const probot = new Probot({
          githubToken: "faketoken",
          redisConfig: process.env.REDIS_URL,
          Octokit: ProbotOctokit.plugin((_octokit, options) => {
            pluginCalls.push({ _octokit, options });
          }),
        });

        await probot.ready();

        expect(pluginCalls.length).toBe(1);
        expect(pluginCalls[0].options.throttle?.Bottleneck).toBe(Bottleneck);
        expect(
          pluginCalls[0].options.throttle?.connection instanceof
            Bottleneck.IORedisConnection,
        ).toBe(true);
      });
    },
  );

  describe.skipIf(process.env.REDIS_URL === undefined)(
    "redis configuration object",
    () => {
      it("sets throttle options", async () => {
        const redisConfig = {
          host: process.env.REDIS_URL,
        };

        const pluginCalls: any[] = [];
        const probot = new Probot({
          githubToken: "faketoken",
          redisConfig,
          Octokit: ProbotOctokit.plugin((_octokit, options) => {
            pluginCalls.push({ _octokit, options });
          }),
        });

        await probot.ready();
        expect(pluginCalls.length).toBe(1);

        expect(pluginCalls[0].options.throttle?.Bottleneck).toBe(Bottleneck);
        expect(
          pluginCalls[0].options.throttle?.connection instanceof
            Bottleneck.IORedisConnection,
        ).toBe(true);
      });
    },
  );

  describe("on", () => {
    it("calls callback when no action is specified", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      const event: WebhookEvent<"pull_request"> = {
        id: "123-456",
        name: "pull_request",
        payload: getPayloadExample("pull_request"),
      };

      const spyCalls: any[] = [];

      const spy = (...args: any[]) => {
        spyCalls.push(args);
      };
      probot.on("pull_request", spy);

      expect(spyCalls.length).toBe(0);
      await probot.receive(event);
      expect(spyCalls.length).toBe(1);

      expect(spyCalls[0][0] instanceof Context).toBe(true);
      expect(spyCalls[0][0].payload).toBe(event.payload);
    });

    it("calls callback with same action", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      let callCount = 0;
      probot.on("pull_request.opened", () => {
        ++callCount;
      });

      const event: WebhookEvent<"pull_request.opened"> = {
        id: "123-456",
        name: "pull_request",
        payload: getPayloadExample("pull_request.opened"),
      };

      await probot.receive(event);
      expect(callCount).toBe(1);
    });

    it("does not call callback with different action", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      let hasBeenCalled = 0;

      probot.on("pull_request.closed", () => {
        ++hasBeenCalled;
      });

      const event: WebhookEvent<"pull_request"> = {
        id: "123-456",
        name: "pull_request",
        payload: getPayloadExample("pull_request"),
      };

      await probot.receive(event);
      expect(hasBeenCalled).toBe(0);
    });

    it("calls callback with onAny", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      let callCount = 0;
      probot.onAny(() => {
        ++callCount;
      });

      const event: WebhookEvent<"pull_request"> = {
        id: "123-456",
        name: "pull_request",
        payload: getPayloadExample("pull_request"),
      };

      await probot.receive(event);
      expect(callCount).toBe(1);
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

      let callCount = 0;
      probot.on(["pull_request.opened", "issues.opened"], () => ++callCount);

      await probot.receive(event);
      await probot.receive(event2);
      expect(callCount).toBe(2);
    });

    it("adds a logger on the context", async () => {
      const logTarget = new MockLoggerTarget();

      const probot = new Probot({
        appId,
        privateKey,
        log: pino(logTarget),
      });

      const handlerCalls: Context[] = [];
      const handler = (context: Context) => {
        handlerCalls.push(context);
        context.log.info("testing");
      };

      probot.on("pull_request", handler);

      const event: WebhookEvent<"pull_request"> = {
        id: "123-456",
        name: "pull_request",
        payload: getPayloadExample("pull_request"),
      };

      await probot.receive(event);

      expect(handlerCalls.length).toBe(1);
      expect(typeof handlerCalls[0].log.info).toBe("function");
      expect(logTarget.entries.length).toBe(1);
      expect(logTarget.entries[0].msg).toBe("testing");
      expect(logTarget.entries[0].id).toBe(handlerCalls[0].id);
    });

    it("returns an authenticated client for installation.created", async () => {
      const mock = fetchMock
        .createInstance()
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
          function ({ url, options: opts }) {
            if (url === "https://api.github.com/") {
              expect(
                (opts.headers as Record<string, string>).authorization,
              ).toBe("token v1.1f699f1069f60xxx");
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
          fetch: mock.fetchHandler,
        },
      });
      const event: WebhookEvent<"installation.created"> = {
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
      const mock = fetchMock.createInstance().getOnce(
        function ({ url, options: opts }) {
          if (url === "https://api.github.com/") {
            expect((opts.headers as Record<string, string>).authorization).toBe(
              undefined,
            );
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
          fetch: mock.fetchHandler,
        },
      });

      const event: WebhookEvent<"installation.deleted"> = {
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
      const mock = fetchMock.createInstance().route(
        function ({ url, options: opts }) {
          if (url === "https://api.github.com/") {
            expect((opts.headers as Record<string, string>).authorization).toBe(
              undefined,
            );
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
          fetch: mock.fetchHandler,
        },
      });

      const event: WebhookEvent<"check_run"> = {
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
    it("delivers the event", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      let callCount = 0;
      probot.on("pull_request", () => ++callCount);

      const event: WebhookEvent<"pull_request.opened"> = {
        id: "123-456",
        name: "pull_request",
        payload: getPayloadExample("pull_request.opened"),
      };

      await probot.receive(event);

      expect(callCount).toBe(1);
    });

    it("waits for async events to resolve", async () => {
      const probot = new Probot({
        appId,
        privateKey,
      });

      let callCount = 0;

      probot.on("pull_request", () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            callCount++;
            resolve(null);
          }, 1);
        });
      });

      const event: WebhookEvent<"pull_request.opened"> = {
        id: "123-456",
        name: "pull_request",
        payload: getPayloadExample("pull_request.opened"),
      };

      await probot.receive(event);

      expect(callCount).toBe(1);
    });

    it("returns a reject errors thrown in apps", async () => {
      const probot = new Probot({
        appId,
        privateKey,
        log: pino({ enabled: false }),
      });

      probot.on("pull_request", () => {
        throw new Error("error from app");
      });

      const event: WebhookEvent<"pull_request.opened"> = {
        id: "123-456",
        name: "pull_request",
        payload: getPayloadExample("pull_request.opened"),
      };

      try {
        await probot.receive(event);
        throw new Error("Should have thrown");
      } catch (error) {
        expect((error as Error).message).toBe("error from app");
      }
    });

    it("passes logger to webhooks", async () => {
      const logTarget = new MockLoggerTarget();

      const probot = new Probot({
        appId,
        privateKey,
        log: pino(logTarget),
      });

      // @ts-expect-error
      probot.on("unknown-event", () => {});

      await probot.ready();
      expect(logTarget.entries.length).toBe(1);
      expect(logTarget.entries[0].msg).toBe(
        '"unknown-event" is not a known webhook name (https://developer.github.com/v3/activity/events/types/)',
      );
    });
  });
});
