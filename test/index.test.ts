const request = require("supertest");
const nock = require("nock");
const helper = require("./apps/helper");
//Commented out for code to run
//const Probot  = require("../lib");
//const resolveAny = require("dns");
//const create  = require("domain");
import { createProbot } from "../src";

describe("Probot", () => {
  let probot: any;
  let event: any;

  beforeEach(function() {
    probot = createProbot({ githubToken: "faketoken" });

    event = {
      name: "push",
      payload: require("./fixtures/webhook/push")
    };
  });

  it("constructor", () => {
    // probot with token. Should not throw
    createProbot({ githubToken: "faketoken" });
    createProbot({ githubToken: "faketoken" });
    // probot with id/cert
    createProbot({ id: 1234, cert: "xxxx" });
  });

  describe("webhook delivery", () => {
    it("forwards webhooks to the app", async function() {
      const app = probot.load(() => {});
      app.receive = jest.fn();
      await probot.webhook.receive(event);
      expect(app.receive).toHaveBeenCalledWith(event);
    });

    it("responds with the correct error if webhook secret does not match", async function() {
      probot.logger.error = jest.fn();
      probot.webhook.on("push", () => {
        throw new Error("X-Hub-Signature does not match blob signature");
      });

      try {
        await probot.webhook.receive(event);
      } catch (e) {
        expect(probot.logger.error.mock.calls[0]).toMatchSnapshot();
      }
    });

    it("responds with the correct error if webhook secret is not found", async function() {
      probot.logger.error = jest.fn();
      probot.webhook.on("push", () => {
        throw new Error("No X-Hub-Signature found on request");
      });

      try {
        await probot.webhook.receive(event);
      } catch (e) {
        expect(probot.logger.error.mock.calls[0]).toMatchSnapshot();
      }
    });

    it("responds with the correct error if webhook secret is wrong", async function() {
      probot.logger.error = jest.fn();
      probot.webhook.on("push", () => {
        throw new Error(
          "webhooks:receiver ignored: POST / due to missing headers: x-hub-signature"
        );
      });

      try {
        await probot.webhook.receive(event);
      } catch (e) {
        expect(probot.logger.error.mock.calls[0]).toMatchSnapshot();
      }
    });

    it("responds with the correct error if the PEM file is missing", async () => {
      probot.logger.error = jest.fn();
      probot.webhook.on("*", () => {
        throw new Error(
          "error:0906D06C:PEM routines:PEM_read_bio:no start line"
        );
      });

      try {
        await probot.webhook.receive(event);
      } catch (e) {
        expect(probot.logger.error.mock.calls[0]).toMatchSnapshot();
      }
    });

    it("responds with the correct error if the jwt could not be decoded", async () => {
      probot.logger.error = jest.fn();
      probot.webhook.on("*", () => {
        throw new Error(
          '{"message":"A JSON web token could not be decoded","documentation_url":"https://developer.github.com/v3"}'
        );
      });

      try {
        await probot.webhook.receive(event);
      } catch (e) {
        expect(probot.logger.error.mock.calls[0]).toMatchSnapshot();
      }
    });
  });

  describe("server", () => {
    it("prefixes paths with route name", function() {
      probot.load(function(app: any) {
        const route = app.route("/my-app");
        route.get("/foo", function(req: any, res: any) {
          res.end("foo");
        });
      });

      return request(probot.server)
        .get("/my-app/foo")
        .expect(200, "foo");
    });

    it("allows routes with no path", () => {
      probot.load(function(app: any) {
        const route = app.route();
        route.get("/foo", function(req: any, res: any) {
          res.end("foo");
        });
      });

      return request(probot.server)
        .get("/foo")
        .expect(200, "foo");
    });

    it("allows you to overwrite the root path", () => {
      probot.load(function(app: any) {
        const route = app.route();
        route.get("/", function(req: any, res: any) {
          res.end("foo");
        });
      });

      return request(probot.server)
        .get("/")
        .expect(200, "foo");
    });

    it("isolates apps from affecting eachother", async () => {
      ["foo", "bar"].forEach(name => {
        probot.load(function(app: any) {
          const route = app.route("/" + name);

          route.use(function(req: any, res: any, next: any) {
            res.append("X-Test", name);
            next();
          });

          route.get("/hello", (req: any, res: any) => res.end(name));
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
      probot = createProbot({
        webhookPath: "/webhook",
        githubToken: "faketoken"
      });
      // Error handler to avoid printing logs
      // eslint-disable-next-line handle-callback-err
      probot.server.use((err: any, req: any, res: any, next: any) => {});

      probot.load(function(app: any) {
        const route = app.route();
        route.get("/webhook", function(req: any, res: any) {
          res.end("get-webhook");
        });
        route.post("/webhook", function(req: any, res: any) {
          res.end("post-webhook");
        });
      });

      // GET requests should succeed
      await request(probot.server)
        .get("/webhook")
        .expect(200, "get-webhook");

      // POST requests should fail b/c webhook path has precedence
      await request(probot.server)
        .post("/webhook")
        .expect(400);
    });

    it("defaults webhook path to `/`", async function() {
      // Error handler to avoid printing logs
      // eslint-disable-next-line handle-callback-err
      probot.server.use((err: any, req: any, res: any, next: any) => {});

      // POST requests to `/` should 400 b/c webhook signature will fail
      await request(probot.server)
        .post("/")
        .expect(400);
    });

    it("responds with 500 on error", async function() {
      probot.server.get("/boom", () => {
        throw new Error("boom");
      });

      await request(probot.server)
        .get("/boom")
        .expect(500);
    });

    it("responds with 500 on async error", async function() {
      probot.server.get("/boom", () => {
        return Promise.reject(new Error("boom"));
      });

      await request(probot.server)
        .get("/boom")
        .expect(500);
    });
  });

  describe("receive", () => {
    it("forwards events to each app", async function() {
      const spy = jest.fn();
      const app = probot.load(function(app: any) {
        app.on("push", spy);
      });
      app.auth = jest.fn().mockReturnValue(Promise.resolve({}));

      await probot.receive(event);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe("ghe support", function() {
    let app: any;

    beforeEach(() => {
      process.env.GHE_HOST = "notreallygithub.com";

      nock("https://notreallygithub.com/api/v3")
        .defaultReplyHeaders({ "Content-Type": "application/json" })
        .get("/app/installations")
        .reply(200, ["I work!"]);

      app = helper.createApp();
    });

    afterEach(() => {
      delete process.env.GHE_HOST;
    });

    it("requests from the correct API URL", async () => {
      const spy = jest.fn();

      const appFn = async function(app: any) {
        const github = await app.auth();
        const res = await github.apps.getInstallations({});
        return spy(res);
      };

      await appFn(app);
      await app.receive(event);
      expect(spy.mock.calls[0][0].data[0]).toBe("I work!");
    });

    it("throws if the GHE host includes a protocol", async () => {
      process.env.GHE_HOST = "https://notreallygithub.com";

      try {
        await app.auth();
      } catch (e) {
        expect(e).toMatchSnapshot();
      }
    });
  });
});
