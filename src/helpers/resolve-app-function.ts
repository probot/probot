import { sync } from "resolve";

const defaultOptions: ResolveOptions = {};

export const resolveAppFunction = (appFnId: string, opts?: ResolveOptions) => {
  opts = opts || defaultOptions;
  // These are mostly to ease testing
  const basedir = opts.basedir || process.cwd();
  const resolver: Resolver = opts.resolver || sync;
  const appFnPath = resolver(appFnId, { basedir });
  const mod = require(appFnPath);

  if (typeof mod === "function") {
    return mod;
  }

  // handle ES Module export transpiled to JS
  // https://github.com/probot/probot/issues/1447
  if (mod.__esModule && typeof mod.default === "function") {
    return mod.default;
  }

  throw new Error(`[probot] now app function found at ${appFnPath}`);
};

export type Resolver = (appFnId: string, opts: { basedir: string }) => string;

export interface ResolveOptions {
  basedir?: string;
  resolver?: Resolver;
}
