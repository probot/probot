import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  EmitterWebhookEvent as WebhookEvent,
  EmitterWebhookEventName,
} from "@octokit/webhooks";
import WebhookExamples from "@octokit/webhooks-examples";
import fetchMock from "fetch-mock";
import { describe, expect, test, it } from "vitest";

import { Context } from "../src/index.js";
import { ProbotOctokit } from "../src/octokit/probot-octokit.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type GetWebhookEventPayload<T extends EmitterWebhookEventName> =
  WebhookEvent<T>["payload"];

type WebhookDefinition<
  TName extends EmitterWebhookEventName = EmitterWebhookEventName,
> = {
  name: TName;
  actions: string[];
  description: string;
  examples: GetWebhookEventPayload<TName>[];
  properties: Record<
    string,
    {
      description: string;
      type:
        | "string"
        | "number"
        | "boolean"
        | "object"
        | "integer"
        | "array"
        | "null";
    }
  >;
};

type PushEvent = GetWebhookEventPayload<"push">;

const webhookExamples = WebhookExamples as unknown as WebhookDefinition[];
const pushEventPayload = (
  webhookExamples.filter(
    (event) => event.name === "push",
  )[0] as unknown as WebhookDefinition<"push">
).examples[0];
const issuesEventPayload = (
  webhookExamples.filter(
    (event) => event.name === "issues",
  )[0] as unknown as WebhookDefinition<"issues">
).examples[0];
const pullRequestEventPayload = (
  webhookExamples.filter(
    (event) => event.name === "pull_request",
  )[0] as unknown as WebhookDefinition<"pull_request">
).examples[0] as WebhookEvent<"pull_request">["payload"];

