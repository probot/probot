import { npxImport } from "npx-import-light";
import Bottleneck from "bottleneck";
import type { RedisOptions } from "ioredis";
import type { Logger } from "pino";
import type { ThrottlingOptions } from "@octokit/plugin-throttling";
import type { EndpointDefaults } from "@octokit/types";

type Options = {
  log: Logger;
  redisConfig?: RedisOptions | string | undefined;
};

export async function getOctokitThrottleOptions(
  options: Options,
): Promise<ThrottlingOptions> {
  const { log, redisConfig } = options;

  const throttlingOptions: ThrottlingOptions = {
    onRateLimit: (retryAfter, options: Required<EndpointDefaults>) => {
      log.warn(
        `Request quota exhausted for request ${options.method} ${options.url}`,
      );

      // Retry twice after hitting a rate limit error, then give up
      if (options.request.retryCount <= 2) {
        log.info(`Retrying after ${retryAfter} seconds!`);
        return true;
      }
      return false;
    },
    onSecondaryRateLimit: (
      _retryAfter,
      options: Required<EndpointDefaults>,
    ) => {
      // does not retry, only logs a warning
      log.warn(
        `Secondary quota detected for request ${options.method} ${options.url}`,
      );
    },
  };

  if (!redisConfig) return throttlingOptions;

  const { client, Redis } = await getRedisClient(redisConfig);
  const connection = new Bottleneck.IORedisConnection({
    client,
    Redis,
  });
  connection.on("error", (error) => {
    log.error(Object.assign(error, { source: "bottleneck" }));
  });

  throttlingOptions.Bottleneck = Bottleneck;
  throttlingOptions.connection = connection;

  return throttlingOptions;
}

type RedisClient = import("ioredis").Redis;
type RedisConstructor = {
  new (options: RedisOptions | string): RedisClient;
};

let Redis: RedisConstructor | undefined;

async function getRedisClient(redisConfig: RedisOptions | string): Promise<{
  client: RedisClient;
  Redis: RedisConstructor;
}> {
  Redis ??= (
    await npxImport<{ Redis: RedisConstructor }>("ioredis@5.10.1", {
      onlyPackageRunner: true,
    })
  ).Redis;
  return {
    client:
      typeof redisConfig === "string"
        ? new Redis(redisConfig)
        : new Redis(redisConfig),
    Redis,
  };
}
