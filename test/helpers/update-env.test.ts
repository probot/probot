import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as pathJoin } from "node:path";

import { describe, it, expect } from "vitest";

import { updateEnv } from "../../src/helpers/update-env.js";

describe("update-dotenv", () => {
  it("creates .env, writes new values, and updates the supplied environment", () => {
    const path = pathJoin(
      mkdtempSync(pathJoin(tmpdir(), "update-env")),
      ".env",
    );
    const env: NodeJS.ProcessEnv = {};

    updateEnv({ FOO: "bar" }, { path, env });
    expect(readFileSync(path, "utf-8")).toBe("FOO=bar");
    expect(env.FOO).toBe("bar");
  });

  it("properly writes multi-line strings", () => {
    const path = pathJoin(
      mkdtempSync(pathJoin(tmpdir(), "update-env")),
      ".env",
    );

    updateEnv({ FOO: "bar\nbaz" }, { path, env: {} });
    expect(readFileSync(path, "utf-8")).toBe("FOO=bar\\nbaz");
  });

  it("updates process.env by default for backwards compatibility", () => {
    const path = pathJoin(
      mkdtempSync(pathJoin(tmpdir(), "update-env")),
      ".env",
    );
    const previous = process.env.PROBOT_TEST_UPDATE_ENV;

    try {
      updateEnv({ PROBOT_TEST_UPDATE_ENV: "bar" }, { path });
      expect(process.env.PROBOT_TEST_UPDATE_ENV).toBe("bar");
    } finally {
      if (previous === undefined) delete process.env.PROBOT_TEST_UPDATE_ENV;
      else process.env.PROBOT_TEST_UPDATE_ENV = previous;
    }
  });

  it("appends new variables to existing variables", () => {
    const path = pathJoin(
      mkdtempSync(pathJoin(tmpdir(), "update-env")),
      ".env",
    );
    const env: NodeJS.ProcessEnv = {};

    updateEnv({ FIRST: "foo" }, { path, env });
    updateEnv({ SECOND: "bar" }, { path, env });
    expect(readFileSync(path, "utf-8")).toBe("FIRST=foo\nSECOND=bar");
  });
});
