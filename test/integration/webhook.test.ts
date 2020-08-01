import request from "supertest";
import { Probot } from "../../src";
import * as data from "../fixtures/webhook/push.json";

describe("webhooks", () => {
  let logger: any;
  let probot: Probot;

  beforeEach(() => {
    logger = jest.fn();

    probot = new Probot({ id: 1, cert: "bexo🥪", secret: "secret" });
    probot.logger.addStream({
      level: "trace",
      stream: { write: logger } as any,
      type: "raw",
    });
  });

  test("it works when all headers are properly passed onto the event", async () => {
    const dataString = JSON.stringify(data);

    await request(probot.server)
      .post("/")
      .send(dataString)
      .set("x-github-event", "push")
      .set("x-hub-signature", probot.webhook.sign(dataString))
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

    expect(logger).toHaveBeenCalledWith(
      expect.objectContaining({
        msg:
          "Go to https://github.com/settings/apps/YOUR_APP and verify that the Webhook secret matches the value of the WEBHOOK_SECRET environment variable.",
      })
    );
  });
});
