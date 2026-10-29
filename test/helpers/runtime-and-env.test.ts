import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { getPrintableHost } from "../../src/helpers/get-printable-host.js";
import { loadEnv } from "../../src/helpers/load-env.js";
import { getRuntimeName } from "../../src/helpers/get-runtime-name.js";
import { getRuntimeVersion } from "../../src/helpers/get-runtime-version.js";

describe("runtime helpers", () => {
  const runtimes = [
    {
      globalThis: { process: { versions: { node: "26.0.0" } } },
      name: "Node.js",
      version: "26.0.0",
    },
    {
      globalThis: { process: { versions: { deno: "2.0.0" } } },
      name: "Deno",
      version: "2.0.0",
    },
    {
      globalThis: { process: { versions: { bun: "1.0.0" } } },
      name: "Bun",
      version: "1.0.0",
    },
    { globalThis: { window: {} }, name: "Browser", version: "N/A" },
  ] as const;

  it.each(runtimes)("identifies $name", ({ globalThis, name, version }) => {
    expect(getRuntimeName(globalThis)).toBe(name);
    expect(getRuntimeVersion(globalThis)).toBe(version);
  });
});

describe("getPrintableHost", () => {
  it.each([
    [undefined, "localhost"],
    ["", ""],
    ["127.0.0.1", "127.0.0.1"],
    ["::1", "[::1]"],
  ])("formats %s", (host, expected) => {
    expect(getPrintableHost(host)).toBe(expected);
  });
});

describe("loadEnv", () => {
  const loadEnvFixture = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../fixtures/load-env.env",
  );

  it("returns an empty object when the file does not exist", () => {
    expect(loadEnv({ path: "/path/that/does/not/exist/.env" })).toEqual({});
  });

  it("uses the default path when options are null", () => {
    expect(loadEnv(null as any)).toBeTypeOf("object");
  });

  it("parses an existing env file", () => {
    expect(loadEnv({ path: loadEnvFixture })).toMatchObject({
      FOO: "bar",
      EMPTY: "",
    });
  });

  it("rethrows errors other than missing files", () => {
    expect(() => loadEnv({ path: process.cwd() })).toThrow();
  });
});
