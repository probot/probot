import { describe, expect, it, vi } from "vitest";
import getPort from "get-port";
import pino from "pino";

const getLog = vi.hoisted(() => vi.fn());

vi.mock("../src/helpers/get-log.js", () => ({ getLog }));

import { Server } from "../src/server/server.js";

describe("Server initialization without a logger", () => {
  it("initializes successfully with a logger loaded on demand", async () => {
    const log = pino({ level: "silent" });
    getLog.mockResolvedValueOnce(log);

    class ReadyProbot {
      async ready(): Promise<void> {}

      async getNodeMiddleware(): Promise<() => boolean> {
        return () => false;
      }
    }

    const server = new Server({
      Probot: ReadyProbot as any,
      port: await getPort(),
    });

    await server.start();
    await server.stop();

    expect(getLog).toHaveBeenCalledTimes(1);
  });

  it("reports logger initialization failures to stderr", async () => {
    const error = new Error("logger initialization failed");
    getLog.mockRejectedValueOnce(error);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const server = new Server();

    try {
      await expect(server.start()).rejects.toThrow(error);
      await expect(server.start()).rejects.toThrow(error);
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to initialize Server",
        error,
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
