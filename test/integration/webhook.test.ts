import Stream from "stream";

import request from "supertest";
import pino from "pino";

import { Probot } from "../../src";
import * as data from "../fixtures/webhook/push.json";

describe("webhooks", () => {
  let probot: Probot;
  let output: any;

  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  beforeEach(() => {
    output = [];

    probot = new Probot({
      appId: 1,
      privateKey: "bexo🥪",
      secret: "secret",
      log: pino(streamLogsToOutput),
    });
  });

  test("it works when all headers are properly passed onto the event", async () => {
    const dataString = JSON.stringify(data);

    await request(probot.server)
      .post("/")
      .send(dataString)
      .set("x-github-event", "push")
      .set("x-hub-signature", probot.webhooks.sign(dataString))
      .set("x-github-delivery", "3sw4d5f6g7h8")
      .expect(200);
  });

  test("shows a friendly error when x-hub-signature is missing", async () => {
    await request(probot.server)
      .post("/")
      .send(data)
      .set("x-github-event", "push")
      // Note: 'x-hub-signature' is missing
      .set("x-github-delivery", "3sw4d5f6g7h8")
      .expect(400);
    expect(output[0]).toEqual(
      expect.objectContaining({
        msg:
          "Go to https://github.com/settings/apps/YOUR_APP and verify that the Webhook secret matches the value of the WEBHOOK_SECRET environment variable.",
      })
    );
  });

  test("logs webhook error exactly once", async () => {
    await request(probot.server)
      .post("/")
      .send(data)
      .set("x-github-event", "push")
      // Note: 'x-hub-signature' is missing
      .set("x-github-delivery", "3sw4d5f6g7h8")
      .expect(400);

    const errorLogs = output.filter((output: any) => output.level === 50);
    expect(errorLogs.length).toEqual(1);
  });
});
