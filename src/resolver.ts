import { sync } from 'resolve'

const defaultOptions: ResolveOptions = {}

export const resolve = (appFnId: string, opts?: ResolveOptions) => {
  opts = opts || defaultOptions
  // These are mostly to ease testing
  const basedir = opts.basedir || process.cwd()
  const resolver: Resolver = opts.resolver || sync
  return require(resolver(appFnId, { basedir }))
}

export type Resolver = (appFnId: string, opts: {basedir: string}) => string

export interface ResolveOptions {
  basedir?: string
  resolver?: Resolver
}
