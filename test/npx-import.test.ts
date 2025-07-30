import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

const packageLockJson = JSON.parse(
  readFileSync(join(__dirname, "../package-lock.json"), "utf8"),
);

const npxImportRE = /npxImport(?:<[^>]+>)?\("([^"]+)/gu;

const checkForFixedNpxImport = (dir: string, pkg: string, version: string) => {
  const files = readdirSync(dir);

  for (let i = 0; i < files.length; i++) {
    let file = join(dir, files[i]);
    if (statSync(file).isDirectory()) {
      checkForFixedNpxImport(file, pkg, version);
    } else {
      if (file.endsWith(".ts")) {
        const fileContent = readFileSync(file, "utf8"); // Ensure the file is readable
        const matches = npxImportRE.exec(fileContent);
        if (matches) {
          if (
            matches[1].startsWith(pkg) &&
            matches[1] !== `${pkg}@${version}`
          ) {
            throw new Error(
              `Found npxImport for ${matches[1]} in ${file}, expected version ${pkg}@${version}. Please update the import to use the fixed version.`,
            );
          }
        }
      }
    }
  }
};

describe("smee-client", () => {
  it("should be ensured that smee-client is the same version as in the package-lock.json", () => {
    expect(
      typeof packageLockJson.packages["node_modules/smee-client"].version,
    ).toBe("string");
    expect(packageLockJson.packages["node_modules/smee-client"].dev).toBe(true);
    checkForFixedNpxImport(
      join(__dirname, "../src"),
      "smee-client",
      packageLockJson.packages["node_modules/smee-client"].version,
    );
  });
});

describe("ioredis", () => {
  it(
    "should be ensured that ioredis is the same version as in the package-lock.json",
    () => {
      expect(
        typeof packageLockJson.packages["node_modules/ioredis"].version,
      ).toBe("string");
      expect(packageLockJson.packages["node_modules/ioredis"].dev).toBe(true);
      checkForFixedNpxImport(
        join(__dirname, "../src"),
        "ioredis",
        packageLockJson.packages["node_modules/ioredis"].version,
      );
    },
    { skip: !!process.env.NO_IOREDIS },
  );
});
