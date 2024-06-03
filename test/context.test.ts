import fs from "node:fs";
import path from "node:path";

import type { EmitterWebhookEvent as WebhookEvent } from "@octokit/webhooks";
import WebhookExamples from "@octokit/webhooks-examples";
import type { WebhookDefinition } from "@octokit/webhooks-examples";
import fetchMock from "fetch-mock";
import { describe, expect, test, beforeEach, it, vi } from "vitest";

import { Context } from "../src/index.js";
import { ProbotOctokit } from "../src/octokit/probot-octokit.js";
import type { PushEvent } from "@octokit/webhooks-types";

const pushEventPayload = (
  (WebhookExamples as unknown as WebhookDefinition[]).filter(
    (event) => event.name === "push",
  )[0] as WebhookDefinition<"push">
).examples[0];
const issuesEventPayload = (
  (WebhookExamples as unknown as WebhookDefinition[]).filter(
    (event) => event.name === "issues",
  )[0] as WebhookDefinition<"issues">
).examples[0];
const pullRequestEventPayload = (
  (WebhookExamples as unknown as WebhookDefinition[]).filter(
    (event) => event.name === "pull_request",
  )[0] as WebhookDefinition<"pull_request">
).examples[0] as WebhookEvent<"pull_request">["payload"];

describe("Context", () => {
  let event: WebhookEvent<"push"> = {
    id: "0",
    name: "push",
    payload: pushEventPayload,
  };
  let octokit = {
    hook: {
      before: vi.fn(),
    },
  };
  let context: Context<"push"> = new Context<"push">(
    event,
    octokit as any,
    {} as any,
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
      let octokit = {
        hook: {
          before: vi.fn(),
        },
      };

      context = new Context<"push">(event, octokit as any, {} as any);
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
      let octokit = {
        hook: {
          before: vi.fn(),
        },
      };

      context = new Context<"push">(event, octokit as any, {} as any);
      expect(context.repo()).toEqual({ owner: "bkeepers-inc", repo: "test" });
    });

    it("return error for context.repo() when repository doesn't exist", () => {
      event = {
        id: "123",
        name: "push",
        payload: { ...pushEventPayload, repository: undefined as any },
      };
      let octokit = {
        hook: {
          before: vi.fn(),
        },
      };

      context = new Context<"push">(event, octokit as any, {} as any);
      try {
        context.repo();
      } catch (e) {
        expect((e as Error).message).toMatch(
          "context.repo() is not supported for this webhook event.",
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
      let octokit = {
        hook: {
          before: vi.fn(),
        },
      };

      context = new Context<"issues">(event, octokit as any, {} as any);
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
      let octokit = {
        hook: {
          before: vi.fn(),
        },
      };

      context = new Context<"pull_request">(event, octokit as any, {} as any);
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
        },
      );
    });
  });

  describe("config", () => {
    let octokit: ProbotOctokit;

    function getConfigFile(fileName: string) {
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
      const fetch = fetchMock
        .sandbox()
        .getOnce(
          "https://api.github.com/repos/Codertocat/Hello-World/contents/.github%2Ftest-file.yml",
          getConfigFile("basic.yml"),
        );

      const octokit = new ProbotOctokit({
        retry: { enabled: false },
        throttle: { enabled: false },
        request: {
          fetch,
        },
      });
      const context = new Context(event, octokit, {} as any);

      const config = await context.config("test-file.yml");
      expect(config).toEqual({
        bar: 7,
        baz: 11,
        foo: 5,
      });
    });

    it("returns null when the file and base repository are missing", async () => {
      const NOT_FOUND_RESPONSE = {
        status: 404,
        body: {
          message: "Not Found",
          documentation_url:
            "https://docs.github.com/rest/reference/repos#get-repository-content",
        },
      };

      const fetch = fetchMock
        .sandbox()
        .getOnce(
          "https://api.github.com/repos/Codertocat/Hello-World/contents/.github%2Ftest-file.yml",
          NOT_FOUND_RESPONSE,
        )
        .getOnce(
          "https://api.github.com/repos/Codertocat/.github/contents/.github%2Ftest-file.yml",
          NOT_FOUND_RESPONSE,
        );

      const octokit = new ProbotOctokit({
        retry: { enabled: false },
        throttle: { enabled: false },
        request: {
          fetch,
        },
      });
      const context = new Context(event, octokit, {} as any);

      expect(await context.config("test-file.yml")).toBe(null);
    });

    it("accepts deepmerge options", async () => {
      const fetch = fetchMock
        .sandbox()
        .getOnce(
          "https://api.github.com/repos/Codertocat/Hello-World/contents/.github%2Ftest-file.yml",
          "foo:\n  - name: master\n    shouldChange: changed\n_extends: .github",
        )
        .getOnce(
          "https://api.github.com/repos/Codertocat/.github/contents/.github%2Ftest-file.yml",
          "foo:\n  - name: develop\n  - name: master\n    shouldChange: should",
        );

      const octokit = new ProbotOctokit({
        retry: { enabled: false },
        throttle: { enabled: false },
        request: {
          fetch,
        },
      });
      const context = new Context(event, octokit, {} as any);

      const customMerge = vi.fn(
        (_target: any[], _source: any[], _options: any): any[] => [],
      );
      await context.config("test-file.yml", {}, { arrayMerge: customMerge });
      expect(customMerge).toHaveBeenCalled();
    });

    it("sets x-github-delivery header to event id", async () => {
      const fetch = fetchMock.sandbox().getOnce((_url, { headers }) => {
        expect(
          // @ts-expect-error
          headers["x-github-delivery"],
        ).toBe("0");
        return true;
      }, getConfigFile("basic.yml"));

      const octokit = new ProbotOctokit({
        retry: { enabled: false },
        throttle: { enabled: false },
        request: {
          fetch,
        },
      });
      const context = new Context(event, octokit, {} as any);
      await context.config("test-file.yml");
    });
  });

  describe("isBot", () => {
    test("returns true if sender is a bot", () => {
      event.payload.sender.type = "Bot";
      let octokit = {
        hook: {
          before: vi.fn(),
        },
      };
      context = new Context(event, octokit as any, {} as any);

      expect(context.isBot).toBe(true);
    });

    test("returns false if sender is not a bot", () => {
      event.payload.sender.type = "User";
      let octokit = {
        hook: {
          before: vi.fn(),
        },
      };
      context = new Context(event, octokit as any, {} as any);

      expect(context.isBot).toBe(false);
    });
  });
});
