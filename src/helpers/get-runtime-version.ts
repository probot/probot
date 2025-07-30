import { detectRuntime } from "./detect-runtime.js";

export function getRuntimeVersion(
  globalThis: Parameters<typeof detectRuntime>[0],
): string {
  const runtime = detectRuntime(globalThis);
  switch (runtime) {
    case "node":
      return globalThis.process!.versions!.node!;
    case "deno":
      return globalThis.process!.versions!.deno!;
    case "bun":
      return globalThis.process!.versions!.bun!;
    case "browser":
      return "N/A";
    default:
      throw new Error("Unknown runtime");
  }
}
