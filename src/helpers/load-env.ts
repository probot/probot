import { readFileSync } from "node:fs";
import { join as pathJoin } from "node:path";
import { parseEnv } from "node:util";
import type { Env } from "../types.js";

interface LoadEnvOptions {
  path?: string;
}

export function loadEnv(options = {} as LoadEnvOptions): Env {
  const { path = pathJoin(process.cwd(), ".env") } = options || {};

  try {
    return parseEnv(readFileSync(path, "utf-8"));
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }
  return {};
}
