import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

function checkConsumer(source: string, withoutIORedis = false) {
  const filename = resolve("test/types/consumer.ts").replaceAll("\\", "/");
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    strict: true,
    exactOptionalPropertyTypes: true,
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

  type Equal<A, B> =
    (<T>() => T extends A ? 1 : 2) extends
    (<T>() => T extends B ? 1 : 2) ? true : false;
  type Assert<T extends true> = T;

  new Probot({ githubToken: "test" });
  new Probot({ githubToken: "test", redisConfig: "redis://localhost:6379" });
  new Probot({ redisConfig: undefined });
  const options: Options = { redisConfig: { host: "localhost", port: 6379 } };
  new Probot(options);

  interface ConnectionOptions { host: string; port: number }
  const connectionOptions: ConnectionOptions = { host: "localhost", port: 6379 };
  new Probot({ redisConfig: connectionOptions });

  new Probot({ redisConfig: {
    retryStrategy(times) {
      type Parameter = Assert<Equal<typeof times, number>>;
      const attempts: number = times;
      return attempts * 100;
    },
    reconnectOnError(error) {
      type Parameter = Assert<Equal<typeof error, Error>>;
      const failure: Error = error;
      return failure.message.includes("READONLY");
    },
    sentinelRetryStrategy(attempts) {
      type Parameter = Assert<Equal<typeof attempts, number>>;
      const retry: number = attempts;
      return retry * 100;
    },
    preferredSlaves(slaves) {
      type Parameter = Assert<Equal<typeof slaves, { port: string; ip: string; flags?: string | undefined }[]>>;
      const port: string | undefined = slaves[0]?.port;
      return port ? slaves[0] : null;
    },
    natMap(key) {
      type Parameter = Assert<Equal<typeof key, string>>;
      const address: string = key;
      return address ? { host: "localhost", port: 6379 } : null;
    },
    tls: { servername: "localhost" },
    sentinels: [{ host: "localhost", port: 26379 }],
    scripts: { getValue: { lua: "return 1", numberOfKeys: 0 } },
  } });

  // @ts-expect-error Redis configuration must be a URL or an options object.
  new Probot({ redisConfig: 6379 });
  // @ts-expect-error ioredis expects a numeric port.
  new Probot({ redisConfig: { port: "6379" } });
  // @ts-expect-error ioredis rejects unknown option names.
  new Probot({ redisConfig: { unknownOption: true } });
  // @ts-expect-error Retry callbacks cannot return strings.
  new Probot({ redisConfig: { retryStrategy: () => "100" } });
  // @ts-expect-error Sentinel roles are restricted to master or slave.
  new Probot({ redisConfig: { role: "primary" } });
  // @ts-expect-error Custom connectors must implement the connector contract.
  new Probot({ redisConfig: { Connector: class {} } });
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

      type ProbotRedisOptions = Exclude<Options["redisConfig"], string | undefined>;
      type MatchingOptionNames = Assert<Equal<keyof ProbotRedisOptions, keyof RedisOptions>>;
      type MismatchedOptions = {
        [Key in Exclude<keyof RedisOptions, "Connector">]-?:
          Equal<ProbotRedisOptions[Key], RedisOptions[Key]> extends true ? never : Key;
      }[Exclude<keyof RedisOptions, "Connector">];
      type MatchingOptionTypes = Assert<Equal<MismatchedOptions, never>>;

      // Probot describes connectors structurally; ioredis uses an abstract class
      // with private members. Every existing ioredis configuration must still fit.
      type AcceptsIORedisOptions = Assert<RedisOptions extends ProbotRedisOptions ? true : false>;
      declare const allOptions: RedisOptions;
      new Probot({ redisConfig: allOptions });

      const redisConfig: RedisOptions = { host: "localhost", port: 6379 };
      new Probot({ redisConfig });
    `),
      ).toEqual([]);
    },
    30_000,
  );
});
