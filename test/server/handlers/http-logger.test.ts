import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import getPort from "get-port";
import { pino } from "pino";
import type { Options } from "pino-http";
import { describe, expect, test } from "vitest";

import { httpLogger } from "../../../src/server/handlers/http-logger.js";
import { getPayload } from "../../../src/helpers/get-payload.js";
import { MockLoggerTarget } from "../../utils.js";

describe("logging", () => {
  function instantiateServer(output: string[], options = {} as Options) {
    const logger = pino(new MockLoggerTarget(output));
    const loggerMiddleware = httpLogger(logger, options);

    const handler = async (req: IncomingMessage, res: ServerResponse) => {
      await getPayload(req);
      await new Promise<void>((resolve) => loggerMiddleware(req, res, resolve));

      const path = new URL(req.url!, `http://${req.headers.host}`);

      if (path.pathname === "/") {
        if (req.method === "GET") {
          res
            .writeHead(200, {
              "X-Test-Header": "testing",
            })
            .end("OK");
        } else if (req.method === "POST") {
          res.writeHead(200).end("OK");
        } else {
          res.writeHead(404).end();
        }
      }
    };

    const server = createServer(handler);
    return server;
  }

  test("logs requests and responses", async () => {
    const output: any[] = [];
    const server = instantiateServer(output);

    const port = await getPort();

    await new Promise<void>((resolve) => server.listen(port, resolve));

    const response = await fetch(`http://localhost:${port}/`, {
      method: "GET",
      headers: {
        "accept-encoding": "gzip, deflate",
        connection: "close",
      },
      keepalive: false,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-test-header")).toBe("testing");

    expect(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(
        output[0].req.id,
      ),
      output[0].req.id,
    ).toBe(true);
    expect(typeof output[0].responseTime).toBe("number");

    expect(output[0].req.headers["accept-encoding"]).toBe("gzip, deflate");
    expect(output[0].req.headers.connection).toBe("close");
    expect(output[0].req.url).toBe("/");

    server.close();
  });

  test("uses supplied X-Request-ID", async () => {
    const output: any[] = [];
    const server = instantiateServer(output);

    const port = await getPort();

    await new Promise<void>((resolve) => server.listen(port, resolve));

    const response = await fetch(`http://localhost:${port}/`, {
      method: "GET",
      headers: {
        "accept-encoding": "gzip, deflate",
        connection: "close",
        "X-Request-ID": "42",
      },
    });

    expect(response.status).toBe(200);
    expect(output[0].req.id).toBe("42");

    server.close();
  });

  test("uses X-GitHub-Delivery", async () => {
    const output: any[] = [];
    const server = instantiateServer(output);

    const port = await getPort();

    await new Promise<void>((resolve) => server.listen(port, resolve));

    const response = await fetch(`http://localhost:${port}/`, {
      method: "GET",
      headers: {
        "accept-encoding": "gzip, deflate",
        connection: "close",
        "X-GitHub-Delivery": "a-b-c",
      },
    });

    expect(response.status).toBe(200);
    expect(output[0].req.id).toBe("a-b-c");
    expect(output[0].req.headers["x-github-delivery"]).toBe("a-b-c");

    server.close();
  });

  test("sets ignorePaths option to ignore logging", async () => {
    const output: any[] = [];
    const server = instantiateServer(output, {
      autoLogging: {
        ignore: (req) => ["/"].includes(req.url!),
      },
    });

    const port = await getPort();

    await new Promise<void>((resolve) => server.listen(port, resolve));

    const response = await fetch(`http://localhost:${port}/`, {
      method: "GET",
      headers: {
        "accept-encoding": "gzip, deflate",
        connection: "close",
      },
    });

    expect(response.status).toBe(200);
    expect(output.length).toBe(0);

    server.close();
  });
});
