import Stream from "stream";
import { join } from "path";
import { IncomingMessage, ServerResponse } from "http";

import pino from "pino";

import {
  Probot,
  ProbotOctokit,
  Context,
  getOptions,
  createNodeMiddleware,
} from "../src";

const pushEvent = require("./fixtures/webhook/push.json");

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

  it("new Probot({ appId })", () => {
    new Probot({
      id: 1,
      privateKey: "private key",
      log: pino(streamLogsToOutput),
    });

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      '[probot] "id" option is deprecated. Use "appId" instead'
    );
  });

  it("probot.logger", () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });
    probot.logger.info("test");

    expect(output.length).toEqual(2);
    expect(output[0].msg).toContain(
      '[probot] "probot.logger" is deprecated. Use "probot.log" instead'
    );
  });

  it("octokit.repos.createStatus()", () => {
    const log = pino(streamLogsToOutput);
    const octokit = new ProbotOctokit({
      log: {
        error: log.error.bind(log),
        warn: log.warn.bind(log),
        info: log.info.bind(log),
        debug: log.debug.bind(log),
      },
    });

    octokit.hook.wrap("request", () => {});

    try {
      octokit.repos.createStatus();
    } catch (error) {
      console.log(error);
    }

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      "octokit.repos.createStatus() has been renamed to octokit.repos.createCommitStatus()"
    );
  });

  it("probot.webhooks.on('*', handler)", () => {
    const probot = new Probot({
      appId: 1,
      privateKey: "private key",
      log: pino(streamLogsToOutput),
    });

    console.warn = jest.fn();

    probot.webhooks.on("*", () => {});

    expect(console.warn).toHaveBeenCalledTimes(1);
    // @ts-ignore
    expect(console.warn.mock.calls[0][0]).toContain(
      'Using the "*" event with the regular Webhooks.on() function is deprecated. Please use the Webhooks.onAny() method instead'
    );
  });

  it("(app) => { app.on(event, handler) }", () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });
    probot.load((app) => {
      // test that deprecation is only logged once
      app.auth();
      app.on("push", () => {});
    });

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      '[probot] "(app) => {}" is deprecated. Use "({ app }) => {}" instead'
    );
  });

  it("app.router", () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });
    probot.load(({ app }) => {
      expect(app.router).toBeInstanceOf(Function);
    });

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      '[probot] "app.router" is deprecated, use "getRouter()" from the app function instead: "({ app, getRouter }) => { ... }"'
    );
  });

  it("app.route with ({ app }) => {}", () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });
    probot.load(({ app }) => {
      expect(app.route()).toBeInstanceOf(Function);
    });

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      '[probot] "app.route()" is deprecated, use the "getRouter()" argument from the app function instead: "({ app, getRouter }) => { ... }"'
    );
  });

  it("app.route with (app) => {} #1428", () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });
    probot.load((app) => {
      expect(app.route()).toBeInstanceOf(Function);
    });

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      '[probot] "app.route()" is deprecated, use the "getRouter()" argument from the app function instead: "({ app, getRouter }) => { ... }"'
    );
  });

  it("context.event", () => {
    const octokit = new ProbotOctokit({});
    const context = new Context(
      { name: "push", id: "1", payload: pushEvent },
      octokit,
      pino(streamLogsToOutput)
    );

    expect(context.event).toEqual("push");
    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      `[probot] "context.event" is deprecated. Use "context.name" instead.`
    );
  });

  it("context.octokit", () => {
    const octokit = new ProbotOctokit({});
    const context = new Context(
      { name: "push", id: "1", payload: pushEvent },
      octokit,
      pino(streamLogsToOutput)
    );

    expect(context.github).toBeInstanceOf(ProbotOctokit);
    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      `[probot] "context.github" is deprecated. Use "context.octokit" instead.`
    );
  });

  it("INSTALLATION_TOKEN_TTL", () => {
    process.env.INSTALLATION_TOKEN_TTL = "123";
    new Probot({ log: pino(streamLogsToOutput) });
    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      '[probot] "INSTALLATION_TOKEN_TTL" environment variable is no longer used. Tokens are renewed as needed at the time of the request now.'
    );
  });

  it("Probot.run()", async () => {
    let initialized = false;

    process.env.APP_ID = "1";
    process.env.PRIVATE_KEY_PATH = join(
      __dirname,
      "fixtures",
      "test-private-key.pem"
    );
    process.env.WEBHOOK_PROXY_URL = "https://smee.io/EfHXC9BFfGAxbM6J";
    process.env.WEBHOOK_SECRET = "secret";

    const probot = await Probot.run(({ app }) => {
      initialized = true;
    });
    expect(initialized).toBeTruthy();

    probot.stop();
  });

  it("LOG_LEVEL/LOG_FORMAT/LOG_LEVEL_IN_STRING/SENTRY_DSN and Probot constructor", () => {
    process.env.LOG_LEVEL = "debug";
    process.env.LOG_FORMAT = "pretty";
    process.env.LOG_LEVEL_IN_STRING = "true";
    process.env.SENTRY_DSN = "https://1234abcd@sentry.io/12345";
    const probot = new Probot({});
    // passing { log: pino(streamLogsToOutput) } disables the deprecation message,
    // so this is just a reminder

    expect(probot.log.level).toEqual("debug");
  });

  it("REDIS_URL and Probot construtor", () => {
    process.env.REDIS_URL = "test";
    new Probot({ log: pino(streamLogsToOutput) });

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      `[probot] "REDIS_URL" is deprecated when using with the Probot constructor. Use "new Probot({ redisConfig: 'redis://...' })" instead`
    );
  });

  it("probot.start()", async () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });

    probot.start();
    probot.stop();

    expect(output[0].msg)
      .toContain(`[probot] "probot.start()" is deprecated. Use the new "Server" class instead:
    
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
`);
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
