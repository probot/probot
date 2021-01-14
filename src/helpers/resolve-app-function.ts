import { sync } from "resolve";

const defaultOptions: ResolveOptions = {};

export const resolveAppFunction = async (
  appFnId: string,
  opts?: ResolveOptions
) => {
  opts = opts || defaultOptions;
  // These are mostly to ease testing
  const basedir = opts.basedir || process.cwd();
  const resolver: Resolver = opts.resolver || sync;
  const appFnPath = resolver(appFnId, { basedir });
  const mod = await import(appFnPath);
  // Note: This needs "esModuleInterop" to be set to "true" in "tsconfig.json"
  return mod.default;
};

export type Resolver = (appFnId: string, opts: { basedir: string }) => string;

export interface ResolveOptions {
  basedir?: string;
  resolver?: Resolver;
}
