import { resolve } from "import-meta-resolve";
import { pathToFileURL } from "node:url";
import type { ApplicationFunction } from "../types.js";

type ImportMetaResolve = (specifier: string, parent?: string) => string;
export const resolveAppFunction = async (
  appFnId: string,
  opts = {} as ResolveOptions,
): Promise<ApplicationFunction> => {
  // These are mostly to ease testing
  const basedir = process.cwd();
  const resolver = opts.resolver || resolve;
  const appFnPath = resolver(appFnId, pathToFileURL(basedir).href + "/");

  const { default: mod } = await import(appFnPath);
  // mod.default gets exported by transpiled TypeScript code
  return mod.__esModule && mod.default ? mod.default : mod;
};
export interface ResolveOptions {
  basedir?: string;
  resolver?: ImportMetaResolve;
}
