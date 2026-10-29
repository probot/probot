import { detectRuntime } from "./detect-runtime.js";

const runtimeNames: Record<ReturnType<typeof detectRuntime>, string> = {
  node: "Node.js",
  deno: "Deno",
  bun: "Bun",
  browser: "Browser",
};

export function getRuntimeName(
  globalThis: Parameters<typeof detectRuntime>[0],
): string {
  return runtimeNames[detectRuntime(globalThis)];
}
