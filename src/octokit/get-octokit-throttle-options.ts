import Bottleneck from "bottleneck";
import Redis from "ioredis";
import { Logger } from "pino";

type Options = {
  log: Logger;
  redisConfig?: Redis.RedisOptions | string;
};

export function getOctokitThrottleOptions(options: Options) {
  let { log, redisConfig } = options;

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
