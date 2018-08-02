const defaultOptions: ResolveOptions = {}

export const resolve = (appFnId: string, opts?: ResolveOptions) => {
  opts = opts || defaultOptions
  // These are mostly to ease testing
  const basedir = opts.basedir || process.cwd()
  const resolver = opts.resolver || require('resolve').sync
  return require(resolver(appFnId, { basedir }))
}

export interface ResolveOptions {
  basedir?: string
  resolver?: (appFnId: string, opts: {basedir: string}) => string
}
