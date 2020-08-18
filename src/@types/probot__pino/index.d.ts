declare module "@probot/pino" {
  import { Transform } from "readable-stream";

  export function getTransformStream(): Transform {}
}
