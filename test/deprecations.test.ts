import { Deprecation } from "deprecation";
import { Webhooks } from "@octokit/webhooks";

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

  it("probot.webhook", () => {
    const probot = new Probot({});
    expect(probot).toBeInstanceOf(Probot);

    expect(probot.webhook).toBeInstanceOf(Webhooks);

    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledWith(
      new Deprecation(
        `[probot] "probot.webhook" is deprecated. Use "probot.webhooks" instead instead`
      )
    );
  });
});
