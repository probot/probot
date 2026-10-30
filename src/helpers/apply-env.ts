import { loadEnv } from "./load-env.js";

interface ApplyEnvOptions {
  path?: string;
}

export function applyEnv(options: ApplyEnvOptions = {}): void {
  const env = loadEnv(options);
  Object.assign(process.env, env);
}
