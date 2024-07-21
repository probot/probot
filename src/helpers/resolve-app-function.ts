export const resolveAppFunction = async (
  appFnId: string,
  opts = {} as ResolveOptions,
) => {
  // These are mostly to ease testing
  const basedir = process.cwd();
  const resolver: RequireResolve = opts.resolver || require.resolve;
  const appFnPath = resolver(appFnId, { paths: [basedir] });
  // On windows, an absolute path may start with a drive letter, e.g. C:/path/to/file.js
  // This can be interpreted as a protocol, so ensure it's prefixed with file://
  const appFnPathWithFileProtocol = appFnPath.replace(
    /^([a-zA-Z]:)/,
    "file://$1",
  );
  const { default: mod } = await import(appFnPathWithFileProtocol);
  // mod.default gets exported by transpiled TypeScript code
  return mod.__esModule && mod.default ? mod.default : mod;
};

export interface ResolveOptions {
  basedir?: string;
  resolver?: RequireResolve;
}
