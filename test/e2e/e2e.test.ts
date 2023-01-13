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
  let probotProcess: execa.ExecaChildProcess<string> | null;
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
            "-----BEGIN RSA PRIVATE KEY-----\n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\n-----END RSA PRIVATE KEY-----\n",
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
      const awaitedProcess = (await probotProcess);
      console.log(awaitedProcess.stdout);
      console.log(awaitedProcess.stderr);
    }

    expect(httpMock).toHaveBeenCalledTimes(2);
  });
});
