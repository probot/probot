const defaultOptions: ResolveOptions = {}

export default function resolver (app: string, opts?: ResolveOptions) {
  opts = opts || defaultOptions
  // These are mostly to ease testing
  const basedir = opts.basedir || process.cwd()
  const resolve = opts.resolver || require('resolve').sync
  return require(resolve(app, {basedir}))
}

interface ResolveOptions {
  basedir?: string
  resolver?: (app: string, opts: {basedir: string}) => string
}
