import { resolveAppFunction } from "../src/helpers/resolve-app-function.js";
import { describe, expect, vi, it } from "vitest";

const stubAppFnPath = require.resolve("./fixtures/plugin/stub-plugin.ts");
const stubTranspiledAppFnPath = require.resolve(
  "./fixtures/plugin/stub-typescript-transpiled-plugin.ts",
);
const basedir = process.cwd();

describe("resolver", () => {
  it("loads the module at the resolved path", async () => {
    const stubResolver = vi.fn().mockReturnValue(stubAppFnPath);
    const module = await resolveAppFunction("foo", {
      resolver: stubResolver as unknown as RequireResolve,
    });
    expect(module).toBeInstanceOf(Function);
    expect(stubResolver).toHaveBeenCalledWith("foo", { paths: [basedir] });
  });

  it("loads module transpiled from TypeScript (https://github.com/probot/probot/issues/1447)", async () => {
    const stubResolver = vi.fn().mockReturnValue(stubTranspiledAppFnPath);
    const module = await resolveAppFunction("foo", {
      resolver: stubResolver as unknown as RequireResolve,
    });
    expect(module).toBeInstanceOf(Function);
    expect(stubResolver).toHaveBeenCalledWith("foo", { paths: [basedir] });
  });
});
