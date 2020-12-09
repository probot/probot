import Stream from "stream";
import { IncomingMessage, ServerResponse } from "http";

import pino from "pino";

import { Probot, getOptions, createNodeMiddleware } from "../src";

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

  it("probot.setup()", () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });

    probot.setup([() => {}]);

    expect(output[0].msg)
      .toContain(`[probot] "probot.setup()" is deprecated. Use the new "Server" class instead:
    
    const { Server, Probot } = require("probot")
    const server = new Server({
      // optional:
      host,
      port,
      webhookPath,
      webhookProxy,
      Probot: Probot.defaults({ id, privateKey, ... })
    })

    // load probot app function
    await server.load(({ app }) => {})

    // start listening to requests
    await server.start()
    // stop server with: await server.stop()

If you have more than one app function, combine them in a function instead

    const app1 = require("./app1")
    const app2 = require("./app2")

    module.exports = function app ({ probot, getRouter }) {
      await app1({ probot, getRouter })
      await app2({ probot, getRouter })
    }
`);
  });

  it("probot.load(appFunctionPath)", () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });
    probot.load("./test/fixtures/example.js");

    expect(output[0].msg).toContain(
      `[probot] passing a string to "probot.load()" is deprecated. Pass the function from "./test/fixtures/example.js" instead.`
    );
  });

  it("getOptions", () => {
    getOptions({ overrides: { log: pino(streamLogsToOutput) } });

    expect(output[0].msg).toContain(
      `[probot] "getOptions()" is deprecated, use "{ probot: createProbot() }" instead:

    const { createNodeMiddleware, createProbot } = require("probot");
    const myApp = require("./my-app.js");

    module.exports = createNodeMiddleware(myApp, { probot: createProbot() });`
    );
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
