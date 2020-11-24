import Stream from "stream";
import { join } from "path";

import { Webhooks } from "@octokit/webhooks";
import pino from "pino";

import {
  Application,
  createProbot,
  Probot,
  ProbotOctokit,
  Context,
} from "../src";
import { ApplicationFunction } from "../src/types";

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

  it("createProbot", () => {
    const probot = createProbot({ log: pino(streamLogsToOutput) });
    expect(probot).toBeInstanceOf(Probot);

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      '[probot] "createProbot(options)" is deprecated, use "new Probot(options)" instead'
    );
  });

  it("probot.webhook", () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });
    expect(probot).toBeInstanceOf(Probot);

    expect(probot.webhook).toBeInstanceOf(Webhooks);

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      '[probot] "probot.webhook" is deprecated. Use "probot.webhooks" instead'
    );
  });

  it("new Probot({ cert })", () => {
    new Probot({
      appId: 1,
      cert: "private key",
      log: pino(streamLogsToOutput),
    });

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      '[probot] "cert" option is deprecated. Use "privateKey" instead'
    );
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

  it("throttleOptions", async () => {
    expect.assertions(4);

    const testLog = pino(streamLogsToOutput);
    const log = ({
      fatal: testLog.fatal.bind(testLog),
      error: testLog.error.bind(testLog),
      warn: testLog.warn.bind(testLog),
      info: testLog.info.bind(testLog),
      debug: testLog.debug.bind(testLog),
      trace: testLog.trace.bind(testLog),
      child: () => log,
    } as unknown) as pino.Logger;
    const Octokit = ProbotOctokit.plugin((octokit: any, options: any) => {
      return {
        pluginLoaded: true,
        test() {
          expect(options.throttle.id).toBe(1);
          expect(options.throttle.foo).toBe("bar");
        },
      };
    }).defaults({ log });

    const app = new Application({
      Octokit,
      id: 1,
      privateKey: "private key",
      secret: "secret",
      throttleOptions: {
        foo: "bar",
        onAbuseLimit: () => true,
        onRateLimit: () => true,
      },
      log,
    });

    const installationOctokit = await app.auth(1);
    installationOctokit.test();

    expect(output.length).toEqual(2); // 2 because Application itself is now deprecated
    expect(output[1].msg).toContain(
      '[probot] "new Application({ throttleOptions })" is deprecated. Use "new Application({Octokit: ProbotOctokit.defaults({ throttle }) })" instead'
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

    expect(output.length).toEqual(2);
    expect(output[1].msg).toContain(
      '[probot] "(app) => {}" is deprecated. Use "({ app }) => {}" instead'
    );
  });

  it("app.router", () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });
    probot.load(({ app }) => {
      expect(app.router).toBeInstanceOf(Function);
    });

    expect(output.length).toEqual(2);
    expect(output[1].msg).toContain(
      '[probot] "app.router" is deprecated, use "getRouter()" from the app function instead: "({ app, getRouter }) => { ... }"'
    );
  });

  it("app.route with ({ app }) => {}", () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });
    probot.load(({ app }) => {
      expect(app.route()).toBeInstanceOf(Function);
    });

    expect(output.length).toEqual(2);
    expect(output[1].msg).toContain(
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

  it("Application", () => {
    new Application({
      secret: "secret",
      id: 1,
      privateKey:
        "-----BEGIN RSA PRIVATE KEY-----\nMIIBOQIBAAJBAIILhiN9IFpaE0pUXsesuuoaj6eeDiAqCiE49WB1tMB8ZMhC37kY\nFl52NUYbUxb7JEf6pH5H9vqw1Wp69u78XeUCAwEAAQJAb88urnaXiXdmnIK71tuo\n/TyHBKt9I6Rhfzz0o9Gv7coL7a537FVDvV5UCARXHJMF41tKwj+zlt9EEUw7a1HY\nwQIhAL4F/VHWSPHeTgXYf4EaX2OlpSOk/n7lsFtL/6bWRzRVAiEArzJs2vopJitv\nA1yBjz3q2nX+zthk+GLXrJQkYOnIk1ECIHfeFV8TWm5gej1LxZquBTA5pINoqDVq\nNKZSuZEHqGEFAiB6EDrxkovq8SYGhIQsJeqkTMO8n94xhMRZlFmIQDokEQIgAq5U\nr1UQNnUExRh7ZT0kFbMfO9jKYZVlQdCL9Dn93vo=\n-----END RSA PRIVATE KEY-----",
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false },
      }),
      log: pino(streamLogsToOutput),
    });
    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      `[probot] "import { Application } from 'probot'" is deprecated. Use "import { Probot } from 'probot'" instead, the APIs are the same.`
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
    const server = new Server(async ({ app }) => {}, { 
      // optional:
      host,
      port,
      webhookPath,
      webhookProxy,
      Probot: Probot.defaults({ id, privateKey, ... })
    })

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
    const server = new Server(async ({ app }) => {}, {
      // optional:
      host,
      port,
      webhookPath,
      webhookProxy,
      Probot: Probot.defaults({ id, privateKey, ... })
    })

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

  it("probot.load(appFn)", () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });
    probot.load(() => {});

    expect(output[0].msg)
      .toContain(`[probot] "probot.load()" is deprecated. Pass the "probot" instance directly to an app function instead:
    
    const myOtherApp = require("./my-other-app.js")

    export async function app ({ probot, getRouter }) {
      await myOtherApp({ probot, getRouter })
    }
    `);
  });

  it("probot.load([app1, app2])", () => {
    expect.assertions(2);

    const probot = new Probot({ log: pino(streamLogsToOutput) });

    const app: ApplicationFunction = ({ app }) => {
      expect(app).toBeInstanceOf(Probot);
    };

    probot.load([app, app]);
  });
});
