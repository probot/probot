import { detectRuntime } from "./detect-runtime.js";

export function isSupportedRuntime(globalThis: any): boolean {
  switch (detectRuntime(globalThis)) {
    case "node": {
      const [major, minor, patch] = globalThis.process.versions.node
        .split(".", 3)
        .map(Number);

      return (
        major >= 22 ||
        (major === 20 && (minor > 18 || (minor === 18 && patch >= 1)))
      );
    }
    case "deno": {
      const [major, minor] = globalThis.process.versions.deno
        .split(".", 2)
        .map(Number);

      return major >= 3 || (major === 2 && minor >= 3);
    }
    case "bun": {
      const [major, minor] = globalThis.process.versions.bun
        .split(".", 2)
        .map(Number);

      return major > 1 || (major === 1 && minor >= 2);
    }
    default: {
      return false;
    }
  }
}
