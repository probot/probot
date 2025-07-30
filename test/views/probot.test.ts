import { expect, test } from "vitest";

import { probotView } from "../../src/views/probot.js";

test("probotView > not providing parameters", () => {
  expect(probotView({})).toMatchSnapshot();
});

test("probotView > providing name", () => {
  expect(
    probotView({
      name: "My App",
    }),
  ).toMatchSnapshot();
});

test("probotView > providing description", () => {
  expect(
    probotView({
      description: "My App with Probot",
    }),
  ).toMatchSnapshot();
});

test("probotView > providing description", () => {
  expect(
    probotView({
      version: "1.0.0",
    }),
  ).toMatchSnapshot();
});
