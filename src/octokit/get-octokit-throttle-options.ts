import Bottleneck from "bottleneck";
import Redis from "ioredis";
import { Logger } from "pino";
import { throttling } from "@octokit/plugin-throttling";

type ThrottlingOptions = Exclude<
  Parameters<typeof throttling>[1]["throttle"],
  undefined
>;

type Options = {
  log: Logger;
  redisConfig?: Redis.RedisOptions | string;
};

export function getOctokitThrottleOptions(options: Options) {
  let { log, redisConfig } = options;

  if (!redisConfig)
    return {
      onRateLimit: (retryAfter, options: { [key: string]: any }) => {
        log.warn(
          `Request quota exhausted for request ${options.method} ${options.url}`
        );

        // Retry twice after hitting a rate limit error, then give up
        if (options.request.retryCount <= 2) {
          log.info(`Retrying after ${retryAfter} seconds!`);
          return true;
        }
        return false;
      },
      onSecondaryRateLimit: (retryAfter, options: { [key: string]: any }) => {
        // does not retry, only logs a warning
        log.warn(
          `Secondary quota detected for request ${options.method} ${options.url}`
        );
      },
    } as ThrottlingOptions;

  const connection = new Bottleneck.IORedisConnection({
    client: getRedisClient(options),
  });
  connection.on("error", (error) => {
    log.error(Object.assign(error, { source: "bottleneck" }));
  });

  const throttlingOptions: ThrottlingOptions = {
    Bottleneck,
    connection,
    onRateLimit: (retryAfter, options: { [key: string]: any }) => {
      log.warn(
        `Request quota exhausted for request ${options.method} ${options.url}`
      );

      // Retry twice after hitting a rate limit error, then give up
      if (options.request.retryCount <= 2) {
        log.info(`Retrying after ${retryAfter} seconds!`);
        return true;
      }
      return false;
    },
    onSecondaryRateLimit: (retryAfter, options: { [key: string]: any }) => {
      // does not retry, only logs a warning
      log.warn(
        `Secondary quota detected for request ${options.method} ${options.url}`
      );
    },
  };

  return throttlingOptions;
}

function getRedisClient({ log, redisConfig }: Options): Redis.Redis | void {
  if (redisConfig) return new Redis(redisConfig as Redis.RedisOptions);
}
