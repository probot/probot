const validLevels = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "silent",
] as const;

export type LogLevel = (typeof validLevels)[number];

export function validateLogLevel(value: unknown): asserts value is LogLevel {
  if (
    typeof value !== "string" ||
    !validLevels.some((level) => level === value)
  ) {
    throw new Error(`Invalid log level`);
  }
}
