import {
  resolveAppFunction,
  Resolver,
} from "../src/helpers/resolve-app-function";

const stubAppFnPath = require.resolve("./fixtures/plugin/stub-plugin");
const basedir = process.cwd();

describe("resolver", () => {
  let stubResolver: Resolver;

  beforeEach(() => {
    stubResolver = jest.fn().mockReturnValue(stubAppFnPath);
  });

  it("loads the module at the resolved path", () => {
    const module = resolveAppFunction("foo", { resolver: stubResolver });
    expect(module).toBe(require(stubAppFnPath));
    expect(stubResolver).toHaveBeenCalledWith("foo", { basedir });
  });
});
