import express, { Response } from "express";
// tslint:disable-next-line:no-var-requires
const sse: (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => void = require("connect-sse")();
import EventSource from "eventsource";
import http from "http";
import net from "net";
import nock from "nock";
import { getLog } from "../src/helpers/get-log";
import { createWebhookProxy } from "../src/helpers/webhook-proxy";

const targetPort = 999999;

interface SSEResponse extends Response {
  json(body: any, status?: string): this;
}

jest.setTimeout(10000);

describe("webhook-proxy", () => {
  // tslint:disable-next-line:one-variable-per-declaration
  let emit: SSEResponse["json"], proxy: EventSource, server: http.Server;

  afterEach(() => {
    server && server.close();
    proxy && proxy.close();
  });

  describe("with a valid proxy server", () => {
    beforeEach((done) => {
      const app = express();

      app.get("/events", sse, (req, res: SSEResponse) => {
        res.json({}, "ready");
        emit = res.json;
      });

      server = app.listen(0, () => {
        const url = `http://127.0.0.1:${
          (server.address() as net.AddressInfo).port
        }/events`;
        proxy = createWebhookProxy({
          url,
          port: targetPort,
          path: "/test",
          logger: getLog({ level: "fatal" }),
        })!;

        // Wait for proxy to be ready
        proxy.addEventListener("ready", () => done());
      });
    });

    test("forwards events to server", (done) => {
      nock(`http://localhost:${targetPort}`)
        .post("/test")
        .reply(200, () => {
          done();
        });

      const body = { action: "foo" };

      emit({
        body,
        "x-github-event": "test",
      });
    });
  });

  test("logs an error when the proxy server is not found", (done) => {
    const url = "http://bad.proxy/events";
    nock("http://bad.proxy").get("/events").reply(404);

    const log = getLog({ level: "fatal" }).child({});
    log.error = jest.fn();

    proxy = createWebhookProxy({ url, logger: log })!;

    proxy.addEventListener("error", (error: any) => {
      expect(error.status).toBe(404);
      expect(log.error).toHaveBeenCalledWith(error);
      done();
    });
  });
});
