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

  it("resolves modules relative to the supplied basedir", async () => {
    const stubResolverCalls: [string, string][] = [];
    const stubResolver = (specifier: string, parent?: string): string => {
      stubResolverCalls.push([specifier, parent!]);
      return stubAppFnPath;
    };
    const customBasedir = "/tmp/probot-app";

    await resolveAppFunction("foo", {
      basedir: customBasedir,
      resolver: stubResolver,
    });

    expect(stubResolverCalls[0][1]).toBe(
      pathToFileURL(customBasedir).href + "/",
    );
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

  it("returns the default export from a transpiler-marked module", async () => {
    const module = await resolveAppFunction("foo", {
      resolver: () =>
        "data:text/javascript,export default {__esModule: true, default: 42}",
    });

    expect(module).toBe(42);
  });

  it("returns the module when its marker has no nested default", async () => {
    const module = await resolveAppFunction("foo", {
      resolver: () => "data:text/javascript,export default {__esModule: true}",
    });

    expect(module).toEqual({ __esModule: true });
  });
});
