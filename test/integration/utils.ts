import { exec } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function setupTestDirectory() {
  const tmpDirectory = path.resolve(
    path.dirname(path.resolve(import.meta.dirname)),
    "..",
    "tmp",
  );

  fs.mkdirSync(tmpDirectory, { recursive: true });

  return tmpDirectory;
}

interface SetupFile {
  filePath: string;
  content: string;
  mode?: number;
}

export function scaffoldProject(basePath: string, files: SetupFile[]) {
  for (const { filePath, content, mode } of files) {
    fs.mkdirSync(path.dirname(path.resolve(basePath, filePath)), {
      recursive: true,
    });
    fs.writeFileSync(path.resolve(basePath, filePath), content);
    if (mode !== undefined) {
      fs.chmodSync(path.resolve(basePath, filePath), mode);
    }
  }
}

export async function execCommand(
  command: string,
  options = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      stderr && console.error(stderr);
      if (error) {
        reject(error);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

export function createTmpDir(
  testTmpDirectory: string,
  tmpDirectories: string[],
): string {
  const runId = crypto.randomBytes(6).toString("hex");
  const tmpDir = path.resolve(testTmpDirectory, fs.mkdtempSync(runId));
  tmpDirectories.push(tmpDir);
  return tmpDir;
}
