import Stream from "node:stream";

import { pino } from "pino";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { Probot, Server } from "../../src/index.js";
import { defaultApp } from "../../src/apps/default.js";

describe("default app", () => {
  let output = [];

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, _encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  async function instantiateServer(cwd = process.cwd()) {
    output = [];
    const server = new Server({
      Probot: Probot.defaults({
        appId: 1,
        privateKey: "private key",
      }),
      log: pino(streamLogsToOutput),
      cwd,
    });

    await server.load(defaultApp);
    return server;
  }

  describe("GET /probot", () => {
    it("returns a 200 response", async () => {
      const server = await instantiateServer();
      return request(server.expressApp).get("/probot").expect(200);
    });

    describe("get info from package.json", () => {
      it("returns the correct HTML with values", async () => {
        const server = await instantiateServer();
        const actual = await request(server.expressApp)
          .get("/probot")
          .expect(200);
        expect(actual.text).toMatch("Welcome to probot");
        expect(actual.text).toMatch("A framework for building GitHub Apps");
        expect(actual.text).toMatch(/v\d+\.\d+\.\d+/);
        expect(actual.text).toMatchSnapshot();
      });

      it("returns the correct HTML without values", async () => {
        const server = await instantiateServer(__dirname);
        const actual = await request(server.expressApp)
          .get("/probot")
          .expect(200);
        expect(actual.text).toMatch("Welcome to your Probot App");
        expect(actual.text).toMatchSnapshot();
      });
    });
  });

  // Redirect does not work because webhooks middleware is using root path
  describe("GET /", () => {
    it("redirects to /probot", async () => {
      const server = await instantiateServer(__dirname);
      await request(server.expressApp)
        .get("/")
        .expect(302)
        .expect("location", "/probot");
    });
  });
});
