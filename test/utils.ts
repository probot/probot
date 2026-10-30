import { Writable } from "node:stream";

export type LogEntry = {
  msg: string;
  level?: number;
  name?: string;
  id?: string;
  [key: string]: unknown;
};

export class MockLoggerTarget extends Writable {
  private target: LogEntry[];

  constructor(target: LogEntry[] = []) {
    super({ objectMode: true });
    this.target = target;
  }

  _write(
    object: unknown,
    _encoding: BufferEncoding,
    done: (error?: Error | null) => void,
  ): void {
    try {
      this.target.push(JSON.parse(String(object)) as LogEntry);
      done();
    } catch (error) {
      done(error as Error);
    }
  }

  get entries(): LogEntry[] {
    return this.target;
  }
}

export class MockSmeeClient {
  constructor(_options: { target: string; fetch?: Function | undefined }) {}

  async start(): Promise<EventSource> {
    return { close: () => undefined } as EventSource;
  }
}
