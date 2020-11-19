import Bottleneck from "bottleneck";
import Redis from "ioredis";
import { Logger } from "pino";
import { Deprecation } from "deprecation";

type Options = {
  log: Logger;
  redisConfig?: Redis.RedisOptions | string;
};

export function getOctokitThrottleOptions(options: Options) {
  let { log, redisConfig } = options;

  if (!redisConfig && process.env.REDIS_URL) {
    redisConfig = process.env.REDIS_URL;
    log.warn(
      new Deprecation(
        `[probot] "REDIS_URL" is deprecated when using with the Probot constructor. Use "new Probot({ redisConfig: 'redis://...' })" instead`
      )
    );
  }

  if (!redisConfig) return;

  const connection = new Bottleneck.IORedisConnection({
    client: getRedisClient(options),
  });
  connection.on("error", (error) => {
    log.error(Object.assign(error, { source: "bottleneck" }));
  });

  return {
    Bottleneck,
    connection,
  };
}

function getRedisClient({ log, redisConfig }: Options): Redis.Redis | void {
  if (redisConfig) return new Redis(redisConfig as Redis.RedisOptions);
}
