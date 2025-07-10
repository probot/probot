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

import { createDeferredPromise } from "../src/helpers/create-deferred-promise.js";
import { getLog } from "../src/helpers/get-log.js";
import { createWebhookProxy } from "../src/helpers/webhook-proxy.js";
import { getPrintableHost } from "../src/helpers/get-printable-host.js";
import { detectRuntime } from "../src/helpers/detect-runtime.js";

function sse(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<(obj: Record<string, any>, type?: string | undefined) => void> {
  return new Promise<Awaited<ReturnType<typeof sse>>>((resolve, reject) => {
    try {
      req.socket.setTimeout(0);
      res.statusCode = 200;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let message_count = 0;

      resolve((obj, type) => {
        res.write("id: " + ++message_count + "\n");
        if ("string" === typeof type) {
          res.write("event: " + type + "\n");
        }
        res.write("data: " + JSON.stringify(obj) + "\n\n");
      });
    } catch (error) {
      reject(error);
    }
  });
}

// @ts-ignore
const smeeClientInstalled = await import("smee-client")
  .then(() => true)
  .catch(() => false);

describe("webhook-proxy", () => {
  let emit: Awaited<ReturnType<typeof sse>>;
  let proxy: EventSource;

  test(
    "with a valid proxy server forwards events to server",
    async () => {
      const readyPromise = createDeferredPromise<void>();
      const finishedPromise = createDeferredPromise<void>();

      const port = await getPort();

      const server = createServer(
        async (req: IncomingMessage, res: ServerResponse) => {
          const path = new URL(req.url!, `http://${req.headers.host}`);
          if (path.pathname === "/events") {
            emit = await sse(req, res);
            emit({}, "ready");
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
              finishedPromise.resolve();
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
          logger: await getLog({ level: "fatal" }),
          fetch: customFetch,
        })) as EventSource;

        if (!proxy) {
          readyPromise.reject(new Error("proxy is undefined"));
          return;
        }

        readyPromise.resolve();
      });

      await readyPromise.promise;

      emit({
        body: { action: "foo" },
        "x-github-event": "test",
      });

      await finishedPromise.promise;

      server.close();
      proxy.close();
    },
    { skip: !smeeClientInstalled },
  );

  test(
    "logs an error when the proxy server is not found",
    async () => {
      const domain = "bad.n" + randomInt(1e10).toString(36) + ".proxy";
      const url = `http://${domain}/events`;

      const logger = (await getLog({ level: "fatal" })).child({});

      const LoggerErrorCalls: any[] = [];
      logger.error = (...args: any[]) => {
        LoggerErrorCalls.push(args);
      };

      try {
        await createWebhookProxy({
          url,
          port: 1234,
          host: "localhost",
          path: "/",
          logger,
        });
        throw new Error("Expected an error to be thrown");
      } catch (error: any) {
        switch (detectRuntime(globalThis)) {
          case "node":
          case "deno":
            expect(error.message).toBe(
              `TypeError: fetch failed: getaddrinfo ENOTFOUND ${domain}`,
            );
            break;
          case "bun":
            expect(error.message).toBe(
              "Unable to connect. Is the computer able to access the url?",
            );
            break;
        }

        expect(LoggerErrorCalls.length).toBe(1);
        expect(LoggerErrorCalls[0].length).toBe(2);
        expect(LoggerErrorCalls[0][0]).toBe("Error in connection");
        expect(LoggerErrorCalls[0][1]).toBe(error);
      }
    },
    { skip: !smeeClientInstalled },
  );
});
