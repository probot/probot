import { detectRuntime } from "./detect-runtime.js";

const runtimeVersions: Record<
  ReturnType<typeof detectRuntime>,
  (globalThis: Parameters<typeof detectRuntime>[0]) => string
> = {
  node: (globalThis) => globalThis.process!.versions!.node!,
  deno: (globalThis) => globalThis.process!.versions!.deno!,
  bun: (globalThis) => globalThis.process!.versions!.bun!,
  browser: () => "N/A",
};

export function getRuntimeVersion(
  globalThis: Parameters<typeof detectRuntime>[0],
): string {
  return runtimeVersions[detectRuntime(globalThis)](globalThis);
}
