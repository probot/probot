import { createServer, IncomingMessage, ServerResponse } from "http";
import Stream from "stream";

import pino from "pino";
import getPort from "get-port";
import got from "got";
import { sign } from "@octokit/webhooks-methods";

import { createNodeMiddleware, createProbot, Probot } from "../src";
import { ApplicationFunction } from "../src/types";

const APP_ID = "1";
const PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIBOQIBAAJBAIILhiN9IFpaE0pUXsesuuoaj6eeDiAqCiE49WB1tMB8ZMhC37kY
Fl52NUYbUxb7JEf6pH5H9vqw1Wp69u78XeUCAwEAAQJAb88urnaXiXdmnIK71tuo
/TyHBKt9I6Rhfzz0o9Gv7coL7a537FVDvV5UCARXHJMF41tKwj+zlt9EEUw7a1HY
wQIhAL4F/VHWSPHeTgXYf4EaX2OlpSOk/n7lsFtL/6bWRzRVAiEArzJs2vopJitv
A1yBjz3q2nX+zthk+GLXrJQkYOnIk1ECIHfeFV8TWm5gej1LxZquBTA5pINoqDVq
NKZSuZEHqGEFAiB6EDrxkovq8SYGhIQsJeqkTMO8n94xhMRZlFmIQDokEQIgAq5U
r1UQNnUExRh7ZT0kFbMfO9jKYZVlQdCL9Dn93vo=
-----END RSA PRIVATE KEY-----`;
const WEBHOOK_SECRET = "secret";
const pushEvent = require("./fixtures/webhook/push.json");

describe("createNodeMiddleware", () => {
  let output: any[];
  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  beforeEach(() => {
    output = [];
  });

  test("with createProbot", async () => {
    expect.assertions(1);

    const app: ApplicationFunction = (app) => {
      app.on("push", (event) => {
        expect(event.name).toEqual("push");
      });
    };
    const middleware = createNodeMiddleware(app, {
      probot: createProbot({
        overrides: {
          log: pino(streamLogsToOutput),
        },
        env: {
          APP_ID,
          PRIVATE_KEY,
          WEBHOOK_SECRET,
        },
      }),
    });

    const server = createServer(middleware);
    const port = await getPort();
    server.listen(port);

    const body = JSON.stringify(pushEvent);

    await got.post(`http://127.0.0.1:${port}`, {
      headers: {
        "content-type": "application/json",
        "x-github-event": "push",
        "x-github-delivery": "1",
        "x-hub-signature-256": await sign("secret", body),
      },
      body,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    server.close();
  });

  test("loads app only once", async () => {
    let counter = 0;
    const appFn = () => {
      counter++;
    };
    const middleware = createNodeMiddleware(appFn, {
      probot: new Probot({
        appId: APP_ID,
        privateKey: PRIVATE_KEY,
      }),
    });

    middleware(
      {} as IncomingMessage,
      { end() {}, writeHead() {} } as unknown as ServerResponse
    );
    middleware(
      {} as IncomingMessage,
      { end() {}, writeHead() {} } as unknown as ServerResponse
    );

    expect(counter).toEqual(1);
  });
});
