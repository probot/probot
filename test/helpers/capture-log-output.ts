import { symbols as pinoSymbols } from "pino";
import type { Logger } from "pino";
import { type SpyInstance, vi } from "vitest";

export async function captureLogOutput(
  action: () => any,
  log: Logger,
): Promise<string> {
  let outputData = "";

  // @ts-expect-error
  let stdoutSpy = vi.spyOn(log[pinoSymbols.streamSym], "write") as SpyInstance;
  stdoutSpy.mockImplementation((data) => {
    outputData += data;
  });

  try {
    await action();

    return outputData;
  } finally {
    stdoutSpy.mockRestore();
  }
}
