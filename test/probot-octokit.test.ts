import type { RequestError } from "@octokit/types";
import fetchMock from "fetch-mock";
import { describe, expect, it, test } from "vitest";

import { ProbotOctokit } from "../src/octokit/probot-octokit.js";
import type { OctokitOptions } from "../src/types.js";

describe("ProbotOctokit", () => {
  const defaultOptions: OctokitOptions = {
    retry: {
      // disable retries to test error states
      enabled: false,
    },
    throttle: {
      // disable throttling, otherwise tests are _slow_
      enabled: false,
    },
  };

  test("works without options", async () => {
    const mock = fetchMock
      .createInstance()
      .getOnce("https://api.github.com/user", '{"login": "ohai"}');

    const octokit = new ProbotOctokit({
      ...defaultOptions,
      request: {
        fetch: mock.fetchHandler,
      },
    });

    expect((await octokit.rest.users.getAuthenticated({})).data).toBe(
      '{"login": "ohai"}',
    );
  });

  test("logs request errors", async () => {
    const mock = fetchMock.createInstance().getOnce("https://api.github.com/", {
      status: 500,
      body: {
        message: "Internal Server Error",
        documentation_url:
          "https://docs.github.com/rest/reference/repos#get-repository-content",
      },
    });

    const octokit = new ProbotOctokit({
      ...defaultOptions,
      request: {
        fetch: mock.fetchHandler,
      },
    });

    try {
      await octokit.request("/");
      throw new Error("Should have thrown");
    } catch (error) {
      expect((error as RequestError).status).toBe(500);
    }
  });

  test("with retry enabled retries failed requests", async () => {
    const fetchCalls: { url: string; options: any }[] = [];

    const octokit = new ProbotOctokit({
      ...defaultOptions,
      retry: {
        enabled: true,
      },
      request: {
        fetch: (url: string, options: { [key: string]: any }) => {
          fetchCalls.push({ url, options });

          if (fetchCalls.length === 1) {
            throw new Error("Simulated request failure");
          }

          return new Response("{}", {
            status: 200,
            headers: new Headers({
              "content-type": "application/json",
            }),
          });
        },
      },
    });

    const response = await octokit.request("/");
    expect(response.status).toBe(200);

    expect(fetchCalls.length).toBe(2);
    for (const { url, options } of fetchCalls) {
      expect(url).toBe("https://api.github.com/");
      expect(options.method).toBe("GET");
      expect(options.headers.accept).toBe("application/vnd.github.v3+json");
      expect(options.headers["user-agent"].slice(0, 7)).toBe("probot/");
      expect(options.signal).toBe(undefined);
      expect(options.body).toBe(undefined);
    }
  });

  test("with throttling enabled retries requests when being rate limited", async () => {
    const fetchCalls: { url: string; options: any }[] = [];

    const octokit = new ProbotOctokit({
      ...defaultOptions,
      throttle: {
        enabled: true,
        fallbackSecondaryRateRetryAfter: 1,
        onRateLimit() {
          return true;
        },
        onSecondaryRateLimit() {
          return true;
        },
      },
      request: {
        fetch: (url: string, options: { [key: string]: any }) => {
          fetchCalls.push({ url, options });

          if (fetchCalls.length === 1) {
            return new Response("{}", {
              status: 403,
              headers: new Headers({
                "content-type": "application/json",
                "X-RateLimit-Limit": "60",
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": `${new Date().getTime() / 1000}`,
              }),
            });
          }

          return new Response("{}", {
            status: 200,
            headers: new Headers({
              "content-type": "application/json",
            }),
          });
        },
      },
    });

    const { status } = await octokit.request("/");
    expect(status).toBe(200);

    expect(fetchCalls.length).toBe(2);
    for (const { url, options } of fetchCalls) {
      expect(url).toBe("https://api.github.com/");
      expect(options.method).toBe("GET");
      expect(options.headers.accept).toBe("application/vnd.github.v3+json");
      expect(options.headers["user-agent"].slice(0, 7)).toBe("probot/");
      expect(options.signal).toBe(undefined);
      expect(options.body).toBe(undefined);
    }
  });

  test("with throttling enabled using default onPrimaryRateLimit", async () => {
    const fetchCalls: { url: string; options: any }[] = [];

    const octokit = new ProbotOctokit({
      ...defaultOptions,
      // @ts-expect-error just need to mock the warn method
      log: {
        warn(message) {
          expect(message).toBe(
            'Rate limit hit with "GET /", retrying in 1 seconds.',
          );
        },
      },
      // @ts-expect-error
      throttle: {
        enabled: true,
        fallbackSecondaryRateRetryAfter: 1,
      },
      request: {
        fetch: (url: string, options: { [key: string]: any }) => {
          fetchCalls.push({ url, options });

          if (fetchCalls.length === 1) {
            return new Response("{}", {
              status: 403,
              headers: new Headers({
                "X-RateLimit-Limit": "60",
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": `${new Date().getTime() / 1000}`,
              }),
            });
          }

          return new Response("{}", {
            status: 200,
            headers: new Headers(),
          });
        },
      },
    });

    const { status } = await octokit.request("/");
    expect(status).toBe(200);

    expect(fetchCalls.length).toBe(2);
    for (const { url, options } of fetchCalls) {
      expect(url).toBe("https://api.github.com/");
      expect(options.method).toBe("GET");
      expect(options.headers.accept).toBe("application/vnd.github.v3+json");
      expect(options.headers["user-agent"].slice(0, 7)).toBe("probot/");
      expect(options.signal).toBe(undefined);
      expect(options.body).toBe(undefined);
    }
  });

  test("with throttling enabled retries requests when hitting the secondary rate limiter", async () => {
    const fetchCalls: { url: string; options: any }[] = [];

    const octokit = new ProbotOctokit({
      ...defaultOptions,
      throttle: {
        enabled: true,
        fallbackSecondaryRateRetryAfter: 1,
        onRateLimit() {
          return true;
        },
        onSecondaryRateLimit() {
          return true;
        },
      },
      request: {
        fetch: (url: string, options: { [key: string]: any }) => {
          fetchCalls.push({ url, options });

          if (fetchCalls.length === 1) {
            return new Response(
              "The throttle plugin just looks for the word secondary rate in the error message",
              {
                status: 403,
                headers: new Headers({
                  "content-type": "application/json",
                }),
              },
            );
          }

          return new Response("{}", {
            status: 200,
            headers: new Headers({ "content-type": "application/json" }),
          });
        },
      },
    });

    const response = await octokit.request("/");
    expect(response.status).toBe(200);

    expect(fetchCalls.length).toBe(2);
    for (const { url, options } of fetchCalls) {
      expect(url).toBe("https://api.github.com/");
      expect(options.method).toBe("GET");
      expect(options.headers.accept).toBe("application/vnd.github.v3+json");
      expect(options.headers["user-agent"].slice(0, 7)).toBe("probot/");
      expect(options.signal).toBe(undefined);
      expect(options.body).toBe(undefined);
    }
  });

  it("with throttling enabled using default onSecondaryRateLimit", async () => {
    const fetchCalls: { url: string; options: any }[] = [];

    const logWarnCalls: string[] = [];
    const logWarn = (message: string) => {
      logWarnCalls.push(message);
    };

    const octokit = new ProbotOctokit({
      ...defaultOptions,
      // @ts-expect-error just need to mock the warn method
      log: {
        warn: logWarn,
      },
      // @ts-expect-error
      throttle: {
        enabled: true,
        fallbackSecondaryRateRetryAfter: 1,
      },
      request: {
        fetch: async (url: string, options: { [key: string]: any }) => {
          fetchCalls.push({ url, options });

          if (fetchCalls.length === 1) {
            return new Response(
              "The throttle plugin just looks for the word secondary rate in the error message",
              {
                status: 403,
                headers: new Headers(),
              },
            );
          }

          return new Response("{}", {
            status: 200,
            headers: new Headers(),
          });
        },
      },
    });

    const response = await octokit.request("/");

    expect(fetchCalls.length).toBe(2);

    for (const { url, options } of fetchCalls) {
      expect(url).toBe("https://api.github.com/");
      expect(options.method).toBe("GET");
      expect(options.headers.accept).toBe("application/vnd.github.v3+json");
      expect(options.headers["user-agent"].slice(0, 7)).toBe("probot/");
      expect(options.signal).toBe(undefined);
      expect(options.body).toBe(undefined);
    }

    expect(logWarnCalls.length).toBe(1);
    expect(logWarnCalls[0]).toBe(
      'Secondary Rate limit hit with "GET /", retrying in 1 seconds.',
    );

    expect(response.status).toBe(200);
  });

  // Prepare an array of issue objects
  const issues = new Array(5).fill(0).map((_, i) => {
    return {
      id: i,
      number: i,
      title: `Issue number ${i}`,
    };
  });

  it("paginate returns an array of pages", async () => {
    const fetchCalls: { url: string; options: any }[] = [];

    const octokit = new ProbotOctokit({
      ...defaultOptions,
      request: {
        fetch: (url: string, options: { [key: string]: any }) => {
          const curPage = Number.parseInt(
            new URL(url).searchParams.get("page") || "0",
          );

          fetchCalls.push({ url, options });
          return new Response(JSON.stringify([issues[curPage]]), {
            status: 200,
            headers: new Headers({
              "content-type": "application/json",
              link:
                curPage !== 4
                  ? `link: '<https://api.github.com/repos/JasonEtco/pizza/issues?per_page=1&page=${curPage + 1}>; rel="next"',`
                  : "",
            }),
          });
        },
      },
    });

    let callCountSpy = 0;
    const spy: any = () => {
      callCountSpy++;
    };
    const res = await octokit.paginate(
      octokit.rest.issues.listForRepo.endpoint.merge({
        owner: "JasonEtco",
        repo: "pizza",
        per_page: 1,
      }),
      spy,
    );

    expect(fetchCalls.length).toBe(5);
    for (let i = 0; i < fetchCalls.length; i++) {
      const { url, options } = fetchCalls[i];
      const { host, protocol, pathname, searchParams } = new URL(url);
      expect(protocol).toBe("https:");
      expect(host).toBe("api.github.com");
      expect(pathname).toBe("/repos/JasonEtco/pizza/issues");
      expect(searchParams.get("per_page")).toBe("1");
      expect(searchParams.get("page")).toBe(i === 0 ? null : i.toString());
      expect(options.method).toBe("GET");
      expect(options.headers.accept).toBe("application/vnd.github.v3+json");
      expect(options.headers["user-agent"].slice(0, 7)).toBe("probot/");
      expect(options.signal).toBe(undefined);
      expect(options.body).toBe(undefined);
    }

    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(5);

    expect(callCountSpy).toBe(5);
  });

  it("paginate stops iterating if the done() function is called in the callback", async () => {
    const fetchCalls: { url: string; options: any }[] = [];

    const octokit = new ProbotOctokit({
      ...defaultOptions,
      request: {
        fetch: (url: string, options: { [key: string]: any }) => {
          fetchCalls.push({ url, options });

          const curPage = Number.parseInt(
            new URL(url).searchParams.get("page") || "0",
          );

          return new Response(JSON.stringify([issues[curPage]]), {
            status: 200,
            headers: new Headers({
              "content-type": "application/json",
              link:
                curPage !== 4
                  ? `link: '<https://api.github.com/repos/JasonEtco/pizza/issues?per_page=1&page=${curPage + 1}>; rel="next"',`
                  : "",
            }),
          });
        },
      },
    });

    let callCountSpy = 0;
    const spy = ((response: any, done: Function) => {
      callCountSpy++;
      if (response.data[0].id === 2) done();
    }) as any;
    const res = await octokit.paginate(
      octokit.rest.issues.listForRepo.endpoint.merge({
        owner: "JasonEtco",
        repo: "pizza",
        per_page: 1,
      }),
      spy,
    );

    expect(fetchCalls.length).toBe(3);
    for (let i = 0; i < fetchCalls.length; i++) {
      const { url, options } = fetchCalls[i];
      const { host, protocol, pathname, searchParams } = new URL(url);
      expect(protocol).toBe("https:");
      expect(host).toBe("api.github.com");
      expect(pathname).toBe("/repos/JasonEtco/pizza/issues");
      expect(searchParams.get("per_page")).toBe("1");
      expect(searchParams.get("page")).toBe(i === 0 ? null : i.toString());
      expect(options.method).toBe("GET");
      expect(options.headers.accept).toBe("application/vnd.github.v3+json");
      expect(options.headers["user-agent"].slice(0, 7)).toBe("probot/");
      expect(options.signal).toBe(undefined);
      expect(options.body).toBe(undefined);
    }

    expect(res.length).toBe(3);
    expect(callCountSpy).toBe(3);
  });

  it("paginate maps the responses to data by default", async () => {
    const fetchCalls: { url: string; options: any }[] = [];

    const octokit = new ProbotOctokit({
      ...defaultOptions,
      request: {
        fetch: (url: string, options: { [key: string]: any }) => {
          fetchCalls.push({ url, options });

          const curPage = Number.parseInt(
            new URL(url).searchParams.get("page") || "0",
          );

          return new Response(JSON.stringify([issues[curPage]]), {
            status: 200,
            headers: new Headers({
              "content-type": "application/json",
              link:
                curPage !== 4
                  ? `link: '<https://api.github.com/repos/JasonEtco/pizza/issues?per_page=1&page=${curPage + 1}>; rel="next"',`
                  : "",
            }),
          });
        },
      },
    });
    const res = await octokit.paginate(
      octokit.rest.issues.listForRepo.endpoint.merge({
        owner: "JasonEtco",
        repo: "pizza",
        per_page: 1,
      }),
    );
    expect(JSON.stringify(res)).toBe(JSON.stringify(issues));

    expect(fetchCalls.length).toBe(5);
    for (let i = 0; i < fetchCalls.length; i++) {
      const { url, options } = fetchCalls[i];
      const { host, protocol, pathname, searchParams } = new URL(url);
      expect(protocol).toBe("https:");
      expect(host).toBe("api.github.com");
      expect(pathname).toBe("/repos/JasonEtco/pizza/issues");
      expect(searchParams.get("per_page")).toBe("1");
      expect(searchParams.get("page")).toBe(i === 0 ? null : i.toString());
      expect(options.method).toBe("GET");
      expect(options.headers.accept).toBe("application/vnd.github.v3+json");
      expect(options.headers["user-agent"].slice(0, 7)).toBe("probot/");
      expect(options.signal).toBe(undefined);
      expect(options.body).toBe(undefined);
    }
  });
});
