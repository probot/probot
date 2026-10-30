import { detectRuntime } from "./detect-runtime.js";

const runtimeVersions: Record<
  ReturnType<typeof detectRuntime>,
  (globalThis: Parameters<typeof detectRuntime>[0]) => string
> = {
  node: (globalThis) => getVersion(globalThis.process?.versions?.node),
  deno: (globalThis) => getVersion(globalThis.process?.versions?.deno),
  bun: (globalThis) => getVersion(globalThis.process?.versions?.bun),
  browser: () => "N/A",
};

function getVersion(version: string | undefined): string {
  return version as string;
}

export function getRuntimeVersion(
  globalThis: Parameters<typeof detectRuntime>[0],
): string {
  return runtimeVersions[detectRuntime(globalThis)](globalThis);
}
