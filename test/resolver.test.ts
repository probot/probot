import { resolveAppFunction } from "../src/helpers/resolve-app-function";

const stubAppFnPath = require.resolve("./fixtures/plugin/stub-plugin");
const stubTranspiledAppFnPath = require.resolve(
  "./fixtures/plugin/stub-typescript-transpiled-plugin",
);
const basedir = process.cwd();

describe("resolver", () => {
  it("loads the module at the resolved path", async () => {
    // Jest's ESM support is broken on Node < 20
    if (parseInt(process.version.slice(1), 10) < 20) {
      return;
    }
    const stubResolver = jest.fn().mockReturnValue(stubAppFnPath);
    const module = await resolveAppFunction("foo", { resolver: stubResolver });
    expect(module).toBe((await import(stubAppFnPath)).default.default);
    expect(module).toBeInstanceOf(Function);
    expect(stubResolver).toHaveBeenCalledWith("foo", { basedir });
  });

  it("loads module transpiled from TypeScript (https://github.com/probot/probot/issues/1447)", async () => {
    // Jest's ESM support is broken on Node < 20
    if (parseInt(process.version.slice(1), 10) < 20) {
      return;
    }
    const stubResolver = jest.fn().mockReturnValue(stubTranspiledAppFnPath);
    const module = await resolveAppFunction("foo", { resolver: stubResolver });
    expect(module).toBe(
      (await import(stubTranspiledAppFnPath)).default.default,
    );
    expect(module).toBeInstanceOf(Function);
    expect(stubResolver).toHaveBeenCalledWith("foo", { basedir });
  });
});
