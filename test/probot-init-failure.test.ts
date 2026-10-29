import { describe, expect, it, vi } from "vitest";

const getLog = vi.hoisted(() => vi.fn());

vi.mock("../src/helpers/get-log.js", () => ({ getLog }));

import { Probot } from "../src/probot.js";

describe("Probot initialization failures", () => {
  it("reports failures before a logger is available", async () => {
    const error = new Error("logger initialization failed");
    getLog.mockRejectedValueOnce(error);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const probot = new Probot({ githubToken: "token" });

      await expect(probot.ready()).rejects.toThrow(error);
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to initialize Probot",
        error,
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
