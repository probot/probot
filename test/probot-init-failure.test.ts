import { describe, expect, it, vi } from "vitest";

import { Probot } from "../src/probot.js";

const getLog = vi.fn();

describe("Probot initialization failures", () => {
  it("reports failures before a logger is available", async () => {
    const error = new Error("logger initialization failed");
    getLog.mockRejectedValueOnce(error);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const probot = new Probot({ githubToken: "token", getLog });

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
