const defaultOptions: ResolveOptions = {}

export const resolve = (app: string, opts?: ResolveOptions) => {
  opts = opts || defaultOptions
  // These are mostly to ease testing
  const basedir = opts.basedir || process.cwd()
  const resolver = opts.resolver || require('resolve').sync
  return require(resolver(app, { basedir }))
}

export interface ResolveOptions {
  basedir?: string
  resolver?: (app: string, opts: {basedir: string}) => string
}
