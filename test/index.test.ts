import { EventNames } from "@octokit/webhooks";
import Bottleneck from "bottleneck";
import { NextFunction, Request, Response } from "express";
import request = require("supertest");

import { Application, Probot } from "../src";
import { ProbotOctokit } from "../src/octokit/probot-octokit";

import path = require("path");

const id = 1;
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
    name: EventNames.StringNames;
    payload: any;
  };

  beforeEach(() => {
    // process.env.DISABLE_WEBHOOK_EVENT_CHECK = "true";
    probot = new Probot({ githubToken: "faketoken" });

    event = {
      id: "0",
      name: "push",
      payload: require("./fixtures/webhook/push"),
    };
  });

  it("constructor", () => {
    // probot with token. Should not throw
    new Probot({ githubToken: "faketoken" });

    // probot with id/privateKey
    new Probot({ id, privateKey });
  });

  describe("run", () => {
    let env: NodeJS.ProcessEnv;

    beforeAll(() => {
      env = { ...process.env };
      process.env.APP_ID = "1";
      process.env.PRIVATE_KEY_PATH = path.join(
        __dirname,
        "test-private-key.pem"
      );
      process.env.WEBHOOK_PROXY_URL = "https://smee.io/EfHXC9BFfGAxbM6J";
      process.env.WEBHOOK_SECRET = "secret";
    });

    afterAll(() => {
      process.env = env;
    });

    it("runs with a function as argument", async () => {
      process.env.PORT = "3003";
      let initialized = false;
      probot = await Probot.run((app) => {
        initialized = true;
      });
      expect(probot.options).toMatchSnapshot();
      expect(initialized).toBeTruthy();
      probot.stop();
    });

    it("runs with an array of strings", async () => {
      probot = await Probot.run(["run", "file.js"]);
      expect(probot.options).toMatchSnapshot();
      probot.stop();
    });

    it("runs without config and loads the setup app", async () => {
      let initialized = false;
      delete process.env.PRIVATE_KEY_PATH;
      probot = await Probot.run((app) => {
        initialized = true;
      });
      expect(probot.options).toMatchSnapshot();
      expect(initialized).toBeFalsy();
      probot.stop();
    });
  });

  describe("webhook delivery", () => {
    it("responds with the correct error if webhook secret does not match", async () => {
      probot.logger.error = jest.fn();
      probot.webhooks.on("push", () => {
        throw new Error("X-Hub-Signature does not match blob signature");
      });

      try {
        await probot.webhooks.receive(event);
      } catch (e) {
        const [error] = Array.from(
          (probot.logger.error as jest.Mock).mock.calls[0][0].err
        ) as Error[];
        expect(error.message).toMatchSnapshot();
      }
    });

    it("responds with the correct error if webhook secret is not found", async () => {
      probot.logger.error = jest.fn();
      probot.webhooks.on("push", () => {
        throw new Error("No X-Hub-Signature found on request");
      });

      try {
        await probot.webhooks.receive(event);
      } catch (e) {
        const [error] = Array.from(
          (probot.logger.error as jest.Mock).mock.calls[0][0].err
        ) as Error[];
        expect(error.message).toMatchSnapshot();
      }
    });

    it("responds with the correct error if webhook secret is wrong", async () => {
      probot.logger.error = jest.fn();
      probot.webhooks.on("push", () => {
        throw new Error(
          "webhooks:receiver ignored: POST / due to missing headers: x-hub-signature"
        );
      });

      try {
        await probot.webhooks.receive(event);
      } catch (e) {
        const [error] = Array.from(
          (probot.logger.error as jest.Mock).mock.calls[0][0].err
        ) as Error[];
        expect(error.message).toMatchSnapshot();
      }
    });

    it("responds with the correct error if the PEM file is missing", async () => {
      probot.logger.error = jest.fn();
      probot.webhooks.on("*", () => {
        throw new Error(
          "error:0906D06C:PEM routines:PEM_read_bio:no start line"
        );
      });

      try {
        await probot.webhooks.receive(event);
      } catch (e) {
        const [error] = Array.from(
          (probot.logger.error as jest.Mock).mock.calls[0][0].err
        ) as Error[];
        expect(error.message).toMatchSnapshot();
      }
    });

    it("responds with the correct error if the jwt could not be decoded", async () => {
      probot.logger.error = jest.fn();
      probot.webhooks.on("*", () => {
        throw new Error(
          '{"message":"A JSON web token could not be decoded","documentation_url":"https://developer.github.com/v3"}'
        );
      });

      try {
        await probot.webhooks.receive(event);
      } catch (e) {
        const [error] = Array.from(
          (probot.logger.error as jest.Mock).mock.calls[0][0].err
        ) as Error[];
        expect(error.message).toMatchSnapshot();
      }
    });
  });

  describe("server", () => {
    it("prefixes paths with route name", () => {
      probot.load((app) => {
        const route = app.route("/my-app");
        route.get("/foo", (req, res) => res.end("foo"));
      });

      return request(probot.server).get("/my-app/foo").expect(200, "foo");
    });

    it("allows routes with no path", () => {
      probot.load((app) => {
        const route = app.route();
        route.get("/foo", (req, res) => res.end("foo"));
      });

      return request(probot.server).get("/foo").expect(200, "foo");
    });

    it("allows you to overwrite the root path", () => {
      probot.load((app) => {
        const route = app.route();
        route.get("/", (req, res) => res.end("foo"));
      });

      return request(probot.server).get("/").expect(200, "foo");
    });

    it("isolates apps from affecting eachother", async () => {
      ["foo", "bar"].forEach((name) => {
        probot.load((app) => {
          const route = app.route("/" + name);

          route.use((req, res, next) => {
            res.append("X-Test", name);
            next();
          });

          route.get("/hello", (req, res) => res.end(name));
        });
      });

      await request(probot.server)
        .get("/foo/hello")
        .expect(200, "foo")
        .expect("X-Test", "foo");

      await request(probot.server)
        .get("/bar/hello")
        .expect(200, "bar")
        .expect("X-Test", "bar");
    });

    it("allows users to configure webhook paths", async () => {
      probot = new Probot({
        webhookPath: "/webhook",
        githubToken: "faketoken",
      });
      // Error handler to avoid printing logs
      // tslint:disable-next-line handle-callback-err
      probot.server.use(
        (err: any, req: Request, res: Response, next: NextFunction) => {}
      );

      probot.load((app) => {
        const route = app.route();
        route.get("/webhook", (req, res) => res.end("get-webhook"));
        route.post("/webhook", (req, res) => res.end("post-webhook"));
      });

      // GET requests should succeed
      await request(probot.server).get("/webhook").expect(200, "get-webhook");

      // POST requests should fail b/c webhook path has precedence
      await request(probot.server).post("/webhook").expect(400);
    });

    it("defaults webhook path to `/`", async () => {
      // Error handler to avoid printing logs
      // tslint:disable-next-line handle-callback-err
      probot.server.use(
        (err: any, req: Request, res: Response, next: NextFunction) => {}
      );

      // POST requests to `/` should 400 b/c webhook signature will fail
      await request(probot.server).post("/").expect(400);
    });

    it("responds with 500 on error", async () => {
      probot.server.get("/boom", () => {
        throw new Error("boom");
      });

      await request(probot.server).get("/boom").expect(500);
    });

    it("responds with 500 on async error", async () => {
      probot.server.get("/boom", () => {
        return Promise.reject(new Error("boom"));
      });

      await request(probot.server).get("/boom").expect(500);
    });
  });

  describe("receive", () => {
    it("forwards events to each app", async () => {
      const spy = jest.fn();

      probot.load((app) => app.on("push", spy));

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
      const appFn = async (appl: Application) => {
        const github = await appl.auth();
        expect(github.request.endpoint.DEFAULTS.baseUrl).toEqual(
          "https://notreallygithub.com/api/v3"
        );
      };

      new Probot({}).load(appFn);
    });

    it("throws if the GHE host includes a protocol", async () => {
      process.env.GHE_HOST = "https://notreallygithub.com";

      try {
        new Probot({ id, privateKey });
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
      const appFn = async (appl: Application) => {
        const github = await appl.auth();
        expect(github.request.endpoint.DEFAULTS.baseUrl).toEqual(
          "http://notreallygithub.com/api/v3"
        );
      };

      new Probot({}).load(appFn);
    });

    it("throws if the GHE host includes a protocol", async () => {
      process.env.GHE_HOST = "http://notreallygithub.com";

      try {
        new Probot({ id, privateKey });
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
  });

  describe("process.env.REDIS_URL", () => {
    beforeEach(() => {
      process.env.REDIS_URL = "test";
    });

    afterEach(() => {
      delete process.env.REDIS_URL;
    });

    it("sets throttleOptions", async () => {
      probot = new Probot({
        webhookPath: "/webhook",
        githubToken: "faketoken",
      });

      expect(probot.throttleOptions.Bottleneck).toBe(Bottleneck);
      expect(probot.throttleOptions.connection).toBeInstanceOf(
        Bottleneck.IORedisConnection
      );
    });
  });

  describe("redis configuration object", () => {
    it("sets throttleOptions", async () => {
      const redisConfig = {
        host: "test",
      };
      probot = new Probot({
        webhookPath: "/webhook",
        githubToken: "faketoken",
        redisConfig,
      });

      expect(probot.throttleOptions.Bottleneck).toBe(Bottleneck);
      expect(probot.throttleOptions.connection).toBeInstanceOf(
        Bottleneck.IORedisConnection
      );
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

  describe("start", () => {
    beforeEach(() => {
      process.exit = jest.fn() as any; // we dont want to terminate the test
    });
    it("should expect the correct error if port already in use", (next) => {
      expect.assertions(2);

      // block port 3001
      const http = require("http");
      const blockade = http.createServer().listen(3001, () => {
        const testApp = new Probot({ port: 3001 });
        testApp.logger.error = jest.fn();

        const server = testApp.start().addListener("error", () => {
          expect(testApp.logger.error).toHaveBeenCalledWith(
            "Port 3001 is already in use. You can define the PORT environment variable to use a different port."
          );
          expect(process.exit).toHaveBeenCalledWith(1);
          server.close(() => blockade.close(() => next()));
        });
      });
    });

    it("should listen to port when not in use", (next) => {
      expect.assertions(1);
      const testApp = new Probot({ port: 3001, webhookProxy: undefined });
      testApp.logger.info = jest.fn();
      const server = testApp.start().on("listening", () => {
        expect(testApp.logger.info).toHaveBeenCalledWith(
          "Listening on http://localhost:3001"
        );
        server.close(() => next());
      });
    });
  });
});
