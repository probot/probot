import Stream from "stream";

import pino from "pino";
import request from "supertest";

import { Probot, Server } from "../../src";
import { defaultApp } from "../../src/apps/default";

describe("default app", () => {
  let server: Server;
  let output: any;

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  beforeEach(async () => {
    output = [];
    server = new Server({
      Probot: Probot.defaults({
        appId: 1,
        privateKey: "private key",
      }),
      log: pino(streamLogsToOutput),
    });

    await server.load(defaultApp);
  });

  describe("GET /probot", () => {
    it("returns a 200 response", () => {
      return request(server.expressApp).get("/probot").expect(200);
    });

    describe("get info from package.json", () => {
      let cwd: string;
      beforeEach(() => {
        cwd = process.cwd();
      });

      it("returns the correct HTML with values", async () => {
        const actual = await request(server.expressApp)
          .get("/probot")
          .expect(200);
        expect(actual.text).toMatch("Welcome to probot");
        expect(actual.text).toMatch("A framework for building GitHub Apps");
        expect(actual.text).toMatch(/v\d+\.\d+\.\d+/);
      });

      it("returns the correct HTML without values", async () => {
        process.chdir(__dirname);
        const actual = await request(server.expressApp)
          .get("/probot")
          .expect(200);
        expect(actual.text).toMatch("Welcome to your Probot App");
      });

      afterEach(() => {
        process.chdir(cwd);
      });
    });
  });

  describe("GET /", () => {
    it("redirects to /probot", () => {
      return request(server.expressApp)
        .get("/")
        .expect(302)
        .expect("location", "/probot");
    });
  });
});
