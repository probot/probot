import { AssertionError } from "node:assert";
import { dirname } from "node:path";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";

import { execa } from "execa";
import getPort from "get-port";
import { describe, expect, it } from "vitest";

import { sign } from "@octokit/webhooks-methods";

import { getPayload } from "../../src/helpers/get-payload.js";
import { getRuntimeName } from "../../src/helpers/get-runtime-name.js";
import { detectRuntime } from "../../src/helpers/detect-runtime.js";

type RequestHandler = (req: IncomingMessage, res: ServerResponse) => void;

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * In these tests we are starting probot apps by running "npm run [path to app.js]" using ghub.io/execa.
 * This allows us to pass dynamic environment variables for configuration.
 *
 * We also spawn a mock server which receives the Octokit requests from the app and uses vitest assertions
 * to verify they are what we expect
 */
describe("end-to-end-tests", () => {
  const runApp = async (file: string) => {
    const mockServerPort = await getPort();
    const probotPort = await getPort();

    const bodyParser =
      (handler: RequestHandler): RequestHandler =>
      async (req, res) => {
        req.body = await getPayload(req);
        handler(req, res);
      };

    let callCount = 0;
    const handler: RequestHandler = (req, res) => {
      expect(req.method).toBe("POST");
      expect(
        new URL(`http://localhost${req.url!}`).pathname.startsWith("/api/v3"),
      ).toBe(true);

      switch (callCount++) {
        case 0:
          {
            expect(new URL(`http://localhost${req.url!}`).pathname).toBe(
              "/api/v3/app/installations/1/access_tokens",
            );

            res.writeHead(201, {
              "content-type": "application/json",
            });
            res.end(
              JSON.stringify({
                token: "v1.1f699f1069f60xxx",
                permissions: {
                  issues: "write",
                  contents: "read",
                },
                repository_selection: "all",
              }),
            );
          }
          break;
        case 1:
          {
            expect(new URL(`http://localhost${req.url!}`).pathname).toBe(
              "/api/v3/repos/octocat/hello-world/issues/1/comments",
            );

            // @ts-ignore
            expect(req.body).toBe(JSON.stringify({ body: "Hello World!" }));

            res.writeHead(201, {
              "content-type": "application/json",
            });
            res.end("{}");
          }
          break;
        default:
          res.writeHead(404).end();
      }
    };

    const server = createServer(bodyParser(handler));

    await new Promise<void>((resolve) => {
      server.listen(
        { port: mockServerPort, host: "localhost", reusePort: false },
        () => resolve(),
      );
    });

    const probotProcessAbortController = new AbortController();

    const executable = process.argv[0];
    const args = [pathResolve(__dirname, "../../bin/probot.js"), "run", file];

    if (detectRuntime(globalThis) === "deno") {
      args.splice(0, 0, "run", "-A");
    }

    const probotProcess = execa(executable, args, {
      env: {
        APP_ID: "1",
        PRIVATE_KEY: `-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1c7+9z5Pad7OejecsQ0bu3aozN3tihPmljnnudb9G3HECdnH\nlWu2/a1gB9JW5TBQ+AVpum9Okx7KfqkfBKL9mcHgSL0yWMdjMfNOqNtrQqKlN4kE\np6RD++7sGbzbfZ9arwrlD/HSDAWGdGGJTSOBM6pHehyLmSC3DJoR/CTu0vTGTWXQ\nrO64Z8tyXQPtVPb/YXrcUhbBp8i72b9Xky0fD6PkEebOy0Ip58XVAn2UPNlNOSPS\nye+Qjtius0Md4Nie4+X8kwVI2Qjk3dSm0sw/720KJkdVDmrayeljtKBx6AtNQsSX\ngzQbeMmiqFFkwrG1+zx6E7H7jqIQ9B6bvWKXGwIDAQABAoIBAD8kBBPL6PPhAqUB\nK1r1/gycfDkUCQRP4DbZHt+458JlFHm8QL6VstKzkrp8mYDRhffY0WJnYJL98tr4\n4tohsDbqFGwmw2mIaHjl24LuWXyyP4xpAGDpl9IcusjXBxLQLp2m4AKXbWpzb0OL\nUlrfc1ZooPck2uz7xlMIZOtLlOPjLz2DuejVe24JcwwHzrQWKOfA11R/9e50DVse\nhnSH/w46Q763y4I0E3BIoUMsolEKzh2ydAAyzkgabGQBUuamZotNfvJoDXeCi1LD\n8yNCWyTlYpJZJDDXooBU5EAsCvhN1sSRoaXWrlMSDB7r/E+aQyKua4KONqvmoJuC\n21vSKeECgYEA7yW6wBkVoNhgXnk8XSZv3W+Q0xtdVpidJeNGBWnczlZrummt4xw3\nxs6zV+rGUDy59yDkKwBKjMMa42Mni7T9Fx8+EKUuhVK3PVQyajoyQqFwT1GORJNz\nc/eYQ6VYOCSC8OyZmsBM2p+0D4FF2/abwSPMmy0NgyFLCUFVc3OECpkCgYEA5OAm\nI3wt5s+clg18qS7BKR2DuOFWrzNVcHYXhjx8vOSWV033Oy3yvdUBAhu9A1LUqpwy\nMa+unIgxmvmUMQEdyHQMcgBsVs10dR/g2xGjMLcwj6kn+xr3JVIZnbRT50YuPhf+\nns1ScdhP6upo9I0/sRsIuN96Gb65JJx94gQ4k9MCgYBO5V6gA2aMQvZAFLUicgzT\nu/vGea+oYv7tQfaW0J8E/6PYwwaX93Y7Q3QNXCoCzJX5fsNnoFf36mIThGHGiHY6\ny5bZPPWFDI3hUMa1Hu/35XS85kYOP6sGJjf4kTLyirEcNKJUWH7CXY+00cwvTkOC\nS4Iz64Aas8AilIhRZ1m3eQKBgQCUW1s9azQRxgeZGFrzC3R340LL530aCeta/6FW\nCQVOJ9nv84DLYohTVqvVowdNDTb+9Epw/JDxtDJ7Y0YU0cVtdxPOHcocJgdUGHrX\nZcJjRIt8w8g/s4X6MhKasBYm9s3owALzCuJjGzUKcDHiO2DKu1xXAb0SzRcTzUCn\n7daCswKBgQDOYPZ2JGmhibqKjjLFm0qzpcQ6RPvPK1/7g0NInmjPMebP0K6eSPx0\n9/49J6WTD++EajN7FhktUSYxukdWaCocAQJTDNYP0K88G4rtC2IYy5JFn9SWz5oh\nx//0u+zd/R/QRUzLOw4N72/Hu+UG6MNt5iDZFCtapRaKt6OvSBwy8w==\n-----END RSA PRIVATE KEY-----`,
        WEBHOOK_SECRET: "test",
        PORT: String(probotPort),
        GHE_HOST: `localhost:${mockServerPort}`,
        GHE_PROTOCOL: "http",
        LOG_LEVEL: "trace",
        WEBHOOK_PATH: "/",
      },
      stdio: "pipe",
      cancelSignal: probotProcessAbortController.signal,
      forceKillAfterDelay: 1,
    });

    probotProcess.catch(() => {});

    await new Promise<void>((resolve, reject) => {
      probotProcess.stdout?.on("data", (data) => {
        const line = data.toString().trim();
        if (
          line.includes("Running Probot") &&
          line.includes(getRuntimeName(globalThis)) === false
        ) {
          const actualRuntime = line.slice(
            line.lastIndexOf("(") + 1,
            line.lastIndexOf(" ", line.lastIndexOf(")")) - 1,
          );

          reject(
            new AssertionError({
              message: `
                Expected Probot to run on ${getRuntimeName(globalThis)}, but it is running on ${actualRuntime}`,
              actual: actualRuntime,
              expected: getRuntimeName(globalThis),
              operator: "===",
            }),
          );
        }
        if (line.includes("Listening on")) {
          resolve();
        }
      });

      probotProcess.killed && reject(new Error("Probot process was killed"));
      probotProcess.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Probot process exited with code ${code}`));
        }
      });
    });

    // the probot process should be successfully started
    expect(probotProcess.exitCode).toBe(null);

    // send webhook event request
    const body = JSON.stringify({
      action: "opened",
      issue: {
        number: "1",
      },
      repository: {
        owner: {
          login: "octocat",
        },
        name: "hello-world",
      },
      installation: {
        id: 1,
      },
    });

    try {
      const signature = await sign("test", body);

      const response = await fetch(`http://localhost:${probotPort}/`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-github-event": "issues",
          "x-github-delivery": "1",
          "x-hub-signature-256": signature,
        },
        body,
      });

      expect(await response.text()).toBe("ok\n");
    } catch (error) {
      const awaitedProcess = await probotProcess;
      console.log(awaitedProcess.stdout);
      console.log(awaitedProcess.stderr);
      throw error;
    } finally {
      server.close();
      try {
        probotProcessAbortController.abort();
      } catch {}
    }

    expect(callCount).toBe(2);
  };
  it("runs a hello world app (CJS)", () =>
    runApp("./test/e2e/hello-world.cjs"));
  it("runs a hello world app (ESM)", () =>
    runApp("./test/e2e/hello-world.mjs"));
});
