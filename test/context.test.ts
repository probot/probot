import fs = require("fs");
import path = require("path");

import { EmitterWebhookEvent as WebhookEvent } from "@octokit/webhooks";
import WebhookExamples, { WebhookDefinition } from "@octokit/webhooks-examples";
import nock from "nock";

import { Context } from "../src";
import { ProbotOctokit } from "../src/octokit/probot-octokit";
import { PushEvent } from "@octokit/webhooks-types";

const pushEventPayload = (
  WebhookExamples.filter(
    (event) => event.name === "push"
  )[0] as WebhookDefinition<"push">
).examples[0];
const issuesEventPayload = (
  WebhookExamples.filter(
    (event) => event.name === "issues"
  )[0] as WebhookDefinition<"issues">
).examples[0];
const pullRequestEventPayload = (
  WebhookExamples.filter(
    (event) => event.name === "pull_request"
  )[0] as WebhookDefinition<"pull_request">
).examples[0];

describe("Context", () => {
  let event: WebhookEvent<"push"> = {
    id: "0",
    name: "push",
    payload: pushEventPayload,
  };
  let context: Context<"push"> = new Context<"push">(
    event,
    {} as any,
    {} as any
  );

  it("inherits the payload", () => {
    expect(context.payload).toBe(event.payload);
  });

  describe("repo", () => {
    let event: WebhookEvent<"push">;
    let context: Context<"push">;
    beforeEach(() => {
      event = {
        id: "123",
        name: "push",
        payload: pushEventPayload,
      };

      context = new Context<"push">(event, {} as any, {} as any);
    });

    it("returns attributes from repository payload", () => {
      expect(context.repo()).toEqual({
        owner: "Codertocat",
        repo: "Hello-World",
      });
    });

    it("merges attributes", () => {
      expect(context.repo({ foo: 1, bar: 2 })).toEqual({
        bar: 2,
        foo: 1,
        owner: "Codertocat",
        repo: "Hello-World",
      });
    });

    it("overrides repo attributes", () => {
      expect(context.repo({ owner: "muahaha" })).toEqual({
        owner: "muahaha",
        repo: "Hello-World",
      });
    });

    // The `repository` object on the push event has a different format than the other events
    // https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#push
    it("properly handles the push event", () => {
      event.payload = require("./fixtures/webhook/push") as PushEvent;

      context = new Context<"push">(event, {} as any, {} as any);
      expect(context.repo()).toEqual({ owner: "bkeepers-inc", repo: "test" });
    });

    it("return error for context.repo() when repository doesn't exist", () => {
      event = {
        id: "123",
        name: "push",
        payload: { ...pushEventPayload, repository: undefined as any },
      };

      context = new Context<"push">(event, {} as any, {} as any);
      try {
        context.repo();
      } catch (e) {
        expect(e.message).toMatch(
          "context.repo() is not supported for this webhook event."
        );
      }
    });
  });

  describe("issue", () => {
    let event: WebhookEvent<"issues">;
    let context: Context<"issues">;
    beforeEach(() => {
      event = {
        id: "123",
        name: "issues",
        payload: issuesEventPayload,
      };

      context = new Context<"issues">(event, {} as any, {} as any);
    });
    it("returns attributes from repository payload", () => {
      expect(context.issue()).toEqual({
        owner: "Codertocat",
        repo: "Hello-World",
        issue_number: 1,
      });
    });

    it("merges attributes", () => {
      expect(context.issue({ foo: 1, bar: 2 })).toEqual({
        bar: 2,
        foo: 1,
        issue_number: 1,
        owner: "Codertocat",
        repo: "Hello-World",
      });
    });

    it("overrides repo attributes", () => {
      expect(context.issue({ owner: "muahaha", issue_number: 5 })).toEqual({
        issue_number: 5,
        owner: "muahaha",
        repo: "Hello-World",
      });
    });
  });

  describe("pullRequest", () => {
    let event: WebhookEvent<"pull_request">;
    let context: Context<"pull_request">;
    beforeEach(() => {
      event = {
        id: "123",
        name: "pull_request",
        payload: pullRequestEventPayload,
      };

      context = new Context<"pull_request">(event, {} as any, {} as any);
    });
    it("returns attributes from repository payload", () => {
      expect(context.pullRequest()).toEqual({
        owner: "Codertocat",
        repo: "Hello-World",
        pull_number: 2,
      });
    });

    it("merges attributes", () => {
      expect(context.pullRequest({ foo: 1, bar: 2 })).toEqual({
        bar: 2,
        foo: 1,
        owner: "Codertocat",
        pull_number: 2,
        repo: "Hello-World",
      });
    });

    it("overrides repo attributes", () => {
      expect(context.pullRequest({ owner: "muahaha", pull_number: 5 })).toEqual(
        {
          owner: "muahaha",
          pull_number: 5,
          repo: "Hello-World",
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
      // @ts-ignore - Expression produces a union type that is too complex to represent
      context = new Context(event, octokit, {} as any);
    });

    it("gets a valid configuration", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/Codertocat/Hello-World/contents/.github%2Ftest-file.yml")
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
        .get("/repos/Codertocat/Hello-World/contents/.github%2Ftest-file.yml")
        .reply(404)
        .get("/repos/Codertocat/.github/contents/.github%2Ftest-file.yml")
        .reply(404);

      expect(await context.config("test-file.yml")).toBe(null);
      expect(mock.activeMocks()).toStrictEqual([]);
    });

    it("accepts deepmerge options", async () => {
      const mock = nock("https://api.github.com")
        .get("/repos/Codertocat/Hello-World/contents/.github%2Ftest-file.yml")
        .reply(
          200,
          "foo:\n  - name: master\n    shouldChange: changed\n_extends: .github"
        )
        .get("/repos/Codertocat/.github/contents/.github%2Ftest-file.yml")
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
      event.payload.sender.type = "Bot";
      context = new Context(event, {} as any, {} as any);

      expect(context.isBot).toBe(true);
    });

    test("returns false if sender is not a bot", () => {
      event.payload.sender.type = "User";
      context = new Context(event, {} as any, {} as any);

      expect(context.isBot).toBe(false);
    });
  });
});
