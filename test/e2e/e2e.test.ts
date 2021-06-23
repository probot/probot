import execa from "execa";
import getPort from "get-port";

import { sign } from "@octokit/webhooks-methods";
import bodyParser from "body-parser";
import express from "express";
import got from "got";

jest.setTimeout(10000);

/**
 * In these tests we are starting probot apps by running "npm run [path to app.js]" using ghub.io/execa.
 * This allows us to pass dynamic environment variables for configuration.
 *
 * We also spawn a mock server which receives the Octokit requests from the app and uses jest assertions
 * to verify they are what we expect
 */
describe("end-to-end-tests", () => {
  let server: any;
  let probotProcess: any;
  let probotPort: number;
  let mockServerPort: number;

  beforeEach(async () => {
    server = null;
    probotProcess = null;
    mockServerPort = await getPort();
    probotPort = await getPort();
  });
  afterEach(() => {
    if (server) server.close();
    if (probotProcess) probotProcess.cancel();
  });

  it("hello-world app", async () => {
    const app = express();
    const httpMock = jest
      .fn()
      .mockImplementationOnce((req, res) => {
        expect(req.method).toEqual("POST");
        expect(req.path).toEqual("/app/installations/1/access_tokens");

        res.status(201).json({
          token: "v1.1f699f1069f60xxx",
          permissions: {
            issues: "write",
            contents: "read",
          },
          repository_selection: "all",
        });
      })
      .mockImplementationOnce((req, res) => {
        expect(req.method).toEqual("POST");
        expect(req.path).toEqual(
          "/repos/octocat/hello-world/issues/1/comments"
        );
        expect(req.body).toStrictEqual({ body: "Hello World!" });

        res.status(201).json({});
      });

    // tslint:disable-next-line
    app.use(bodyParser.json());
    app.use("/api/v3", httpMock);
    server = app.listen(mockServerPort);

    probotProcess = execa(
      "bin/probot.js",
      ["run", "./test/e2e/hello-world.js"],
      {
        env: {
          APP_ID: "1",
          PRIVATE_KEY:
            "-----BEGIN RSA PRIVATE KEY-----\nMIIBOQIBAAJBAIILhiN9IFpaE0pUXsesuuoaj6eeDiAqCiE49WB1tMB8ZMhC37kY\nFl52NUYbUxb7JEf6pH5H9vqw1Wp69u78XeUCAwEAAQJAb88urnaXiXdmnIK71tuo\n/TyHBKt9I6Rhfzz0o9Gv7coL7a537FVDvV5UCARXHJMF41tKwj+zlt9EEUw7a1HY\nwQIhAL4F/VHWSPHeTgXYf4EaX2OlpSOk/n7lsFtL/6bWRzRVAiEArzJs2vopJitv\nA1yBjz3q2nX+zthk+GLXrJQkYOnIk1ECIHfeFV8TWm5gej1LxZquBTA5pINoqDVq\nNKZSuZEHqGEFAiB6EDrxkovq8SYGhIQsJeqkTMO8n94xhMRZlFmIQDokEQIgAq5U\nr1UQNnUExRh7ZT0kFbMfO9jKYZVlQdCL9Dn93vo=\n-----END RSA PRIVATE KEY-----",
          WEBHOOK_SECRET: "test",
          PORT: String(probotPort),
          GHE_HOST: `127.0.0.1:${mockServerPort}`,
          GHE_PROTOCOL: "http",
          LOG_LEVEL: "trace",
        },
      }
    );

    // give probot a moment to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // send webhook event request
    const body = JSON.stringify({
      action: "opened",
      issue: {
        number: "1",
      },
      repository: {
        owner: {
          login: "octocat",
        },
        name: "hello-world",
      },
      installation: {
        id: 1,
      },
    });

    try {
      await got.post(`http://127.0.0.1:${probotPort}`, {
        headers: {
          "content-type": "application/json",
          "x-github-event": "issues",
          "x-github-delivery": "1",
          "x-hub-signature-256": await sign("test", body),
        },
        body,
      });
    } catch (error) {
      probotProcess.cancel();
      console.log((await probotProcess).stdout);
    }

    expect(httpMock).toHaveBeenCalledTimes(2);
  });
});
