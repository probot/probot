import { resolveAppFunction } from "../src/helpers/resolve-app-function.js";
import { resolve } from "import-meta-resolve";
import { describe, expect, vi, it } from "vitest";
import { pathToFileURL } from "node:url";
const basedir = pathToFileURL(process.cwd()).href + "/";

const stubAppFnPath = resolve("./test/fixtures/plugin/stub-plugin.ts", basedir);
const stubTranspiledAppFnPath = resolve(
  "./test/fixtures/plugin/stub-typescript-transpiled-plugin.ts",
  basedir,
);

type ImportMetaResolve = (specifier: string, parent?: string) => string;

describe("resolver", () => {
  it("loads the module at the resolved path", async () => {
    const stubResolver = vi.fn().mockReturnValue(stubAppFnPath);
    const module = await resolveAppFunction("foo", {
      resolver: stubResolver as unknown as ImportMetaResolve,
    });
    expect(module).toBeInstanceOf(Function);
    expect(stubResolver).toHaveBeenCalledWith("foo", basedir);
  });

  it("loads module transpiled from TypeScript (https://github.com/probot/probot/issues/1447)", async () => {
    const stubResolver = vi.fn().mockReturnValue(stubTranspiledAppFnPath);
    const module = await resolveAppFunction("foo", {
      resolver: stubResolver as unknown as ImportMetaResolve,
    });
    expect(module).toBeInstanceOf(Function);
    expect(stubResolver).toHaveBeenCalledWith("foo", basedir);
  });
});
