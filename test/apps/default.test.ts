import request from "supertest";
import { Probot } from "../../src";
import defaultApp = require("../../src/apps/default");

describe("default app", () => {
  let probot: Probot;

  beforeEach(async () => {
    probot = new Probot({
      id: 1,
      privateKey: "private key",
    });
    probot.load(defaultApp);

    // there is currently no way to await probot.load, so we do hacky hack hack
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe("GET /probot", () => {
    it("returns a 200 response", () => {
      return request(probot.server).get("/probot").expect(200);
    });

    describe("get info from package.json", () => {
      let cwd: string;
      beforeEach(() => {
        cwd = process.cwd();
      });

      it("returns the correct HTML with values", async () => {
        const actual = await request(probot.server).get("/probot").expect(200);
        expect(actual.text).toMatch("Welcome to probot");
        expect(actual.text).toMatch("A framework for building GitHub Apps");
        expect(actual.text).toMatch(/v\d+\.\d+\.\d+/);
      });

      it("returns the correct HTML without values", async () => {
        process.chdir(__dirname);
        const actual = await request(probot.server).get("/probot").expect(200);
        expect(actual.text).toMatch("Welcome to your Probot App");
      });

      afterEach(() => {
        process.chdir(cwd);
      });
    });
  });

  describe("GET /", () => {
    it("redirects to /probot", () => {
      return request(probot.server)
        .get("/")
        .expect(302)
        .expect("location", "/probot");
    });
  });
});
