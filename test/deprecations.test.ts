import { Deprecation } from "deprecation";

import { createProbot, Probot } from "../src";

describe("Deprecations", () => {
  let consoleWarn: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    consoleWarn = jest.spyOn(global.console, "warn").mockImplementation();
  });

  afterEach(() => {
    consoleWarn.mockRestore();
  });

  it("createProbot", () => {
    const probot = createProbot({});
    expect(probot).toBeInstanceOf(Probot);

    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledWith(
      new Deprecation(
        `[probot] "createProbot(options)" is deprecated, use "new Probot(options)" instead`
      )
    );
  });
});
