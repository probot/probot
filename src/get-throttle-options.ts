import Bottleneck from "bottleneck";
import Redis from "ioredis";

import { LoggerWithTarget } from "./wrap-logger";

type Options = {
  log: LoggerWithTarget;
  throttleOptions?: any;
  redisConfig?: Redis.RedisOptions;
};

export function getThrottleOptions(options: Options) {
  if (options.throttleOptions) {
    return options.throttleOptions;
  }

  if (options.redisConfig || process.env.REDIS_URL) {
    const connection = new Bottleneck.IORedisConnection({
      client: getRedisClient(options.redisConfig),
    });
    connection.on("error", options.log.error);

    return {
      Bottleneck,
      connection,
    };
  }
}

function getRedisClient(redisConfig?: Redis.RedisOptions): Redis.Redis | void {
  if (redisConfig) {
    return new Redis(redisConfig);
  }

  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL);
  }
}
