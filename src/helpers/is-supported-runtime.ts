import { detectRuntime, type GlobalThis } from "./detect-runtime.js";

export function isSupportedRuntime(globalThis: GlobalThis): boolean {
  switch (detectRuntime(globalThis)) {
    case "node": {
      const versions = (globalThis.process as { versions: { node: string } })
        .versions;
      const version = versions.node;
      const [major, minor, patch] = version.split(".", 3).map(Number);

      return (
        major >= 22 ||
        (major === 20 && (minor > 18 || (minor === 18 && patch >= 1)))
      );
    }
    case "deno": {
      const versions = (globalThis.process as { versions: { deno: string } })
        .versions;
      const version = versions.deno;
      const [major, minor] = version.split(".", 2).map(Number);

      return major >= 3 || (major === 2 && minor >= 3);
    }
    case "bun": {
      const versions = (globalThis.process as { versions: { bun: string } })
        .versions;
      const version = versions.bun;
      const [major, minor] = version.split(".", 2).map(Number);

      return major > 1 || (major === 1 && minor >= 2);
    }
    default: {
      return false;
    }
  }
}
