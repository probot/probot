import { npxImport } from "npx-import-light";
import Bottleneck from "bottleneck";
import type { RedisOptions } from "ioredis";
import type { Logger } from "pino";
import type { ThrottlingOptions } from "@octokit/plugin-throttling";

type Options = {
  log: Logger;
  redisConfig?: RedisOptions | string | undefined;
};

export async function getOctokitThrottleOptions(
  options: Options,
): Promise<ThrottlingOptions> {
  const { log, redisConfig } = options;

  const throttlingOptions: ThrottlingOptions = {
    onRateLimit: (retryAfter, options: { [key: string]: any }) => {
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
    onSecondaryRateLimit: (_retryAfter, options: { [key: string]: any }) => {
      // does not retry, only logs a warning
      log.warn(
        `Secondary quota detected for request ${options.method} ${options.url}`,
      );
    },
  };

  if (!redisConfig) return throttlingOptions;

  const connection = new Bottleneck.IORedisConnection({
    client: await getRedisClient(options),
  });
  connection.on("error", (error) => {
    log.error(Object.assign(error, { source: "bottleneck" }));
  });

  throttlingOptions.Bottleneck = Bottleneck;
  throttlingOptions.connection = connection;

  return throttlingOptions;
}

let Redis = null;

async function getRedisClient({ redisConfig }: Options): Promise<any> {
  Redis ??= (await npxImport("ioredis@5.6.1", { onlyPackageRunner: true }))
    .Redis;
  if (redisConfig) return new Redis(redisConfig as RedisOptions);
}
