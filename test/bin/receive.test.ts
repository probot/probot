import path from "node:path";

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLog: vi.fn(),
  resolveAppFunction: vi.fn(),
  Probot: vi.fn(),
}));

vi.mock("../../src/helpers/get-log.js", () => ({
  getLog: mocks.getLog,
}));
vi.mock("../../src/helpers/resolve-app-function.js", () => ({
  resolveAppFunction: mocks.resolveAppFunction,
}));
vi.mock("../../src/probot.js", () => ({ Probot: mocks.Probot }));
vi.mock("@probot/get-private-key", () => ({
  getPrivateKey: vi.fn(() => {
    throw new Error("missing private key");
  }),
}));

afterAll(() => {
  vi.doUnmock("../../src/helpers/get-log.js");
  vi.doUnmock("../../src/helpers/resolve-app-function.js");
  vi.doUnmock("../../src/probot.js");
  vi.doUnmock("@probot/get-private-key");
  vi.resetModules();
});

import { receive } from "../../src/bin/receive.js";

describe("receive", () => {
  const payloadPath = path.resolve("test/fixtures/webhook/push.json");
  const appPath = path.resolve("test/fixtures/example.js");
  const log = { debug: vi.fn() };
  const load = vi.fn();
  const receiveEvent = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getLog.mockResolvedValue(log);
    mocks.resolveAppFunction.mockResolvedValue(vi.fn());
    mocks.Probot.mockImplementation(function () {
      return { load, receive: receiveEvent };
    });
    load.mockResolvedValue(undefined);
    receiveEvent.mockResolvedValue(undefined);
  });

  it("prints help when required event options are missing", async () => {
    const print = vi.spyOn(console, "log").mockImplementation(() => {});

    await receive(["--event", "", "--payload-path", ""]);

    expect(print).toHaveBeenCalledWith(
      expect.stringContaining("Usage: probot receive"),
    );
  });

  it("prints help when requested", async () => {
    const print = vi.spyOn(console, "log").mockImplementation(() => {});

    await receive(["--help"]);

    expect(print).toHaveBeenCalledWith(
      expect.stringContaining("Usage: probot receive"),
    );
    expect(mocks.Probot).not.toHaveBeenCalled();
  });

  it("exits when no app function is supplied", async () => {
    const exitError = new Error("process.exit called");
    const exit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw exitError;
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      receive(["--event", "push", "--payload-path", payloadPath]),
    ).rejects.toThrow(exitError);

    expect(exit).toHaveBeenCalledWith(1);
  });

  it("loads the app and receives the payload", async () => {
    await receive([
      "--event",
      "push",
      "--payload-path",
      payloadPath,
      "--token",
      "token",
      appPath,
    ]);

    expect(mocks.resolveAppFunction).toHaveBeenCalledWith(appPath);
    expect(load).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ cwd: process.cwd() }),
    );
    expect(log.debug).toHaveBeenCalledWith(
      { event: "push" },
      "Receiving event",
    );
    expect(receiveEvent).toHaveBeenCalledWith(
      expect.objectContaining({ name: "push", id: expect.any(String) }),
    );
  });

  it("warns when no credentials are available", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    await receive([
      "--event",
      "push",
      "--payload-path",
      payloadPath,
      "--app",
      "",
      appPath,
    ]);

    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining("No token specified"),
    );
  });

  it("warns when an app ID is present but the private key is missing", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

    await receive([
      "--event",
      "push",
      "--payload-path",
      payloadPath,
      "--app",
      "1",
      appPath,
    ]);

    expect(warning).toHaveBeenCalledWith(
      expect.stringContaining("No token specified"),
    );
  });

  it("uses HTTPS for GitHub Enterprise when no protocol is configured", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("GHE_HOST", "github.example.com");
    vi.stubEnv("GHE_PROTOCOL", "");

    try {
      await receive([
        "--event",
        "push",
        "--payload-path",
        payloadPath,
        "--token",
        "token",
        appPath,
      ]);

      expect(mocks.Probot).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: "https://github.example.com/api/v3",
        }),
      );
      expect(warning).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("rejects when the app tries to register a server handler", async () => {
    load.mockImplementationOnce(
      async (_app: unknown, options: { addHandler: () => void }) => {
        options.addHandler();
      },
    );

    await expect(
      receive([
        "--event",
        "push",
        "--payload-path",
        payloadPath,
        "--token",
        "token",
        appPath,
      ]),
    ).rejects.toThrow("No server instance");
  });

  it("exits when receiving the event fails", async () => {
    const exit = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    receiveEvent.mockRejectedValueOnce(new Error("event failed"));

    await receive([
      "--event",
      "push",
      "--payload-path",
      payloadPath,
      "--token",
      "token",
      appPath,
    ]);
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
  });
});
