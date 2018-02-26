const defaultOptions: ResolveOptions = {}

export const resolve = function (app: string, opts?: ResolveOptions) {
  opts = opts || defaultOptions
  // These are mostly to ease testing
  const basedir = opts.basedir || process.cwd()
  const resolve = opts.resolver || require('resolve').sync
  return require(resolve(app, {basedir}))
}

export interface ResolveOptions {
  basedir?: string
  resolver?: (app: string, opts: {basedir: string}) => string
}
