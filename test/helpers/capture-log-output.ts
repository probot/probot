import { symbols as pinoSymbols } from "pino";
import type { Logger } from "pino";

export async function captureLogOutput(
  action: () => any,
  log: Logger,
): Promise<string> {
  let outputData = "";

  // @ts-expect-error Store the original write function to restore later
  const streamSymWrite = log[pinoSymbols.streamSym]["write"];

  // @ts-expect-error Override the write function to capture output
  log[pinoSymbols.streamSym]["write"] = (data: string) => {
    outputData += data;
  };

  try {
    await action();

    return outputData;
  } finally {
    // @ts-expect-error Reset the write function to its original state
    log[pinoSymbols.streamSym]["write"] = streamSymWrite;
  }
}
