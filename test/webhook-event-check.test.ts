import nock from "nock";
import { Probot } from "../src";

const id = 1;
const cert = `-----BEGIN RSA PRIVATE KEY-----
MIIBOQIBAAJBAIILhiN9IFpaE0pUXsesuuoaj6eeDiAqCiE49WB1tMB8ZMhC37kY
Fl52NUYbUxb7JEf6pH5H9vqw1Wp69u78XeUCAwEAAQJAb88urnaXiXdmnIK71tuo
/TyHBKt9I6Rhfzz0o9Gv7coL7a537FVDvV5UCARXHJMF41tKwj+zlt9EEUw7a1HY
wQIhAL4F/VHWSPHeTgXYf4EaX2OlpSOk/n7lsFtL/6bWRzRVAiEArzJs2vopJitv
A1yBjz3q2nX+zthk+GLXrJQkYOnIk1ECIHfeFV8TWm5gej1LxZquBTA5pINoqDVq
NKZSuZEHqGEFAiB6EDrxkovq8SYGhIQsJeqkTMO8n94xhMRZlFmIQDokEQIgAq5U
r1UQNnUExRh7ZT0kFbMfO9jKYZVlQdCL9Dn93vo=
-----END RSA PRIVATE KEY-----`;

// tslint:disable-next-line
const noop = async () => {};

/**
 * Returns a mocked request for `/meta` with the subscribed `events`.
 *
 * By default, the mocked payload indicates the a GitHub App is subscribed to
 * the `issues` event.
 */
function mockAppMetaRequest(events: string[] = ["issues"]) {
  return { events };
}

jest.setTimeout(10000);

describe("webhook-event-check", () => {
  let originalNodeEnv: string;
  let originalJestWorkerId: string | undefined;

  beforeAll(() => {
    originalNodeEnv = process.env.NODE_ENV || "test";
    originalJestWorkerId = process.env.JEST_WORKER_ID;
  });

  beforeEach(() => {
    // We need to re-configure environment variables to avoid
    // webhook-event-check from triggering its smart-disable feature.
    delete process.env.DISABLE_WEBHOOK_EVENT_CHECK;
    delete process.env.JEST_WORKER_ID;
    process.env.NODE_ENV = "development";
    nock.cleanAll();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.JEST_WORKER_ID = originalJestWorkerId;
  });

  test("caches result of /app, logs error for event that the app is not subscribed to", async () => {
    nock("https://api.github.com")
      .get("/app")
      .reply(200, mockAppMetaRequest(["label", "star"]));

    const probot = new Probot({ id, cert });

    let spyOnLogError;
    probot.load(async (app) => {
      spyOnLogError = jest.spyOn(app.log, "error");

      app.on("label.edited", noop);
      app.on("label.deleted", noop);
      app.on("team.created", noop);
    });

    // let's give the event check a moment to send its request
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(spyOnLogError).toHaveBeenCalledTimes(1);
    expect(spyOnLogError).toMatchSnapshot();
  });

  test('logs no error when listening to special "*" event', async () => {
    nock("https://api.github.com")
      .get("/app")
      .reply(200, mockAppMetaRequest([]));

    const probot = new Probot({ id, cert });
    let spyOnLogError;

    probot.load(async (app) => {
      spyOnLogError = jest.spyOn(app.log, "error");

      app.on("*", noop);
    });

    // let's give the event check a moment to send its request
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(spyOnLogError).not.toHaveBeenCalled();
  });

  describe("warn user when", () => {
    test("listening to unsubscribed event", async () => {
      nock("https://api.github.com")
        .defaultReplyHeaders({ "Content-Type": "application/json" })
        .get("/app")
        .reply(200, mockAppMetaRequest());

      const probot = new Probot({ id, cert });
      let spyOnLogError;

      probot.load(async (app) => {
        spyOnLogError = jest.spyOn(app.log, "error");

        app.on("pull_request.opened", noop);
      });

      // let's give the event check a moment to send its request
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(spyOnLogError).toHaveBeenCalledTimes(1);
      expect(spyOnLogError).toMatchSnapshot();
    });

    test("unable to retrieve app metadata", async () => {
      nock("https://api.github.com")
        .defaultReplyHeaders({ "Content-Type": "application/json" })
        .get("/app")
        .reply(404);

      const probot = new Probot({ id, cert });
      let spyOnLogError;

      probot.load(async (app) => {
        spyOnLogError = jest.spyOn(app.log, "error");

        app.on("pull_request.opened", noop);
      });

      // let's give the event check a moment to send its request
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(spyOnLogError).toHaveBeenCalledTimes(1);
      expect(spyOnLogError).toMatchSnapshot();
    });
  });

  describe("can be disabled", () => {
    beforeEach(() => {
      delete process.env.DISABLE_WEBHOOK_EVENT_CHECK;
      delete process.env.JEST_WORKER_ID;
      delete process.env.NODE_ENV;
    });

    test("when JEST_WORKER_ID is set", async () => {
      process.env.JEST_WORKER_ID = "mocked_id";

      const probot = new Probot({ id, cert });
      let spyOnLogError;

      probot.load(async (app) => {
        spyOnLogError = jest.spyOn(app.log, "error");
        app.on("pull_request.opened", noop);
      });

      // let's give probot setup a moment
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(spyOnLogError).not.toHaveBeenCalled();
    });

    test("when DISABLE_WEBHOOK_EVENT_CHECK is true", async () => {
      process.env.DISABLE_WEBHOOK_EVENT_CHECK = "true";

      const probot = new Probot({ id, cert });
      let spyOnLogError;

      probot.load(async (app) => {
        spyOnLogError = jest.spyOn(app.log, "error");
        app.on("pull_request.opened", noop);
      });

      // let's give probot setup a moment
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(spyOnLogError).not.toHaveBeenCalled();
    });

    test("when NODE_ENV is production", async () => {
      process.env.NODE_ENV = "production";

      const probot = new Probot({ id, cert });
      let spyOnLogError;

      probot.load(async (app) => {
        spyOnLogError = jest.spyOn(app.log, "error");
        app.on("pull_request.opened", noop);
      });

      // let's give probot setup a moment
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(spyOnLogError).not.toHaveBeenCalled();
    });

    test('when NODE_ENV starts with "test"', async () => {
      process.env.NODE_ENV = "testing";

      const probot = new Probot({ id, cert });
      let spyOnLogError;

      probot.load(async (app) => {
        spyOnLogError = jest.spyOn(app.log, "error");
        app.on("pull_request.opened", noop);
      });

      // let's give probot setup a moment
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(spyOnLogError).not.toHaveBeenCalled();
    });
  });
});
