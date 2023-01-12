import SonicBoom from "sonic-boom";

export async function captureLogOutput(action: () => any): Promise<string> {
  let outputData = "";

  const sbWrite = SonicBoom.prototype.write;
  SonicBoom.prototype.write = function (data: string) {
    outputData += data;
    return true;
  };

  try {
    await action();

    return outputData;
  } finally {
    SonicBoom.prototype.write = sbWrite;
  }
}
