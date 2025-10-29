import { loadEnv } from "./load-env.js";

interface ApplyEnvOptions {
  path?: string;
}

export function applyEnv(options = {} as ApplyEnvOptions): void {
  const env = loadEnv(options);
  Object.assign(process.env, env);
}
