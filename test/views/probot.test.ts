import { describe, expect, test } from "vitest";

import { probotView } from "../../src/views/probot.js";

describe("probotView", () => {
  test("not providing parameters", () => {
    expect(probotView({})).toMatchSnapshot();
  });

  test("providing name", () => {
    expect(
      probotView({
        name: "My App",
      }),
    ).toMatchSnapshot();
  });

  test("providing description", () => {
    expect(
      probotView({
        description: "My App with Probot",
      }),
    ).toMatchSnapshot();
  });

  test("providing description", () => {
    expect(
      probotView({
        version: "1.0.0",
      }),
    ).toMatchSnapshot();
  });
});
