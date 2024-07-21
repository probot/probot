import { symbols as pinoSymbols } from "pino";
import type { Logger } from "pino";
import { type MockInstance, vi } from "vitest";

export async function captureLogOutput(
  action: () => any,
  log: Logger,
): Promise<string> {
  let outputData = "";

  const stdoutSpy: MockInstance = vi.spyOn(
    // @ts-expect-error
    log[pinoSymbols.streamSym],
    "write",
  );
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
