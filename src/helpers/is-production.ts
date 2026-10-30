import type { Env } from "../types.js";

export function isProduction(env?: Env) {
  return (env ?? process.env).NODE_ENV === "production";
}
