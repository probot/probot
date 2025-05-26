type Runtime = "node" | "deno" | "bun" | "browser";

type GlobalThis = {
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

export function getRuntimeVersion(globalThis: GlobalThis): string {
  const runtime = detectRuntime(globalThis);
  switch (runtime) {
    case "node":
      return globalThis.process?.versions!.node || "unknown";
    case "deno":
      return globalThis.process?.versions!.deno || "unknown";
    case "bun":
      return globalThis.process?.versions!.bun || "unknown";
    case "browser":
      return "N/A";
    default:
      throw new Error("Unknown runtime");
  }
}

export function getRuntimeName(globalThis: GlobalThis): string {
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
