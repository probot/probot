import { beforeEach, describe, expect, it, vi } from "vitest";
import getPort from "get-port";
import pino from "pino";
import { Probot } from "../src/probot.js";
import { Server } from "../src/server/server.js";

const getLog = vi.fn();

describe("Server initialization without a logger", () => {
  beforeEach(() => {
    getLog.mockReset();
  });

  it("initializes successfully with a logger loaded on demand", async () => {
    const log = pino({ level: "silent" });
    getLog.mockResolvedValueOnce(log);

    const server = new Server({
      Probot: Probot.defaults({ appId: 1, privateKey: "dummy" }),
      port: await getPort(),
      getLog,
    });

    try {
      await server.start();
      expect(getLog).toHaveBeenCalledTimes(1);
    } finally {
      await server.stop();
    }
  });

  it("reports logger initialization failures to stderr", async () => {
    const error = new Error("logger initialization failed");
    getLog.mockRejectedValueOnce(error);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const server = new Server({
      Probot: Probot.defaults({ appId: 1, privateKey: "dummy" }),
      getLog,
    });

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
