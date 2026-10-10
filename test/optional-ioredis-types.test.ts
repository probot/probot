import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

function checkConsumer(source: string, withoutIORedis = false) {
  const filename = resolve("test/types/consumer.ts").replaceAll("\\", "/");
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    strict: true,
    noEmit: true,
    skipLibCheck: false,
    types: ["node"],
  };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile;
  host.getSourceFile = (path, ...args) =>
    path === filename
      ? ts.createSourceFile(path, source, ts.ScriptTarget.ES2022, true)
      : getSourceFile(path, ...args);

  if (withoutIORedis) {
    const fileExists = host.fileExists;
    host.fileExists = (path) =>
      !path.replaceAll("\\", "/").includes("/node_modules/ioredis/") &&
      fileExists(path);
  }

  const program = ts.createProgram([filename], options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    );
}

const consumer = `
  import { Probot, type Options } from "../../lib/index.js";

  new Probot({ githubToken: "test" });
  new Probot({ githubToken: "test", redisConfig: "redis://localhost:6379" });
  new Probot({ redisConfig: undefined });
  const options: Options = { redisConfig: { host: "localhost", port: 6379 } };
  new Probot(options);

  interface ConnectionOptions { host: string; port: number }
  const connectionOptions: ConnectionOptions = { host: "localhost", port: 6379 };
  new Probot({ redisConfig: connectionOptions });

  // @ts-expect-error Redis configuration must be a URL or an options object.
  new Probot({ redisConfig: 6379 });
`;

describe("published types with optional ioredis", () => {
  it("compiles a consumer without ioredis and without skipLibCheck", () => {
    expect(checkConsumer(consumer, true)).toEqual([]);
  }, 30_000);

  it.skipIf(!!process.env.NO_IOREDIS)(
    "preserves ioredis option types when installed",
    () => {
      expect(
        checkConsumer(`${consumer}
      import type { RedisOptions } from "ioredis";

      const redisConfig: RedisOptions = { host: "localhost", port: 6379 };
      new Probot({ redisConfig });
      new Probot({ redisConfig: {
        retryStrategy(times) {
          const attempts: number = times;
          return attempts * 100;
        },
      } });

      // @ts-expect-error ioredis expects a numeric port.
      new Probot({ redisConfig: { port: "6379" } });
      // @ts-expect-error ioredis rejects unknown option names.
      new Probot({ redisConfig: { unknownOption: true } });
    `),
      ).toEqual([]);
    },
    30_000,
  );
});
