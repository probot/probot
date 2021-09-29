import SonicBoom from "sonic-boom";

export function captureLogOutput(action: () => any): string {
  let outputData = "";

  const sbWrite = SonicBoom.prototype.write;
  SonicBoom.prototype.write = function (data) {
    outputData += data;
  };

  try {
    action();

    return outputData;
  } finally {
    SonicBoom.prototype.write = sbWrite;
  }
}
