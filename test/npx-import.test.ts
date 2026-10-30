import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

const packageLockJson = JSON.parse(
  readFileSync(join(__dirname, "../package-lock.json"), "utf8"),
);

const npxImportRE = /npxImport(?:<[^>]+>)?\("([^"]+)/gu;

const checkForFixedNpxImport = (
  dir: string,
  pkg: string,
  version: string,
): number => {
  const files = readdirSync(dir, { withFileTypes: true });
  let matchesFound = 0;

  for (let i = 0; i < files.length; i++) {
    const file = join(dir, files[i].name);
    if (files[i].isDirectory()) {
      matchesFound += checkForFixedNpxImport(file, pkg, version);
    } else {
      if (file.endsWith(".ts")) {
        const fileContent = readFileSync(file, "utf8"); // Ensure the file is readable
        for (const matches of fileContent.matchAll(npxImportRE)) {
          if (
            matches[1].startsWith(pkg) &&
            matches[1] !== `${pkg}@${version}`
          ) {
            throw new Error(
              `Found npxImport for ${matches[1]} in ${file}, expected version ${pkg}@${version}. Please update the import to use the fixed version.`,
            );
          }
          if (matches[1].startsWith(pkg)) matchesFound++;
        }
      }
    }
  }

  return matchesFound;
};

describe("smee-client", () => {
  it("should be ensured that smee-client is the same version as in the package-lock.json", () => {
    expect(
      typeof packageLockJson.packages["node_modules/smee-client"].version,
    ).toBe("string");
    expect(packageLockJson.packages["node_modules/smee-client"].dev).toBe(true);
    expect(
      checkForFixedNpxImport(
        join(__dirname, "../src"),
        "smee-client",
        packageLockJson.packages["node_modules/smee-client"].version,
      ),
    ).toBeGreaterThan(0);
  });
});

describe("ioredis", () => {
  it(
    "should be ensured that ioredis is the same version as in the package-lock.json",
    { skip: !!process.env.NO_IOREDIS },
    () => {
      expect(
        typeof packageLockJson.packages["node_modules/ioredis"].version,
      ).toBe("string");
      expect(packageLockJson.packages["node_modules/ioredis"].dev).toBe(true);
      expect(
        checkForFixedNpxImport(
          join(__dirname, "../src"),
          "ioredis",
          packageLockJson.packages["node_modules/ioredis"].version,
        ),
      ).toBeGreaterThan(0);
    },
  );
});
