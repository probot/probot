import SonicBoom from "sonic-boom";

export async function captureLogOutput(action: () => any): Promise<string> {
  let outputData = "";

  const sbWrite = SonicBoom.prototype.write;
  // Todo This never gets called therefore failing tests
  SonicBoom.prototype.write = function (data) {
    outputData += data;
    return sbWrite(data);
  };

  try {
    await action();

    return outputData;
  } finally {
    SonicBoom.prototype.write = sbWrite;
  }
}
