import Stream from "stream";

import { Webhooks } from "@octokit/webhooks";
import pino from "pino";

import { Application, Context, createProbot, Probot } from "../src";

describe("Deprecations", () => {
  let output: any;

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  beforeEach(() => {
    output = [];
  });

  it("createProbot", () => {
    const probot = createProbot({ log: pino(streamLogsToOutput) });
    expect(probot).toBeInstanceOf(Probot);

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      `[probot] "createProbot(options)" is deprecated, use "new Probot(options)" instead`
    );
  });

  it("probot.webhook", () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });
    expect(probot).toBeInstanceOf(Probot);

    expect(probot.webhook).toBeInstanceOf(Webhooks);

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      `[probot] "probot.webhook" is deprecated. Use "probot.webhooks" instead instead`
    );
  });

  it("new Probot({ cert })", () => {
    new Probot({
      id: 1,
      cert: "private key",
      log: pino(streamLogsToOutput),
    });

    expect(output.length).toEqual(1);
    expect(output[0].msg).toContain(
      `[probot] "cert" option is deprecated. Use "privateKey" instead`
    );
  });

  it("probot.logger", () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });
    probot.logger.info("test");

    expect(output.length).toEqual(2);
    expect(output[0].msg).toContain(
      `[probot] "probot.logger" is deprecated. Use "probot.log" instead`
    );
  });

  it("probot.log()", () => {
    const probot = new Probot({ log: pino(streamLogsToOutput) });
    probot.log("test");

    expect(output.length).toEqual(2);
    expect(output[0].msg).toContain(
      '[probot] "app.log()" and "context.log()" are deprecated. Use "app.log.info()" and "context.log.info()" instead'
    );
  });

  it("app.log()", () => {
    const app = new Application({
      log: pino(streamLogsToOutput),
      secret: "secret",
    });
    app.log("test");

    expect(output.length).toEqual(2);
    expect(output[0].msg).toContain(
      '[probot] "app.log()" and "context.log()" are deprecated. Use "app.log.info()" and "context.log.info()" instead'
    );
  });

  it("context.log()", () => {
    const context = new Context({} as any, {} as any, pino(streamLogsToOutput));
    context.log("test");

    expect(output.length).toEqual(2);
    expect(output[0].msg).toContain(
      '[probot] "app.log()" and "context.log()" are deprecated. Use "app.log.info()" and "context.log.info()" instead'
    );
  });
});
