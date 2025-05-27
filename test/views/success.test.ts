import { expect, test } from "vitest";

import { successView } from "../../src/views/success.js";

test("successView > not providing name ", () => {
  expect(successView({})).toMatchSnapshot();
});

test("successView > providing with name ", () => {
  expect(
    successView({
      name: "My App",
    }),
  ).toMatchSnapshot();
});
