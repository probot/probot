const validFormats = ["pretty", "json"] as const;

export type LogFormat = (typeof validFormats)[number];

export function validateLogFormat(value: unknown): asserts value is LogFormat {
  if (
    typeof value !== "string" ||
    !validFormats.some((format) => format === value)
  ) {
    throw new Error(`Invalid log format`);
  }
}
