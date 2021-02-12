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
    // https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#push
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
    let octokit: InstanceType<typeof ProbotOctokit>;

    function nockConfigResponseDataFile(fileName: string) {
      const configPath = path.join(__dirname, "fixtures", "config", fileName);
      return fs.readFileSync(configPath, { encoding: "utf8" });
    }

    beforeEach(() => {
      octokit = new ProbotOctokit({
        retry: { enabled: false },
        throttle: { enabled: false },
      });
      context = new Context(event, octokit, {} as any);
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
