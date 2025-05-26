import { detectRuntime } from "./detect-runtime.js";

export function isSupportedRuntime(globalThis: any): boolean {
  switch (detectRuntime(globalThis)) {
    case "node": {
      const [major, minor] = globalThis.process.versions.node
        .split(".", 2)
        .map(Number);

      return major >= 22 || (major === 20 && minor >= 17);
    }
    case "deno": {
      return false;
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
