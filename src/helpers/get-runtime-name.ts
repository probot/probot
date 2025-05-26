import { detectRuntime } from "./detect-runtime.js";

export function getRuntimeName(
  globalThis: Parameters<typeof detectRuntime>[0],
): string {
  const runtime = detectRuntime(globalThis);
  switch (runtime) {
    case "node":
      return "Node.js";
    case "deno":
      return "Deno";
    case "bun":
      return "Bun";
    case "browser":
      return "Browser";
    default:
      throw new Error("Unknown runtime");
  }
}
