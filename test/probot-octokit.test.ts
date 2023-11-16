import fetchMock from "fetch-mock";
import { ProbotOctokit } from "../src/octokit/probot-octokit.js";
import type { RequestError } from "@octokit/types";
import type { OctokitOptions } from "../src/types.js";
import { describe, expect, test, vi, it } from "vitest";

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
    const fetch = fetchMock
      .sandbox()
      .getOnce("https://api.github.com/user", '{"login": "ohai"}');

    const octokit = new ProbotOctokit({
      ...defaultOptions,
      request: {
        fetch,
      },
    });

    expect((await octokit.users.getAuthenticated({})).data).toEqual(
      '{"login": "ohai"}',
    );
  });

  test("logs request errors", async () => {
    const fetch = fetchMock.sandbox().getOnce("https://api.github.com/", {
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
        fetch,
      },
    });

    try {
      await octokit.request("/");
      throw new Error("should throw");
    } catch (error) {
      expect((error as RequestError).status).toBe(500);
    }
  });

  test("with retry enabled retries failed requests", async () => {
    let callCount = 0;

    const octokit = new ProbotOctokit({
      ...defaultOptions,
      retry: {
        enabled: true,
      },
      request: {
        fetch: (url: string, options: { [key: string]: any }) => {
          expect(url).toEqual("https://api.github.com/");
          expect(options.method).toEqual("GET");
          expect(options.headers.accept).toEqual(
            "application/vnd.github.v3+json",
          );
          expect(options.headers["user-agent"]).toMatch(/^probot\//);
          expect(options.signal).toEqual(undefined);
          expect(options.body).toEqual(undefined);

          if (callCount++ === 0) {
            return Promise.reject({});
          }

          return Promise.resolve({
            status: 200,
            headers: new Headers(),
            text: () => Promise.resolve("{}"),
          });
        },
      },
    });

    const response = await octokit.request("/");
    expect(response.status).toBe(200);
  });

  test("with throttling enabled retries requests when being rate limited", async () => {
    let callCount = 0;

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
          expect(url).toEqual("https://api.github.com/");
          expect(options.method).toEqual("GET");
          expect(options.headers.accept).toEqual(
            "application/vnd.github.v3+json",
          );
          expect(options.headers["user-agent"]).toMatch(/^probot\//);
          expect(options.signal).toEqual(undefined);
          expect(options.body).toEqual(undefined);

          if (callCount++ === 0) {
            return Promise.resolve({
              status: 403,
              headers: new Headers({
                "X-RateLimit-Limit": "60",
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": `${new Date().getTime() / 1000}`,
              }),
              text: () => Promise.resolve("{}"),
            });
          }

          return Promise.resolve({
            status: 200,
            headers: new Headers(),
            text: () => Promise.resolve("{}"),
          });
        },
      },
    });

    const { status } = await octokit.request("/");
    expect(status).toBe(200);
  });

  test("with throttling enabled using default onPrimaryRateLimit", async () => {
    expect.assertions(14);
    let callCount = 0;

    const octokit = new ProbotOctokit({
      ...defaultOptions,
      // @ts-expect-error just need to mock the warn method
      log: {
        warn(message) {
          expect(message).toEqual(
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
          expect(url).toEqual("https://api.github.com/");
          expect(options.method).toEqual("GET");
          expect(options.headers.accept).toEqual(
            "application/vnd.github.v3+json",
          );
          expect(options.headers["user-agent"]).toMatch(/^probot\//);
          expect(options.signal).toEqual(undefined);
          expect(options.body).toEqual(undefined);

          if (callCount++ === 0) {
            return Promise.resolve({
              status: 403,
              headers: new Headers({
                "X-RateLimit-Limit": "60",
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": `${new Date().getTime() / 1000}`,
              }),
              text: () => Promise.resolve("{}"),
            });
          }

          return Promise.resolve({
            status: 200,
            headers: new Headers(),
            text: () => Promise.resolve("{}"),
          });
        },
      },
    });

    const { status } = await octokit.request("/");
    expect(status).toBe(200);
  });

  test("with throttling enabled retries requests when hitting the secondary rate limiter", async () => {
    let callCount = 0;

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
          expect(url).toEqual("https://api.github.com/");
          expect(options.method).toEqual("GET");
          expect(options.headers.accept).toEqual(
            "application/vnd.github.v3+json",
          );
          expect(options.headers["user-agent"]).toMatch(/^probot\//);
          expect(options.signal).toEqual(undefined);
          expect(options.body).toEqual(undefined);

          if (callCount++ === 0) {
            return Promise.resolve({
              status: 403,
              headers: new Headers(),
              text: () =>
                Promise.resolve(
                  "The throttle plugin just looks for the word secondary rate in the error message",
                ),
            });
          }

          return Promise.resolve({
            status: 200,
            headers: new Headers(),
            text: () => Promise.resolve("{}"),
          });
        },
      },
    });

    const response = await octokit.request("/");
    expect(response.status).toBe(200);
  });

  test("with throttling enabled using default onSecondaryRateLimit", async () => {
    expect.assertions(14);
    let callCount = 0;

    const octokit = new ProbotOctokit({
      ...defaultOptions,
      // @ts-expect-error just need to mock the warn method
      log: {
        warn(message) {
          expect(message).toEqual(
            'Secondary Rate limit hit with "GET /", retrying in 1 seconds.',
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
          expect(url).toEqual("https://api.github.com/");
          expect(options.method).toEqual("GET");
          expect(options.headers.accept).toEqual(
            "application/vnd.github.v3+json",
          );
          expect(options.headers["user-agent"]).toMatch(/^probot\//);
          expect(options.signal).toEqual(undefined);
          expect(options.body).toEqual(undefined);

          if (callCount++ === 0) {
            return Promise.resolve({
              status: 403,
              headers: new Headers(),
              text: () =>
                Promise.resolve(
                  "The throttle plugin just looks for the word secondary rate in the error message",
                ),
            });
          }

          return Promise.resolve({
            status: 200,
            headers: new Headers(),
            text: () => Promise.resolve("{}"),
          });
        },
      },
    });

    const response = await octokit.request("/");
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
    let callCount = 0;
    const octokit = new ProbotOctokit({
      ...defaultOptions,
      request: {
        fetch: (url: string, options: { [key: string]: any }) => {
          if (callCount === 0) {
            expect(url).toEqual(
              "https://api.github.com/repos/JasonEtco/pizza/issues?per_page=1",
            );
          } else {
            expect(url).toMatch(
              new RegExp(
                "^https://api\\.github\\.com/repositories/[0-9]+/issues\\?per_page=[0-9]+&page=[0-9]+$",
              ),
            );
          }
          expect(options.method).toEqual("GET");
          expect(options.headers.accept).toEqual(
            "application/vnd.github.v3+json",
          );
          expect(options.headers["user-agent"]).toMatch(/^probot\//);
          expect(options.signal).toEqual(undefined);
          expect(options.body).toEqual(undefined);

          return Promise.resolve({
            status: 200,
            text: () => Promise.resolve([issues[callCount++]]),
            headers: new Headers({
              link:
                callCount !== 4
                  ? `link: '<https://api.github.com/repositories/123/issues?per_page=1&page=${callCount}>; rel="next"',`
                  : "",
            }),
          });
        },
      },
    });

    const spy = vi.fn();
    const res = await octokit.paginate(
      octokit.issues.listForRepo.endpoint.merge({
        owner: "JasonEtco",
        repo: "pizza",
        per_page: 1,
      }),
      spy,
    );
    expect(Array.isArray(res)).toBeTruthy();
    expect(res.length).toBe(5);
    expect(spy).toHaveBeenCalledTimes(5);
  });

  it("paginate stops iterating if the done() function is called in the callback", async () => {
    let callCount = 0;
    const octokit = new ProbotOctokit({
      ...defaultOptions,
      request: {
        fetch: (url: string, options: { [key: string]: any }) => {
          if (callCount === 0) {
            expect(url).toEqual(
              "https://api.github.com/repos/JasonEtco/pizza/issues?per_page=1",
            );
          } else {
            expect(url).toMatch(
              new RegExp(
                "^https://api\\.github\\.com/repositories/[0-9]+/issues\\?per_page=[0-9]+&page=[0-9]+$",
              ),
            );
          }
          expect(options.method).toEqual("GET");
          expect(options.headers.accept).toEqual(
            "application/vnd.github.v3+json",
          );
          expect(options.headers["user-agent"]).toMatch(/^probot\//);
          expect(options.signal).toEqual(undefined);
          expect(options.body).toEqual(undefined);

          return Promise.resolve({
            status: 200,
            text: () => Promise.resolve([issues[callCount++]]),
            headers: new Headers({
              link:
                callCount !== 4
                  ? `link: '<https://api.github.com/repositories/123/issues?per_page=1&page=${callCount}>; rel="next"',`
                  : "",
            }),
          });
        },
      },
    });

    const spy = vi.fn((response, done) => {
      if (response.data[0].id === 2) done();
    }) as any;
    const res = await octokit.paginate(
      octokit.issues.listForRepo.endpoint.merge({
        owner: "JasonEtco",
        repo: "pizza",
        per_page: 1,
      }),
      spy,
    );
    expect(res.length).toBe(3);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("paginate maps the responses to data by default", async () => {
    let callCount = 0;
    const octokit = new ProbotOctokit({
      ...defaultOptions,
      request: {
        fetch: (url: string, options: { [key: string]: any }) => {
          if (callCount === 0) {
            expect(url).toEqual(
              "https://api.github.com/repos/JasonEtco/pizza/issues?per_page=1",
            );
          } else {
            expect(url).toMatch(
              new RegExp(
                "^https://api\\.github\\.com/repositories/[0-9]+/issues\\?per_page=[0-9]+&page=[0-9]+$",
              ),
            );
          }
          expect(options.method).toEqual("GET");
          expect(options.headers.accept).toEqual(
            "application/vnd.github.v3+json",
          );
          expect(options.headers["user-agent"]).toMatch(/^probot\//);
          expect(options.signal).toEqual(undefined);
          expect(options.body).toEqual(undefined);

          return Promise.resolve({
            status: 200,
            text: () => Promise.resolve([issues[callCount++]]),
            headers: new Headers({
              link:
                callCount !== 4
                  ? `link: '<https://api.github.com/repositories/123/issues?per_page=1&page=${callCount}>; rel="next"',`
                  : "",
            }),
          });
        },
      },
    });
    const res = await octokit.paginate(
      octokit.issues.listForRepo.endpoint.merge({
        owner: "JasonEtco",
        repo: "pizza",
        per_page: 1,
      }),
    );
    expect(res).toEqual(issues);
  });
});
