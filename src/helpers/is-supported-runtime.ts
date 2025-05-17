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
      return false;
    }
    default: {
      return false;
    }
  }
}
