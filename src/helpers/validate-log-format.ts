const validFormats = ["pretty", "json"];

export function validateLogFormat(
  value: unknown,
): asserts value is "pretty" | "json" {
  if (typeof value !== "string" || !validFormats.includes(value as string)) {
    throw new Error(`Invalid log format`);
  }
}
