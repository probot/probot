import { readFileSync, writeFileSync } from "node:fs";
import { join as pathJoin } from "node:path";
import dotenv from "dotenv";
import type { Env } from "../types.js";

function escapeNewlines(str: string) {
  return str.replace(/\n/g, "\\n");
}

function format(key: string, value: string) {
  return `${key}=${escapeNewlines(value)}`;
}

export function updateEnv(env: Env): Env {
  const filename = pathJoin(process.cwd(), ".env");

  // Merge with existing values
  try {
    const existing = dotenv.parse(readFileSync(filename, "utf-8"));
    env = Object.assign(existing, env);
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      throw err;
    }
  }

  const contents = (Object.keys(env) as Uppercase<string>[])
    .map((key) => format(key, env[key]!))
    .join("\n");

  // Write to file
  writeFileSync(filename, contents);

  // Update current env with new values
  Object.assign(process.env, env);

  return env;
}
