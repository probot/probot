import path from "node:path";
import { fileURLToPath } from "node:url";

import getPort from "get-port";
import { pino } from "pino";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  packageConfig: vi.fn(),
  resolveAppFunction: vi.fn(),
}));

vi.mock("package-config", () => ({ packageConfig: mocks.packageConfig }));
vi.mock("../src/helpers/resolve-app-function.js", () => ({
  resolveAppFunction: mocks.resolveAppFunction,
}));

afterAll(() => {
  vi.doUnmock("package-config");
  vi.doUnmock("../src/helpers/resolve-app-function.js");
  vi.resetModules();
});

let run: typeof import("../src/run.js").run;

beforeAll(async () => {
  vi.resetModules();
  ({ run } = await import("../src/run.js"));
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const privateKeyPath = path.join(__dirname, "fixtures", "test-private-key.pem");

describe("run with package-config apps", () => {
  beforeEach(() => {
    mocks.packageConfig.mockResolvedValue({ apps: ["configured-app.js"] });
    mocks.resolveAppFunction.mockResolvedValue(() => {});
  });

  it("loads configured apps before the CLI app", async () => {
    const server = await run(
      [
        "node",
        "probot-run",
        "--app",
        "1",
        "--private-key",
        privateKeyPath,
        "--port",
        String(await getPort()),
        "cli-app.js",
      ],
      { env: {}, log: pino({ level: "silent" }) },
    );

    try {
      expect(mocks.packageConfig).toHaveBeenCalledWith("probot");
      expect(mocks.resolveAppFunction).toHaveBeenCalledWith(
        "configured-app.js",
      );
      expect(mocks.resolveAppFunction).toHaveBeenCalledWith("cli-app.js");
      expect(mocks.resolveAppFunction).toHaveBeenCalledTimes(2);
      expect(
        mocks.resolveAppFunction.mock.calls.map(([appPath]) => appPath),
      ).toEqual(["configured-app.js", "cli-app.js"]);
    } finally {
      await server.stop();
    }
  });
});
