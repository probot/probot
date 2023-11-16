import { describe, expect, test } from "vitest";

import { importView } from "../../src/views/import.js";

describe("importView", () => {
  test("only providing GH_HOST ", () => {
    expect(
      importView({
        GH_HOST: "https://github.com",
      }),
    ).toMatchSnapshot();
  });

  test('providing "My App" as name ', () => {
    expect(
      importView({
        name: "My App",
        GH_HOST: "https://github.com",
      }),
    ).toMatchSnapshot();
  });

  test("providing a smee-url as WEBHOOK_PROXY_URL ", () => {
    expect(
      importView({
        WEBHOOK_PROXY_URL: "https://smee.io/1234",
        GH_HOST: "https://github.com",
      }),
    ).toMatchSnapshot();
  });
});
