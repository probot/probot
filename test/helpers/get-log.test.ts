import { getLog } from "../../src/helpers/get-log";
import { captureLogOutput } from "./capture-log-output";

describe("get log", () => {
  it("should log json in production mode", () => {
    process.env.NODE_ENV = "production";
    const output = captureLogOutput(() => {
      const log = getLog();

      log.warn("Ciao");
    });

    expect(JSON.parse(output).msg).toStrictEqual("Ciao");
  });
  it("should log pretty if not in production mode", () => {
    process.env.NODE_ENV = "development";
    const output = captureLogOutput(() => {
      const log = getLog();

      log.warn("Ciao");
    });

    expect(output).toContain("Ciao");
    expect(output).toContain("\u001b");
    expect(output).not.toContain("{");
  });
  it("should log in specified format when passed", () => {
    process.env.NODE_ENV = "development";
    const output = captureLogOutput(() => {
      const log = getLog({ logFormat: "json" });

      log.warn("Ciao");
    });

    expect(JSON.parse(output).msg).toStrictEqual("Ciao");
  });
});
