type Runtime = "node" | "deno" | "bun" | "browser";

export type GlobalThis = {
  process?: {
    versions?: {
      node?: string;
      deno?: string;
      bun?: string;
    };
  };
  window?: object;
};

export function detectRuntime(globalThis: GlobalThis): Runtime {
  if (typeof globalThis === "object" && globalThis !== null) {
    if (
      typeof globalThis.process === "object" &&
      globalThis.process !== null &&
      typeof globalThis.process.versions === "object" &&
      globalThis.process.versions !== null
    ) {
      if (typeof globalThis.process.versions.deno === "string") {
        return "deno";
      }
      if (typeof globalThis.process.versions.bun === "string") {
        return "bun";
      }
      if (typeof globalThis.process.versions.node === "string") {
        return "node";
      }
    }
    if (typeof globalThis.window === "object" && globalThis.window !== null) {
      return "browser";
    }
  }

  throw new Error("Unable to detect runtime");
}
