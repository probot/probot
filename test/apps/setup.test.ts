const createChannel = jest.fn().mockResolvedValue("mocked proxy URL");
const updateDotenv = jest.fn().mockResolvedValue({});
jest.mock("smee-client", () => ({ createChannel }));
jest.mock("update-dotenv", () => updateDotenv);

import nock from "nock";
import request from "supertest";
import { Probot } from "../../src";
import { setupApp } from "../../src/apps/setup";

describe("Setup app", () => {
  let probot: Probot;

  beforeEach(async () => {
    delete process.env.WEBHOOK_PROXY_URL;
    probot = new Probot({});
    probot.load(setupApp);

    // there is currently no way to await probot.load, so we do hacky hack hack
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /probot", () => {
    it("returns a 200 response", async () => {
      await request(probot.server).get("/probot").expect(200);
    });
  });

  describe("GET /probot/setup", () => {
    it("returns a redirect", async () => {
      nock("https://api.github.com")
        .post("/app-manifests/123/conversions")
        .reply(201, {
          html_url: "/apps/my-app",
          id: "id",
          pem: "pem",
          webhook_secret: "webhook_secret",
        });

      await request(probot.server)
        .get("/probot/setup")
        .query({ code: "123" })
        .expect(302)
        .expect("Location", "/apps/my-app/installations/new");

      expect(createChannel).toHaveBeenCalledTimes(1);
      expect(updateDotenv.mock.calls).toMatchSnapshot();
    });
  });

  describe("GET /probot/success", () => {
    it("returns a 200 response", async () => {
      await request(probot.server).get("/probot/success").expect(200);

      expect(createChannel).toHaveBeenCalledTimes(1);
    });
  });
});
