import { writeFileSync } from "node:fs";
import { join as pathJoin } from "node:path";
import type { Env } from "../types.js";
import { loadEnv } from "./load-env.js";

function escapeNewlines(str: string) {
  return str.replace(/\n/g, "\\n");
}

function format(key: string, value: string) {
  return `${key}=${escapeNewlines(value)}`;
}

export function updateEnv(env: Env): Env {
  const path = pathJoin(process.cwd(), ".env");

  // Merge with existing values
  env = Object.assign(
    loadEnv({
      path,
    }),
    env,
  );

  const contents = (Object.keys(env) as Uppercase<string>[])
    .map((key) => format(key, env[key]!))
    .join("\n");

  // Write to file
  writeFileSync(path, contents);

  // Update current env with new values
  Object.assign(process.env, env);

  return env;
}
