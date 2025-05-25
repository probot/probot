import { symbols as pinoSymbols } from "pino";
import type { Logger } from "pino";

export async function captureLogOutput(
  action: () => any,
  log: Logger,
): Promise<string> {
  let outputData = "";

  // @ts-expect-error
  const streamSymWrite = log[pinoSymbols.streamSym]["write"];

  // @ts-expect-error
  log[pinoSymbols.streamSym]["write"] = (data: string) => {
    outputData += data;
    // @ts-expect-error
    streamSymWrite.call(log[pinoSymbols.streamSym], data);
  };

  try {
    await action();

    return outputData;
  } finally {
    // @ts-expect-error
    log[pinoSymbols.streamSym]["write"] = streamSymWrite;
  }
}
