import { randomInt } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";

import getPort from "get-port";
import fetchMock from "fetch-mock";
import { describe, expect, test } from "vitest";
import { getLog } from "../src/helpers/get-log.js";
import { createWebhookProxy } from "../src/helpers/webhook-proxy.js";
import { getPrintableHost } from "../src/server/get-printable-host.js";
import { detectRuntime } from "../src/helpers/detect-runtime.js";

const sse: (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) => void = require("connect-sse")();

interface SSEResponse extends ServerResponse {
  json(body: any, status?: string): this;
}

describe("webhook-proxy", () => {
  let emit: SSEResponse["json"];
  let proxy: EventSource;

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

      const port = await getPort();

      const server = createServer(
        async (req: IncomingMessage, res: ServerResponse) => {
          // @ts-ignore
          await new Promise<void>((resolve) => sse(req, res, resolve));

          const path = new URL(req.url!, `http://${req.headers.host}`);
          if (path.pathname === "/events") {
            (res as SSEResponse).json({}, "ready");
            emit = (res as SSEResponse).json;
          } else {
            res.writeHead(404).end();
          }
        },
      );

      server.listen(port, async () => {
        let { address: targetHost, port: targetPort } =
          server.address() as AddressInfo;

        targetHost = getPrintableHost(targetHost);

        const url = `http://127.0.0.1:${targetPort}/events`;

        const mock = fetchMock
          .createInstance()
          .postOnce(`http://${targetHost}:${targetPort}/test`, {
            status: 200,
            then: () => {
              finishedPromise.resolve!();
            },
          });
        const customFetch: typeof fetch = async (
          input: string | URL | Request,
          init: RequestInit | undefined,
        ) => {
          if (
            (typeof input === "string" &&
              input.startsWith("http://127.0.0.1")) ||
            (input instanceof URL && input.hostname === "127.0.0.1") ||
            (input instanceof Request && input.url.includes("127.0.0.1"))
          ) {
            return await fetch(input, init);
          }
          return await mock.fetchHandler(input, init);
        };

        proxy = (await createWebhookProxy({
          url,
          host: targetHost,
          port: targetPort,
          path: "/test",
          logger: getLog({ level: "fatal" }),
          fetch: customFetch,
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

      server.close();
      proxy.close();
    });
  });

  test("logs an error when the proxy server is not found", async () => {
    expect.assertions(4);

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

    const LoggerErrorCalls: any[] = [];
    logger.error = (...args: any[]) => {
      LoggerErrorCalls.push(args);
    };

    const proxy = (await createWebhookProxy({
      url,
      port: 1234,
      host: "localhost",
      path: "/",
      logger,
    }))!;

    proxy.addEventListener("error", (error: any) => {
      switch (detectRuntime(globalThis)) {
        case "node":
          expect(error.message).toMatch(/getaddrinfo ENOTFOUND/);
          break;
        case "bun":
          expect(error.message).toEqual(
            "Unable to connect. Is the computer able to access the url?",
          );
          break;
      }

      expect(LoggerErrorCalls).toHaveLength(1);
      expect(LoggerErrorCalls[0]).toHaveLength(1);
      expect(LoggerErrorCalls[0][0]).toEqual(error);

      finishedPromise.resolve!();
    });

    await finishedPromise.promise;

    proxy.close();
  });
});
