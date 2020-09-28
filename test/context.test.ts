import fs = require("fs");
import path = require("path");

import { WebhookEvent } from "@octokit/webhooks";
import nock from "nock";

import { Context } from "../src";
import { ProbotOctokit } from "../src/octokit/probot-octokit";

describe("Context", () => {
  let event: WebhookEvent;
  let context: Context;

  beforeEach(() => {
    event = {
      id: "123",
      name: "push",
      payload: {
        issue: { number: 4 },
        repository: {
          name: "probot",
          owner: { login: "bkeepers" },
        },
      },
    };

    context = new Context(event, {} as any, {} as any);
  });

  it("inherits the payload", () => {
    expect(context.payload).toBe(event.payload);
  });

  it("aliases the event name", () => {
    expect(context.name).toEqual("push");
    expect(context.event).toEqual("push");
  });

  describe("repo", () => {
    it("returns attributes from repository payload", () => {
      expect(context.repo()).toEqual({ owner: "bkeepers", repo: "probot" });
    });

    it("merges attributes", () => {
      expect(context.repo({ foo: 1, bar: 2 })).toEqual({
        bar: 2,
        foo: 1,
        owner: "bkeepers",
        repo: "probot",
      });
    });

    it("overrides repo attributes", () => {
      expect(context.repo({ owner: "muahaha" })).toEqual({
        owner: "muahaha",
        repo: "probot",
      });
    });

    // The `repository` object on the push event has a different format than the other events
    // https://developer.github.com/v3/activity/events/types/#pushevent
    it("properly handles the push event", () => {
      event.payload = require("./fixtures/webhook/push");

      context = new Context(event, {} as any, {} as any);
      expect(context.repo()).toEqual({ owner: "bkeepers-inc", repo: "test" });
    });

    it("return error for context.repo() when repository doesn't exist", () => {
      delete context.payload.repository;
      try {
        context.repo();
      } catch (e) {
        expect(e.message).toMatch("context.repo() is not supported");
      }
    });
  });

  describe("issue", () => {
    it("returns attributes from repository payload", () => {
      expect(context.issue()).toEqual({
        owner: "bkeepers",
        repo: "probot",
        issue_number: 4,
      });
    });

    it("merges attributes", () => {
      expect(context.issue({ foo: 1, bar: 2 })).toEqual({
        bar: 2,
        foo: 1,
        issue_number: 4,
        owner: "bkeepers",
        repo: "probot",
      });
    });

    it("overrides repo attributes", () => {
      expect(context.issue({ owner: "muahaha", issue_number: 5 })).toEqual({
        issue_number: 5,
        owner: "muahaha",
        repo: "probot",
      });
    });
  });

  describe("pullRequest", () => {
    it("returns attributes from repository payload", () => {
      expect(context.pullRequest()).toEqual({
        owner: "bkeepers",
        repo: "probot",
        pull_number: 4,
      });
    });

    it("merges attributes", () => {
      expect(context.pullRequest({ foo: 1, bar: 2 })).toEqual({
        bar: 2,
        foo: 1,
        owner: "bkeepers",
        pull_number: 4,
        repo: "probot",
      });
    });

    it("overrides repo attributes", () => {
      expect(context.pullRequest({ owner: "muahaha", pull_number: 5 })).toEqual(
        {
          owner: "muahaha",
          pull_number: 5,
          repo: "probot",
        }
      );
    });
  });

  describe("config", () => {
    let github: InstanceType<typeof ProbotOctokit>;

    function nockConfigResponseDataFile(fileName: string) {
      const configPath = path.join(__dirname, "fixtures", "config", fileName);
      return fs.readFileSync(configPath, { encoding: "utf8" });
    }

    beforeEach(() => {
      github = new ProbotOctokit({
        retry: { enabled: false },
        throttle: { enabled: false },
      });
      context = new Context(event, github, {} as any);
    });

    it("gets a valid configuration", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(200, nockConfigResponseDataFile("basic.yml"));

      const config = await context.config("test-file.yml");
      expect(config).toEqual({
        bar: 7,
        baz: 11,
        foo: 5,
      });
      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("returns null when the file and base repository are missing", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(404)
        .get("/repos/bkeepers/.github/contents/.github%2Ftest-file.yml")
        .reply(404);

      expect(await context.config("test-file.yml")).toBe(null);
      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("returns the default config when the file and base repository are missing and default config is passed", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(404)
        .get("/repos/bkeepers/.github/contents/.github%2Ftest-file.yml")
        .reply(404);

      const defaultConfig = {
        bar: 7,
        baz: 11,
        foo: 5,
      };
      const contents = await context.config("test-file.yml", defaultConfig);
      expect(contents).toEqual(defaultConfig);
      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("merges the default config", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(200, nockConfigResponseDataFile("basic.yml"));

      const config = await context.config("test-file.yml", { bar: 1, boa: 6 });
      expect(config).toEqual({
        bar: 7,
        baz: 11,
        boa: 6,
        foo: 5,
      });
      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("merges a base config", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(200, "boa: 6\nfoo: 0\n_extends: base")
        .get("/repos/bkeepers/base/contents/.github%2Ftest-file.yml")
        .reply(200, nockConfigResponseDataFile("basic.yml"));

      const config = await context.config("test-file.yml", { bar: 1, boa: 6 });

      expect(config).toEqual({
        bar: 7,
        baz: 11,
        boa: 6,
        foo: 0,
      });
      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("merges the base and default config", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(200, "boa: 6\nfoo: 0\n_extends: base")
        .get("/repos/bkeepers/base/contents/.github%2Ftest-file.yml")
        .reply(200, nockConfigResponseDataFile("basic.yml"));

      const config = await context.config("test-file.yml", {
        bar: 1,
        new: true,
      });
      expect(config).toEqual({
        bar: 7,
        baz: 11,
        boa: 6,
        foo: 0,
        new: true,
      });
      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("merges a base config from another organization", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(200, "boa: 6\nfoo: 0\n_extends: other/base")
        .get("/repos/other/base/contents/.github%2Ftest-file.yml")
        .reply(200, nockConfigResponseDataFile("basic.yml"));

      const config = await context.config("test-file.yml");

      expect(config).toEqual({
        bar: 7,
        baz: 11,
        boa: 6,
        foo: 0,
      });
      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("merges a base config with a custom path", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(200, "boa: 6\nfoo: 0\n_extends: base:test.yml")
        .get("/repos/bkeepers/base/contents/test.yml")
        .reply(200, nockConfigResponseDataFile("basic.yml"));

      const config = await context.config("test-file.yml");
      expect(config).toEqual({
        bar: 7,
        baz: 11,
        boa: 6,
        foo: 0,
      });
      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("ignores a missing base config", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(200, "boa: 6\nfoo: 0\n_extends: base")
        .get("/repos/bkeepers/base/contents/.github%2Ftest-file.yml")
        .reply(404);

      const config = await context.config("test-file.yml");

      expect(config).toEqual({
        boa: 6,
        foo: 0,
      });
      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("throws when the configuration file is malformed", async () => {
      expect.assertions(2);

      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(200, nockConfigResponseDataFile("malformed.yml"));

      try {
        await context.config("test-file.yml");
      } catch (error) {
        expect(error.message).toMatch(/invalid YAML/);
        expect(mock.activeMocks()).toStrictEqual([]);
      }
    });

    it("throws when loading unsafe yaml", async () => {
      expect.assertions(2);

      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(200, nockConfigResponseDataFile("evil.yml"));

      try {
        await context.config("test-file.yml");
      } catch (error) {
        expect(error.message).toMatch(/unsafe YAML/);
        expect(mock.activeMocks()).toStrictEqual([]);
      }
    });

    it("throws on a non-string base", async () => {
      expect.assertions(2);

      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(200, "boa: 6\nfoo: 0\n_extends: { nope }");

      try {
        await context.config("test-file.yml");
      } catch (error) {
        expect(error.message).toMatch(/invalid/i);
        expect(mock.activeMocks()).toStrictEqual([]);
      }
    });

    it("throws on an invalid base", async () => {
      expect.assertions(2);

      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(200, 'boa: 6\nfoo: 0\n_extends: "nope:"');

      try {
        await context.config("test-file.yml");
      } catch (error) {
        expect(error.message).toMatch(/nope:/);
        expect(mock.activeMocks()).toStrictEqual([]);
      }
    });

    it("returns an empty object when the file is empty", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(200, nockConfigResponseDataFile("empty.yml"));

      const contents = await context.config("test-file.yml");

      expect(contents).toEqual({});
      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("overwrites default config settings", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(200, nockConfigResponseDataFile("basic.yml"));

      const config = await context.config("test-file.yml", { foo: 10 });

      expect(config).toEqual({
        bar: 7,
        baz: 11,
        foo: 5,
      });
      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("uses default settings to fill in missing options", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(200, nockConfigResponseDataFile("basic.yml"));

      const config = await context.config("test-file.yml", { bar: 7 });

      expect(config).toEqual({
        bar: 7,
        baz: 11,
        foo: 5,
      });
      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("uses the .github directory on a .github repo", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(200, "foo: foo\n_extends: .github")
        .get("/repos/bkeepers/.github/contents/.github%2Ftest-file.yml")
        .reply(200, nockConfigResponseDataFile("basic.yml"));

      const config = await context.config("test-file.yml");

      expect(config).toEqual({
        bar: 7,
        baz: 11,
        foo: "foo",
      });
      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("defaults to .github repo if no config found", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(404)
        .get("/repos/bkeepers/.github/contents/.github%2Ftest-file.yml")
        .reply(200, nockConfigResponseDataFile("basic.yml"));

      const config = await context.config("test-file.yml");

      expect(config).toEqual({
        bar: 7,
        baz: 11,
        foo: 5,
      });
      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("deep merges the base config", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(200, "obj:\n  foo:\n  - name: master\n_extends: .github")
        .get("/repos/bkeepers/.github/contents/.github%2Ftest-file.yml")
        .reply(200, "obj:\n  foo:\n  - name: develop");

      const config = await context.config("test-file.yml");

      expect(config).toEqual({
        obj: {
          foo: [{ name: "develop" }, { name: "master" }],
        },
      });
      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("accepts deepmerge options", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/bkeepers/probot/contents/.github%2Ftest-file.yml")
        .reply(
          200,
          "foo:\n  - name: master\n    shouldChange: changed\n_extends: .github"
        )
        .get("/repos/bkeepers/.github/contents/.github%2Ftest-file.yml")
        .reply(
          200,
          "foo:\n  - name: develop\n  - name: master\n    shouldChange: should"
        );

      const customMerge = jest.fn(
        (_target: any[], _source: any[], _options: any): any[] => []
      );
      await context.config("test-file.yml", {}, { arrayMerge: customMerge });
      expect(customMerge).toHaveBeenCalled();
      expect(mock.activeMocks()).toStrictEqual([]);
    });
  });

  describe("isBot", () => {
    test("returns true if sender is a bot", () => {
      event.payload.sender = { type: "Bot" };
      context = new Context(event, {} as any, {} as any);

      expect(context.isBot).toBe(true);
    });

    test("returns false if sender is not a bot", () => {
      event.payload.sender = { type: "User" };
      context = new Context(event, {} as any, {} as any);

      expect(context.isBot).toBe(false);
    });
  });
});
