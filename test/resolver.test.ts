import { createRequire } from "node:module";
import { jest } from "@jest/globals";
import {
  resolveAppFunction,
  Resolver,
} from "../src/helpers/resolve-app-function";

const require = createRequire(import.meta.url);

const stubAppFnPath = require.resolve("./fixtures/plugin/stub-plugin");
const stubTranspiledAppFnPath = require.resolve(
  "./fixtures/plugin/stub-typescript-transpiled-plugin"
);
const basedir = process.cwd();

describe("resolver", () => {
  it("loads the module at the resolved path", async () => {
    const stubResolver = jest.fn<Resolver>().mockReturnValue(stubAppFnPath);
    const mod = await resolveAppFunction("foo", { resolver: stubResolver });
    const { default: fn } = await import(stubAppFnPath);
    expect(mod).toBe(fn);
    expect(stubResolver).toHaveBeenCalledWith("foo", { basedir });
  });

  it("loads module transpiled from TypeScript (https://github.com/probot/probot/issues/1447)", async () => {
    const stubResolver = jest
      .fn<Resolver>()
      .mockReturnValue(stubTranspiledAppFnPath);
    const mod = await resolveAppFunction("foo", { resolver: stubResolver });
    expect(mod).toBe((await import(stubTranspiledAppFnPath)).default);
    expect(stubResolver).toHaveBeenCalledWith("foo", { basedir });
  });
});
