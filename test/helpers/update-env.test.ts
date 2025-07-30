import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as pathJoin } from "node:path";

import { describe, it, expect } from "vitest";

import { updateEnv } from "../../src/helpers/update-env.js";

const originalCwd = process.cwd();
const originalEnv = Object.assign({}, process.env);

describe("update-dotenv", () => {
  it("creates .env, writes new values, sets process.env", () => {
    process.chdir(mkdtempSync(pathJoin(tmpdir(), "update-dotenv")));

    updateEnv({ FOO: "bar" });
    expect(readFileSync(".env", "utf-8")).toBe("FOO=bar");

    expect(process.env.FOO).toBe("bar");
    process.env = originalEnv;
    process.chdir(originalCwd);
  });

  it("properly writes multi-line strings", () => {
    process.chdir(mkdtempSync(pathJoin(tmpdir(), "update-dotenv")));

    updateEnv({ FOO: "bar\nbaz" });
    expect(readFileSync(".env", "utf-8")).toBe("FOO=bar\\nbaz");

    process.env = originalEnv;
    process.chdir(originalCwd);
  });

  it("appends new variables to existing variables", () => {
    process.chdir(mkdtempSync(pathJoin(tmpdir(), "update-dotenv")));

    updateEnv({ FIRST: "foo" });
    updateEnv({ SECOND: "bar" });
    expect(readFileSync(".env", "utf-8")).toBe("FIRST=foo\nSECOND=bar");

    process.env = originalEnv;
    process.chdir(originalCwd);
  });
});
