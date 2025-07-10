import { Writable } from "node:stream";

export class MockLoggerTarget extends Writable {
  private target: any[];

  constructor(target = [] as any[]) {
    super({ objectMode: true });
    this.target = target;
  }

  _write(
    object: any,
    _encoding: BufferEncoding,
    done: (error?: Error | null) => void,
  ): void {
    try {
      this.target.push(JSON.parse(object));
      done();
    } catch (error) {
      done(error as Error);
    }
  }

  get entries(): any[] {
    return this.target;
  }
}
