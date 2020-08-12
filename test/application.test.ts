import { WebhookEvent } from "@octokit/webhooks";
import nock from "nock";
import pino from "pino";

import { Application } from "../src/application";
import { Context } from "../src/context";
import { ProbotOctokit } from "../src/github/octokit";
import Stream from "stream";

describe("Application", () => {
  let app: Application;
  let event: WebhookEvent;
  let output: any;

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  beforeEach(() => {
    // Clear log output
    output = [];

    app = new Application({
      secret: "secret",
      id: 1,
      privateKey:
        "-----BEGIN RSA PRIVATE KEY-----\nMIIBOQIBAAJBAIILhiN9IFpaE0pUXsesuuoaj6eeDiAqCiE49WB1tMB8ZMhC37kY\nFl52NUYbUxb7JEf6pH5H9vqw1Wp69u78XeUCAwEAAQJAb88urnaXiXdmnIK71tuo\n/TyHBKt9I6Rhfzz0o9Gv7coL7a537FVDvV5UCARXHJMF41tKwj+zlt9EEUw7a1HY\nwQIhAL4F/VHWSPHeTgXYf4EaX2OlpSOk/n7lsFtL/6bWRzRVAiEArzJs2vopJitv\nA1yBjz3q2nX+zthk+GLXrJQkYOnIk1ECIHfeFV8TWm5gej1LxZquBTA5pINoqDVq\nNKZSuZEHqGEFAiB6EDrxkovq8SYGhIQsJeqkTMO8n94xhMRZlFmIQDokEQIgAq5U\nr1UQNnUExRh7ZT0kFbMfO9jKYZVlQdCL9Dn93vo=\n-----END RSA PRIVATE KEY-----",
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
      log: pino(streamLogsToOutput),
    });

    event = {
      id: "123-456",
      name: "pull_request",
      payload: {
        action: "opened",
        installation: { id: 1 },
      },
    };
  });

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.restore();
  });

  describe("on", () => {
    it("calls callback when no action is specified", async () => {
      const spy = jest.fn();
      app.on("pull_request", spy);

      expect(spy).toHaveBeenCalledTimes(0);
      await app.receive(event);
      expect(spy).toHaveBeenCalled();
      expect(spy.mock.calls[0][0]).toBeInstanceOf(Context);
      expect(spy.mock.calls[0][0].payload).toBe(event.payload);
    });

    it("calls callback with same action", async () => {
      const spy = jest.fn();
      app.on("pull_request.opened", spy);

      await app.receive(event);
      expect(spy).toHaveBeenCalled();
    });

    it("does not call callback with different action", async () => {
      const spy = jest.fn();
      app.on("pull_request.closed", spy);

      await app.receive(event);
      expect(spy).toHaveBeenCalledTimes(0);
    });

    it("calls callback with *", async () => {
      const spy = jest.fn();
      app.on("*", spy);

      await app.receive(event);
      expect(spy).toHaveBeenCalled();
    });

    it("calls callback x amount of times when an array of x actions is passed", async () => {
      const event2: WebhookEvent = {
        id: "123",
        name: "issues",
        payload: {
          action: "opened",
          installation: { id: 2 },
        },
      };

      const spy = jest.fn();
      app.on(["pull_request.opened", "issues.opened"], spy);

      await app.receive(event);
      await app.receive(event2);
      expect(spy.mock.calls.length).toEqual(2);
    });

    it("adds a logger on the context", async () => {
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

      app.on("pull_request", handler);
      await app.receive(event).catch(console.error);
      expect(handler).toHaveBeenCalled();
    });

    it("returns an authenticated client for installation.created", async () => {
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

      app.on("installation.created", async (context) => {
        await context.github.request("/");
      });

      await app.receive(event);

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("returns an unauthenticated client for installation.deleted", async () => {
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

      app.on("installation.deleted", async (context) => {
        await context.github.request("/");
      });

      await app.receive(event).catch(console.log);

      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("returns an authenticated client for events without an installation", async () => {
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

      app.on("check_run", async (context) => {
        await context.github.request("/");
      });

      await app.receive(event).catch(console.log);

      expect(mock.activeMocks()).toStrictEqual([]);
    });
  });

  describe("receive", () => {
    it("delivers the event", async () => {
      const spy = jest.fn();
      app.on("pull_request", spy);

      await app.receive(event);

      expect(spy).toHaveBeenCalled();
    });

    it("waits for async events to resolve", async () => {
      const spy = jest.fn();

      app.on("pull_request", () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            spy();
            resolve();
          }, 1);
        });
      });

      await app.receive(event);

      expect(spy).toHaveBeenCalled();
    });

    it("returns a reject errors thrown in apps", async () => {
      app.on("pull_request", () => {
        throw new Error("error from app");
      });

      try {
        await app.receive(event);
        throw new Error("expected error to be raised from app");
      } catch (err) {
        expect(err.message).toMatch(/error from app/);
      }
    });
  });

  describe("load", () => {
    it("loads one app", async () => {
      const spy = jest.fn();
      const myApp = (a: any) => a.on("pull_request", spy);

      app.load(myApp);
      await app.receive(event);
      expect(spy).toHaveBeenCalled();
    });

    it("loads multiple apps", async () => {
      const spy = jest.fn();
      const spy2 = jest.fn();
      const myApp = (a: any) => a.on("pull_request", spy);
      const myApp2 = (a: any) => a.on("pull_request", spy2);

      app.load([myApp, myApp2]);
      await app.receive(event);
      expect(spy).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });
  });

  describe("auth", () => {
    it("throttleOptions", async () => {
      const testApp = new Application({
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

      const result = await testApp.auth(1);
      expect(result.pluginLoaded).toEqual(true);
      result.test();
    });
  });

  describe("error handling", () => {
    let error: any;

    beforeEach(() => {
      error = new Error("testing");
      app.log.error = jest.fn() as any;
    });

    it("logs errors thrown from handlers", async () => {
      app.on("pull_request", () => {
        throw error;
      });

      try {
        await app.receive(event);
      } catch (err) {
        // Expected
      }

      expect(output.length).toBe(1);

      expect(output[0].err.message).toMatch(/testing/);
      expect(output[0].event.id).toEqual(event.id);
    });

    it("logs errors from rejected promises", async () => {
      app.on("pull_request", () => Promise.reject(error));

      try {
        await app.receive(event);
      } catch (err) {
        // Expected
      }

      expect(output.length).toBe(1);
      expect(output[0].err.message).toMatch(/testing/);
      expect(output[0].event.id).toEqual(event.id);
    });
  });
});
