module.exports = resolver

function resolver (app, opts = {}) {
  // These are mostly to ease testing
  const basedir = opts.basedir || process.cwd()
  const resolve = opts.resolver || require('resolve').sync
  return require(resolve(app, {basedir}))
}
