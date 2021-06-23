import nock from "nock";
import { ProbotOctokit } from "../src/octokit/probot-octokit";

type Options = ConstructorParameters<typeof ProbotOctokit>[0];

describe("ProbotOctokit", () => {
  let octokit: InstanceType<typeof ProbotOctokit>;

  const defaultOptions: Options = {
    retry: {
      // disable retries to test error states
      enabled: false,
    },
    throttle: {
      // disable throttling, otherwise tests are _slow_
      enabled: false,
    },
  };

  beforeEach(() => {
    octokit = new ProbotOctokit(defaultOptions);
  });

  test("works without options", async () => {
    octokit = new ProbotOctokit();
    const user = { login: "ohai" };

    nock("https://api.github.com").get("/user").reply(200, user);
    expect((await octokit.users.getAuthenticated({})).data).toEqual(user);
  });

  test("logs request errors", async () => {
    nock("https://api.github.com").get("/").reply(500, {});

    try {
      await octokit.request("/");
      throw new Error("should throw");
    } catch (error) {
      expect(error.status).toBe(500);
    }
  });

  describe("with retry enabled", () => {
    beforeEach(() => {
      const options: Options = {
        ...defaultOptions,
        retry: {
          enabled: true,
        },
      };

      octokit = new ProbotOctokit(options);
    });

    test("retries failed requests", async () => {
      nock("https://api.github.com").get("/").once().reply(500, {});

      nock("https://api.github.com").get("/").once().reply(200, {});

      const response = await octokit.request("/");
      expect(response.status).toBe(200);
    });
  });

  describe("with throttling enabled", () => {
    beforeEach(() => {
      const options: Options = {
        ...defaultOptions,
        throttle: {
          enabled: true,
          minimumAbuseRetryAfter: 1,
          onRateLimit() {
            return true;
          },
          onAbuseLimit() {
            return true;
          },
        },
      };

      octokit = new ProbotOctokit(options);
    });

    test("retries requests when being rate limited", async () => {
      nock("https://api.github.com")
        .get("/")
        .reply(
          403,
          {},
          {
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": `${new Date().getTime() / 1000}`,
          }
        )

        .get("/")
        .reply(200, {});

      const { status } = await octokit.request("/");
      expect(status).toBe(200);
    });

    test("retries requests when hitting the abuse limiter", async () => {
      nock("https://api.github.com").get("/").once().reply(403, {
        message:
          "The throttle plugin just looks for the word abuse in the error message",
      });

      nock("https://api.github.com").get("/").once().reply(200, {});

      const response = await octokit.request("/");
      expect(response.status).toBe(200);
    });
  });

  describe("paginate", () => {
    // Prepare an array of issue objects
    const issues = new Array(5).fill(0).map((_, i, arr) => {
      return {
        id: i,
        number: i,
        title: `Issue number ${i}`,
      };
    });

    beforeEach(() => {
      nock("https://api.github.com")
        .get("/repos/JasonEtco/pizza/issues?per_page=1")
        .reply(200, [issues[0]], {
          link: '<https://api.github.com/repositories/123/issues?per_page=1&page=2>; rel="next"',
        })
        .get("/repositories/123/issues?per_page=1&page=2")
        .reply(200, [issues[1]], {
          link: '<https://api.github.com/repositories/123/issues?per_page=1&page=3>; rel="next"',
        })
        .get("/repositories/123/issues?per_page=1&page=3")
        .reply(200, [issues[2]], {
          link: '<https://api.github.com/repositories/123/issues?per_page=1&page=4>; rel="next"',
        })
        .get("/repositories/123/issues?per_page=1&page=4")
        .reply(200, [issues[3]], {
          link: '<https://api.github.com/repositories/123/issues?per_page=1&page=5>; rel="next"',
        })
        .get("/repositories/123/issues?per_page=1&page=5")
        .reply(200, [issues[4]], {
          link: "",
        });
    });

    it("returns an array of pages", async () => {
      const spy = jest.fn();
      const res = await octokit.paginate(
        octokit.issues.listForRepo.endpoint.merge({
          owner: "JasonEtco",
          repo: "pizza",
          per_page: 1,
        }),
        spy
      );
      expect(Array.isArray(res)).toBeTruthy();
      expect(res.length).toBe(5);
      expect(spy).toHaveBeenCalledTimes(5);
    });

    it("stops iterating if the done() function is called in the callback", async () => {
      const spy = jest.fn((response, done) => {
        if (response.data[0].id === 2) done();
      }) as any;
      const res = await octokit.paginate(
        octokit.issues.listForRepo.endpoint.merge({
          owner: "JasonEtco",
          repo: "pizza",
          per_page: 1,
        }),
        spy
      );
      expect(res.length).toBe(3);
      expect(spy).toHaveBeenCalledTimes(3);
    });

    it("maps the responses to data by default", async () => {
      const res = await octokit.paginate(
        octokit.issues.listForRepo.endpoint.merge({
          owner: "JasonEtco",
          repo: "pizza",
          per_page: 1,
        })
      );
      expect(res).toEqual(issues);
    });
  });
});
