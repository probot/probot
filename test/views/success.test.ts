import { describe, expect, test } from "vitest";

import { successView } from "../../src/views/success.js";

describe("setupView", () => {
  test("not providing name ", () => {
    expect(successView({})).toMatchSnapshot();
  });
  test("providing with name ", () => {
    expect(
      successView({
        name: "My App",
      }),
    ).toMatchSnapshot();
  });
});
