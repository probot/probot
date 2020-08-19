import Bottleneck from "bottleneck";
import Redis from "ioredis";
import type { Logger } from "pino";
import { Octokit } from "@octokit/core";
import { RequestOptions } from "@octokit/types";

type Options = {
  log: Logger;
  throttleOptions?: any;
  redisConfig?: Redis.RedisOptions;
};

export function getOctokitThrottleOptions(options: Options) {
  if (!options.redisConfig && !process.env.REDIS_URL) return;

  const connection = new Bottleneck.IORedisConnection({
    client: getRedisClient(options.redisConfig),
  });
  connection.on("error", (error) => {
    options.log.error(Object.assign(error, { source: "bottleneck" }));
  });

  return {
    Bottleneck,
    connection,
    onAbuseLimit: (
      retryAfter: number,
      options: RequestOptions,
      octokit: Octokit
    ) => {
      octokit.log.warn(
        `Abuse limit hit with "${options.method} ${options.url}", retrying in ${retryAfter} seconds.`
      );
      return true;
    },
    onRateLimit: (
      retryAfter: number,
      options: RequestOptions,
      octokit: Octokit
    ) => {
      octokit.log.warn(
        `Rate limit hit with "${options.method} ${options.url}", retrying in ${retryAfter} seconds.`
      );
      return true;
    },
  };
}

function getRedisClient(redisConfig?: Redis.RedisOptions): Redis.Redis | void {
  if (redisConfig) return new Redis(redisConfig);
  if (process.env.REDIS_URL) return new Redis(process.env.REDIS_URL);
}
