import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  createTmpDir,
  execCommand,
  scaffoldProject,
  setupTestDirectory,
} from "./utils.js";

async function prepareTestProjectWithProbot() {
  const projectRoot = path.resolve(
    path.dirname(path.resolve(import.meta.dirname)),
    "..",
  );

  try {
    await execCommand("npm link", {
      cwd: projectRoot,
    });
  } catch (error: any) {
    if (error.message.includes("EEXIST")) {
      // Ignore the error if probot is already linked
      console.warn("Probot is already linked, skipping npm link.");
    } else {
      throw error;
    }
  }

  const testDirectories: string[] = [];
  const tmpDirectory = setupTestDirectory();

  const originalCwd = process.cwd();
  process.chdir(tmpDirectory);
  const projectPackage = createTmpDir(tmpDirectory, testDirectories);

  scaffoldProject(projectPackage, [
    {
      filePath: "package.json",
      content: JSON.stringify(
        {
          name: "test-case",
          version: "1.0.0",
          type: "module",
          private: true,
        },
        undefined,
        2,
      ),
    },
  ]);

  await execCommand("npm link probot", {
    cwd: projectPackage,
  });

  function cleanUp() {
    for (const tempDirectory of testDirectories) {
      fs.rmSync(tempDirectory, { recursive: true, force: true });
    }
    process.chdir(originalCwd);
  }

  return {
    path: projectPackage,
    cleanUp,
  };
}

describe(`cli version`, () => {
  test(
    `with flag -v`,
    async () => {
      const testProject = await prepareTestProjectWithProbot();
      expect(
        await execCommand("npx probot -v", {
          cwd: testProject.path,
        }),
      ).toBe(`0.0.0-dev`);

      testProject.cleanUp();
    },
    {
      timeout: 10000,
    },
  );

  test(
    `with flag --version`,
    async () => {
      const testProject = await prepareTestProjectWithProbot();
      expect(
        await execCommand("npx probot --version", {
          cwd: testProject.path,
        }),
      ).toBe(`0.0.0-dev`);

      testProject.cleanUp();
    },
    {
      timeout: 10000,
    },
  );
});
