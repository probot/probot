import Stream from "stream";
import { IncomingMessage, ServerResponse } from "http";

import pino from "pino";

import { Probot, createNodeMiddleware } from "../src";

describe("Deprecations", () => {
  let output: any;
  let env: any;

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  beforeEach(() => {
    output = [];

    env = { ...process.env };
  });
  afterEach(() => {
    process.env = env;
  });

  it("createNodeMiddleware(app, { Probot })", () => {
    // @ts-ignore
    const middleware = createNodeMiddleware(() => {}, {
      Probot: Probot.defaults({
        log: pino(streamLogsToOutput),
      }),
    });

    middleware({} as IncomingMessage, { end() {} } as ServerResponse);

    expect(output[0].msg).toContain(
      `"createNodeMiddleware(app, { Probot })" is deprecated. Use "createNodeMiddleware(app, { probot })" instead`
    );
  });
});
