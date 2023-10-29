import { sync } from "resolve";

const defaultOptions: ResolveOptions = {};

// This is a workaround to prevent TypeScript from converting a dynamic import to require()
const _importDynamic = new Function("modulePath", "return import(modulePath)");

export const resolveAppFunction = async (
  appFnId: string,
  opts?: ResolveOptions,
) => {
  opts = opts || defaultOptions;
  // These are mostly to ease testing
  const basedir = opts.basedir || process.cwd();
  const resolver: Resolver = opts.resolver || sync;
  const appFnPath = resolver(appFnId, { basedir });
  const mod = await _importDynamic(appFnPath);
  // mod.default.default gets exported by transpiled TypeScript code
  return mod.default?.default ? mod.default.default : mod.default;
};

export type Resolver = (appFnId: string, opts: { basedir: string }) => string;

export interface ResolveOptions {
  basedir?: string;
  resolver?: Resolver;
}
