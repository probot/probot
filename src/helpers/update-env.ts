import { writeFileSync } from "node:fs";
import { join as pathJoin } from "node:path";
import type { Env } from "../types.js";
import { loadEnv } from "./load-env.js";

type UpdateEnvOptions = {
  env?: Env;
  path?: string;
};

function escapeNewlines(str: string) {
  return str.replace(/\n/g, "\\n");
}

function format(key: string, value: string) {
  return `${key}=${escapeNewlines(value)}`;
}

export function updateEnv(values: Env, options: UpdateEnvOptions = {}): Env {
  const path = options.path || pathJoin(process.cwd(), ".env");

  // Merge with existing values
  const env = Object.assign(
    loadEnv({
      path,
    }),
    values,
  );

  const contents = (Object.keys(env) as Uppercase<string>[])
    .map((key) => format(key, env[key]!))
    .join("\n");

  // Write to file
  writeFileSync(path, contents);

  // Update current env with new values
  Object.assign(options.env || process.env, env);

  return env;
}