describe("Context", () => {
  const event: WebhookEvent<"push"> = {
    id: "0",
    name: "push",
    payload: pushEventPayload,
  };
  const octokit = {
    hook: {
      before: () => {},
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
    const event = {
      id: "123",
      name: "push",
      payload: pushEventPayload,
    } as WebhookEvent<"push">;

    const context = new Context<"push">(
      event,
      {
        hook: {
          before: () => {},
        },
      } as any,
      {} as any,
    );

    it("returns attributes from repository payload", () => {
      const repository = context.repo();

      expect(typeof repository).toBe("object");
      expect(Object.keys(repository).length).toBe(2);
      expect(repository.owner).toBe("Codertocat");
      expect(repository.repo).toBe("Hello-World");
    });

    it("merges attributes", () => {
      const repository = context.repo({ foo: 1, bar: 2 });

      expect(typeof repository).toBe("object");
      expect(Object.keys(repository).length).toBe(4);
      expect(repository.owner).toBe("Codertocat");
      expect(repository.repo).toBe("Hello-World");
      expect(repository.foo).toBe(1);
      expect(repository.bar).toBe(2);
    });

    it("overrides repo attributes", () => {
      const repository = context.repo({ owner: "muahaha" });

      expect(typeof repository).toBe("object");
      expect(Object.keys(repository).length).toBe(2);
      expect(repository.owner).toBe("muahaha");
      expect(repository.repo).toBe("Hello-World");
    });

    // The `repository` object on the push event has a different format than the other events
    // https://docs.github.com/en/developers/webhooks-and-events/webhook-events-and-payloads#push
    it("properly handles the push event", () => {
      const pushEvent = {
        ...event,
        payload: require("./fixtures/webhook/push") as PushEvent,
      };

      const octokit = {
        hook: {
          before: () => {},
        },
      };

      const context = new Context<"push">(pushEvent, octokit as any, {} as any);

      const repository = context.repo();

      expect(typeof repository).toBe("object");
      expect(Object.keys(repository).length).toBe(2);
      expect(repository.owner).toBe("bkeepers-inc");
      expect(repository.repo).toBe("test");
    });

    it("return error for context.repo() when repository doesn't exist", () => {
      const event = {
        id: "123",
        name: "push",
        payload: { ...pushEventPayload, repository: undefined as any },
      };
      const octokit = {
        hook: {
          before: () => {},
        },
      };

      const context = new Context<"push">(
        event as WebhookEvent<"push">,
        octokit as any,
        {} as any,
      );
      try {
        context.repo();
        throw new Error("Should have thrown");
      } catch (e) {
        expect((e as Error).message).toBe(
          "context.repo() is not supported for this webhook event.",
        );
      }
    });
  });

  describe("issue", () => {
    const context = new Context<"issues">(
      {
        id: "123",
        name: "issues",
        payload: issuesEventPayload,
      } as WebhookEvent<"issues">,
      {
        hook: {
          before: () => {},
        },
      } as any,
      {} as any,
    );

    it("returns attributes from repository payload", () => {
      const issue = context.issue();

      expect(typeof issue).toBe("object");
      expect(Object.keys(issue).length).toBe(3);
      expect(issue.owner).toBe("Codertocat");
      expect(issue.repo).toBe("Hello-World");
      expect(issue.issue_number).toBe(1);
    });

    it("merges attributes", () => {
      const issue = context.issue({ foo: 1, bar: 2 });

      expect(typeof issue).toBe("object");
      expect(Object.keys(issue).length).toBe(5);
      expect(issue.owner).toBe("Codertocat");
      expect(issue.repo).toBe("Hello-World");
      expect(issue.issue_number).toBe(1);
      expect(issue.foo).toBe(1);
      expect(issue.bar).toBe(2);
    });

    it("overrides repo attributes", () => {
      const issue = context.issue({ owner: "muahaha", issue_number: 5 });

      expect(typeof issue).toBe("object");
      expect(Object.keys(issue).length).toBe(3);
      expect(issue.owner).toBe("muahaha");
      expect(issue.issue_number).toBe(5);
      expect(issue.repo).toBe("Hello-World");
    });
  });

  describe("pullRequest", () => {
    const event = {
      id: "123",
      name: "pull_request",
      payload: pullRequestEventPayload,
    } as WebhookEvent<"pull_request">;
    const context = new Context<"pull_request">(
      event,
      {
        hook: {
          before: () => {},
        },
      } as any,
      {} as any,
    );

    it("returns attributes from repository payload", () => {
      const pullRequest = context.pullRequest();

      expect(typeof pullRequest).toBe("object");
      expect(Object.keys(pullRequest).length).toBe(3);
      expect(pullRequest.owner).toBe("Codertocat");
      expect(pullRequest.repo).toBe("Hello-World");
      expect(pullRequest.pull_number).toBe(2);
    });

    it("merges attributes", () => {
      const pullRequest = context.pullRequest({ foo: 1, bar: 2 });

      expect(typeof pullRequest).toBe("object");
      expect(Object.keys(pullRequest).length).toBe(5);
      expect(pullRequest.owner).toBe("Codertocat");
      expect(pullRequest.repo).toBe("Hello-World");
      expect(pullRequest.pull_number).toBe(2);
      expect(pullRequest.foo).toBe(1);
      expect(pullRequest.bar).toBe(2);
    });

    it("overrides repo attributes", () => {
      const pullRequest = context.pullRequest({
        owner: "muahaha",
        pull_number: 5,
      });

      expect(typeof pullRequest).toBe("object");
      expect(Object.keys(pullRequest).length).toBe(3);
      expect(pullRequest.owner).toBe("muahaha");
      expect(pullRequest.pull_number).toBe(5);
      expect(pullRequest.repo).toBe("Hello-World");
    });
  });

  describe("config", () => {
    function getConfigFile(fileName: string) {
      const configPath = path.join(__dirname, "fixtures", "config", fileName);
      return fs.readFileSync(configPath, { encoding: "utf8" });
    }

    it("gets a valid configuration", async () => {
      const mock = fetchMock
        .createInstance()
        .getOnce(
          "https://api.github.com/repos/Codertocat/Hello-World/contents/.github%2Ftest-file.yml",
          getConfigFile("basic.yml"),
        );

      const octokit = new ProbotOctokit({
        retry: { enabled: false },
        throttle: { enabled: false },
        request: {
          fetch: mock.fetchHandler,
        },
      });
      const context = new Context(event, octokit, {} as any);

      const config = await context.config("test-file.yml");

      expect(typeof config).toBe("object");
      expect(Object.keys(config as any).length).toBe(3);
      expect((config as any).foo).toBe(5);
      expect((config as any).bar).toBe(7);
      expect((config as any).baz).toBe(11);
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

      const mock = fetchMock
        .createInstance()
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
          fetch: mock.fetchHandler,
        },
      });
      const context = new Context(event, octokit, {} as any);

      expect(await context.config("test-file.yml")).toBe(null);
    });

    it("accepts deepmerge options", async () => {
      const mock = fetchMock
        .createInstance()
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
          fetch: mock.fetchHandler,
        },
      });
      const context = new Context(event, octokit, {} as any);

      let customMergeCalled = false;
      const customMerge = (): any[] => {
        customMergeCalled = true;
        return [];
      };
      await context.config("test-file.yml", {}, { arrayMerge: customMerge });
      expect(customMergeCalled).toBe(true);
    });

    it("sets x-github-delivery header to event id", async () => {
      const mock = fetchMock.createInstance().getOnce("*", ({ options }) => {
        // @ts-expect-error
        expect(options.headers["x-github-delivery"]).toBe("0");
        return getConfigFile("basic.yml");
      });

      const octokit = new ProbotOctokit({
        retry: { enabled: false },
        throttle: { enabled: false },
        request: {
          fetch: mock.fetchHandler,
        },
      });
      const context = new Context(event, octokit, {} as any);
      await context.config("test-file.yml");
    });
  });

  describe("isBot", () => {
    test("returns true if sender is a bot", () => {
      event.payload.sender!.type = "Bot";
      const octokit = {
        hook: {
          before: () => {},
        },
      };
      context = new Context(event, octokit as any, {} as any);

      expect(context.isBot).toBe(true);
    });

    test("returns false if sender is not a bot", () => {
      event.payload.sender!.type = "User";
      const octokit = {
        hook: {
          before: () => {},
        },
      };
      context = new Context(event, octokit as any, {} as any);

      expect(context.isBot).toBe(false);
    });
  });
});
