const validLevels = ["trace", "debug", "info", "warn", "error", "fatal"];

export function validateLogLevel(
  value: unknown,
): asserts value is "trace" | "debug" | "info" | "warn" | "error" | "fatal" {
  if (typeof value !== "string" || !validLevels.includes(value as string)) {
    throw new Error(`Invalid log level`);
  }
}
