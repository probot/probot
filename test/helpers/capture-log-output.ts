const { streamSym } = require("pino/lib/symbols");
import type { Logger } from "pino";

export async function captureLogOutput(
  action: () => any,
  log: Logger,
): Promise<string> {
  let outputData = "";

  // @ts-expect-error
  let stdoutSpy = jest.spyOn(log[streamSym], "write") as jest.SpyInstance;
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
