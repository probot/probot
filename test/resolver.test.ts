import { pathToFileURL } from "node:url";

import { resolve } from "import-meta-resolve";
import { describe, expect, it } from "vitest";

import { resolveAppFunction } from "../src/helpers/resolve-app-function.js";

const basedir = pathToFileURL(process.cwd()).href + "/";

const stubAppFnPath = resolve("./test/fixtures/plugin/stub-plugin.ts", basedir);
const stubTranspiledAppFnPath = resolve(
  "./test/fixtures/plugin/stub-typescript-transpiled-plugin.ts",
  basedir,
);

describe("resolver", () => {
  it("loads the module at the resolved path", async () => {
    const stubResolverCalls: [string, string][] = [];
    const stubResolver = (specifier: string, parent?: string): string => {
      stubResolverCalls.push([specifier, parent!]);
      return stubAppFnPath;
    };
    const module = await resolveAppFunction("foo", {
      resolver: stubResolver,
    });
    expect(typeof module).toBe("function");
    expect(stubResolverCalls.length).toBe(1);
    expect(stubResolverCalls[0][0]).toBe("foo");
    expect(stubResolverCalls[0][1]).toBe(basedir);
  });

  it("loads module transpiled from TypeScript (https://github.com/probot/probot/issues/1447)", async () => {
    const stubResolverCalls: [string, string][] = [];
    const stubResolver = (specifier: string, parent?: string): string => {
      stubResolverCalls.push([specifier, parent!]);
      return stubTranspiledAppFnPath;
    };

    const module = await resolveAppFunction("foo", {
      resolver: stubResolver,
    });
    expect(typeof module).toBe("function");
    expect(stubResolverCalls.length).toBe(1);
    expect(stubResolverCalls[0][0]).toBe("foo");
    expect(stubResolverCalls[0][1]).toBe(basedir);
  });
});
