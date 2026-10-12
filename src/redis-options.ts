import type { IpcNetConnectOpts, Socket, TcpNetConnectOpts } from "node:net";
import type { ConnectionOptions, TLSSocket } from "node:tls";

/**
 * Configuration for the ioredis version loaded by Probot. Keep this interface
 * independent of the optional package; compatibility is checked in the type tests.
 *
 * Adapted from ioredis 5.10.1 (https://github.com/redis/ioredis/tree/v5.10.1/lib).
 *
 * The MIT License (MIT)
 * Copyright (c) 2015-2022 Zihua Li
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
export interface RedisOptions extends Partial<
  Pick<TcpNetConnectOpts, "port" | "host" | "family"> &
    Pick<IpcNetConnectOpts, "path">
> {
  Connector?: (new (options: unknown) => RedisConnector) | undefined;
  retryStrategy?: ((times: number) => number | void | null) | undefined;
  commandTimeout?: number | undefined;
  blockingTimeout?: number | undefined;
  blockingTimeoutGrace?: number | undefined;
  socketTimeout?: number | undefined;
  keepAlive?: number | undefined;
  noDelay?: boolean | undefined;
  connectionName?: string | undefined;
  disableClientInfo?: boolean | undefined;
  clientInfoTag?: string | undefined;
  username?: string | undefined;
  password?: string | undefined;
  db?: number | undefined;
  autoResubscribe?: boolean | undefined;
  autoResendUnfulfilledCommands?: boolean | undefined;
  reconnectOnError?: ((err: Error) => boolean | 1 | 2) | null | undefined;
  readOnly?: boolean | undefined;
  stringNumbers?: boolean | undefined;
  connectTimeout?: number | undefined;
  monitor?: boolean | undefined;
  maxRetriesPerRequest?: number | null | undefined;
  maxLoadingRetryTime?: number | undefined;
  enableAutoPipelining?: boolean | undefined;
  autoPipeliningIgnoredCommands?: string[] | undefined;
  offlineQueue?: boolean | undefined;
  commandQueue?: boolean | undefined;
  enableOfflineQueue?: boolean | undefined;
  enableReadyCheck?: boolean | undefined;
  lazyConnect?: boolean | undefined;
  keyPrefix?: string | undefined;
  showFriendlyErrorStack?: boolean | undefined;
  scripts?:
    | Record<
        string,
        {
          lua: string;
          numberOfKeys?: number | undefined;
          readOnly?: boolean | undefined;
        }
      >
    | undefined;
  name?: string | undefined;
  role?: "master" | "slave" | undefined;
  tls?: ConnectionOptions | undefined;
  sentinelUsername?: string | undefined;
  sentinelPassword?: string | undefined;
  sentinels?: { host?: string; port?: number; family?: number }[] | undefined;
  sentinelRetryStrategy?:
    | ((attempts: number) => number | void | null)
    | undefined;
  sentinelReconnectStrategy?:
    | ((attempts: number) => number | void | null)
    | undefined;
  preferredSlaves?:
    | ((slaves: SentinelSlave[]) => SentinelSlave | null)
    | PreferredSlave[]
    | PreferredSlave
    | undefined;
  disconnectTimeout?: number | undefined;
  sentinelCommandTimeout?: number | undefined;
  enableTLSForSentinelMode?: boolean | undefined;
  sentinelTLS?: ConnectionOptions | undefined;
  natMap?:
    | Record<string, { host: string; port: number }>
    | ((key: string) => { host: string; port: number } | null)
    | undefined;
  updateSentinels?: boolean | undefined;
  sentinelMaxConnections?: number | undefined;
  failoverDetector?: boolean | undefined;
}

// Describe the public connector contract without depending on ioredis's private
// class members. Existing ioredis connectors satisfy this interface.
interface RedisConnector {
  firstError?: Error;
  check(info: unknown): boolean;
  disconnect(): void;
  connect(
    onError: (type: string, error: Error) => void,
  ): Promise<Socket | TLSSocket>;
}

interface SentinelSlave {
  port: string;
  ip: string;
  flags?: string | undefined;
}

interface PreferredSlave {
  port: string;
  ip: string;
  prio?: number | undefined;
}
