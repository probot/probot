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

describe(`cli help`, () => {
  test(
    `with flag -h`,
    async () => {
      const testProject = await prepareTestProjectWithProbot();
      expect(
        await execCommand("npx probot -h", {
          cwd: testProject.path,
        }),
      ).toBe(`Usage: probot <command> [options]

Options:
  -v, --version   output the version number
  -h, --help      display help for command

Commands:
  run             run the bot
  receive         Receive a single event and payload
  help [command]  display help for command`);

      testProject.cleanUp();
    },
    {
      timeout: 10000,
    },
  );

  test(
    `with flag --help`,
    async () => {
      const testProject = await prepareTestProjectWithProbot();
      expect(
        await execCommand("npx probot --help", {
          cwd: testProject.path,
        }),
      ).toBe(`Usage: probot <command> [options]

Options:
  -v, --version   output the version number
  -h, --help      display help for command

Commands:
  run             run the bot
  receive         Receive a single event and payload
  help [command]  display help for command`);

      testProject.cleanUp();
    },
    {
      timeout: 10000,
    },
  );

  test(
    `with no flags at all`,
    async () => {
      const testProject = await prepareTestProjectWithProbot();
      expect(
        await execCommand("npx probot", {
          cwd: testProject.path,
        }),
      ).toBe(`Usage: probot <command> [options]

Options:
  -v, --version   output the version number
  -h, --help      display help for command

Commands:
  run             run the bot
  receive         Receive a single event and payload
  help [command]  display help for command`);

      testProject.cleanUp();
    },
    {
      timeout: 10000,
    },
  );
});
