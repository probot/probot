import { loadPackageJson } from "../../src/helpers/load-package-json.js";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("loadPackageJson", () => {
  it("returns empty object if filepath is invalid", () => {
    expect(JSON.stringify(loadPackageJson("/invalid/path/package.json"))).toBe(
      "{}",
    );
  });

  it("returns package.json content", () => {
    expect(loadPackageJson()).toHaveProperty("name");
    expect(loadPackageJson().name).toBe("probot");
  });

  it("returns package.json content if filepath is valid", () => {
    expect(
      loadPackageJson(resolve(process.cwd(), "package.json")),
    ).toHaveProperty("name");
    expect(loadPackageJson(resolve(process.cwd(), "package.json")).name).toBe(
      "probot",
    );
  });

  it("returns empty object if file is invalid", () => {
    expect(
      JSON.stringify(
        loadPackageJson(
          resolve(
            process.cwd(),
            "test/fixtures/load-package-json/invalid.json",
          ),
        ),
      ),
    ).toBe("{}");
  });
  it("returns empty object if file is empty string", () => {
    expect(
      JSON.stringify(
        loadPackageJson(
          resolve(
            process.cwd(),
            "test/fixtures/load-package-json/empty-string.json",
          ),
        ),
      ),
    ).toBe("{}");
  });
  it("returns empty object if file is 'null'", () => {
    expect(
      JSON.stringify(
        loadPackageJson(
          resolve(
            process.cwd(),
            "test/fixtures/load-package-json/empty-string.json",
          ),
        ),
      ),
    ).toBe("{}");
  });
});
