import { randomInt } from "node:crypto";
import http from "node:http";
import net from "node:net";

import express, { type Response } from "express";
const sse: (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => void = require("connect-sse")();
import fetchMock from "fetch-mock";
import { describe, expect, afterEach, test, vi } from "vitest";
import { getLog } from "../src/helpers/get-log.js";
import { createWebhookProxy } from "../src/helpers/webhook-proxy.js";

let targetPort = 999999;

interface SSEResponse extends Response {
  json(body: any, status?: string): this;
}

describe("webhook-proxy", () => {
  let emit: SSEResponse["json"];
  let proxy: EventSource;
  let server: http.Server;

  afterEach(() => {
    server && server.close();
    proxy && proxy.close();
  });

  describe("with a valid proxy server", () => {
    test("forwards events to server", async () => {
      let readyPromise = {
        promise: undefined,
        reject: undefined,
        resolve: undefined,
      } as {
        promise?: Promise<any>;
        resolve?: (value?: any) => any;
        reject?: (reason?: any) => any;
      };

      readyPromise.promise = new Promise((resolve, reject) => {
        readyPromise.resolve = resolve;
        readyPromise.reject = reject;
      });

      let finishedPromise = {
        promise: undefined,
        reject: undefined,
        resolve: undefined,
      } as {
        promise?: Promise<any>;
        resolve?: (value?: any) => any;
        reject?: (reason?: any) => any;
      };

      finishedPromise.promise = new Promise((resolve, reject) => {
        finishedPromise.resolve = resolve;
        finishedPromise.reject = reject;
      });

      const app = express();

      app.get("/events", sse, (_req, res: SSEResponse) => {
        res.json({}, "ready");
        emit = res.json;
      });

      server = app.listen(0, async () => {
        targetPort = (server.address() as net.AddressInfo).port;
        const url = `http://127.0.0.1:${targetPort}/events`;

        const fetch = fetchMock
          .sandbox()
          .postOnce(`http://localhost:${targetPort}/test`, {
            status: 200,
            then: () => {
              finishedPromise.resolve!();
            },
          });

        proxy = (await createWebhookProxy({
          url,
          port: targetPort,
          path: "/test",
          logger: getLog({ level: "fatal" }),
          fetch,
        })) as EventSource;

        // Wait for proxy to be ready
        proxy.addEventListener("ready", readyPromise.resolve!);
      });

      await readyPromise.promise;

      emit({
        body: { action: "foo" },
        "x-github-event": "test",
      });

      await finishedPromise.promise;
    });
  });

  test("logs an error when the proxy server is not found", async () => {
    expect.assertions(2);

    let finishedPromise = {
      promise: undefined,
      reject: undefined,
      resolve: undefined,
    } as {
      promise?: Promise<any>;
      resolve?: (value?: any) => any;
      reject?: (reason?: any) => any;
    };

    finishedPromise.promise = new Promise((resolve, reject) => {
      finishedPromise.resolve = resolve;
      finishedPromise.reject = reject;
    });

    const url = `http://bad.n${randomInt(1e10).toString(36)}.proxy/events`;

    const logger = getLog({ level: "fatal" }).child({});
    logger.error = vi.fn() as any;

    createWebhookProxy({ url, logger })!.then((proxy) => {
      (proxy as EventSource).addEventListener("error", (error: any) => {
        expect(error.message).toMatch(/^getaddrinfo ENOTFOUND/);
        expect(logger.error).toHaveBeenCalledWith(error);
        finishedPromise.resolve!();
      });
    });

    await finishedPromise.promise;
  });
});
