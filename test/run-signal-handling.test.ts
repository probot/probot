import path from "node:path";
import { fileURLToPath } from "node:url";

import getPort from "get-port";
import { pino } from "pino";
import { describe, expect, it, vi } from "vitest";

import { run } from "../src/run.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const privateKeyPath = path.join(__dirname, "fixtures", "test-private-key.pem");

describe("run SIGINT handling", () => {
  it("stops cleanly on SIGINT", async () => {
    const on = vi.spyOn(process, "on");
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const server = await run(() => {}, {
      env: {
        APP_ID: "1",
        PRIVATE_KEY_PATH: privateKeyPath,
        PORT: String(await getPort()),
      },
      log: pino({ level: "silent" }),
    });

    try {
      const handler = on.mock.calls.find(([event]) => event === "SIGINT")?.[1];
      expect(handler).toBeTypeOf("function");

      await (handler as () => Promise<void>)();

      expect(info).toHaveBeenNthCalledWith(1, "Stopping server...");
      expect(info).toHaveBeenNthCalledWith(2, "Server stopped");
      expect(exit).toHaveBeenCalledWith(0);
    } finally {
      const handler = on.mock.calls.find(([event]) => event === "SIGINT")?.[1];
      if (handler) {
        process.removeListener("SIGINT", handler as (...args: any[]) => void);
      }
      on.mockRestore();
      exit.mockRestore();
      info.mockRestore();
      await server.stop();
    }
  });

  it("exits with an error when SIGINT cannot stop the server", async () => {
    const on = vi.spyOn(process, "on");
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const server = await run(() => {}, {
      env: {
        APP_ID: "1",
        PRIVATE_KEY_PATH: privateKeyPath,
        PORT: String(await getPort()),
      },
      log: pino({ level: "silent" }),
    });
    const stop = vi
      .spyOn(server, "stop")
      .mockRejectedValue(new Error("stop failed"));

    try {
      const handler = on.mock.calls.find(([event]) => event === "SIGINT")?.[1];
      expect(handler).toBeTypeOf("function");

      await (handler as () => Promise<void>)();

      expect(error).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        "Error while stopping server",
      );
      expect(info).toHaveBeenCalledWith("Stopping server...");
      expect(exit).toHaveBeenCalledWith(1);
    } finally {
      const handler = on.mock.calls.find(([event]) => event === "SIGINT")?.[1];
      if (handler) {
        process.removeListener("SIGINT", handler as (...args: any[]) => void);
      }
      stop.mockRestore();
      on.mockRestore();
      exit.mockRestore();
      info.mockRestore();
      error.mockRestore();
      await server.stop();
    }
  });
});
