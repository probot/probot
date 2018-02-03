const Bottleneck = require('bottleneck')
const Octokit = require('@octokit/rest')

/**
 * the [github Node.js module](https://github.com/octokit/node-github),
 * which wraps the [GitHub API](https://developer.github.com/v3/) and allows
 * you to do almost anything programmatically that you can do through a web
 * browser.
 * @typedef github
 * @see {@link https://github.com/octokit/node-github}
 */

const defaultCallback = response => response
async function paginate (octokit, responsePromise, callback = defaultCallback) {
  let collection = []
  let getNextPage = true
  let done = () => {
    getNextPage = false
  }
  let response = await responsePromise
  collection = collection.concat(await callback(response, done))
 // eslint-disable-next-line no-unmodified-loop-condition
  while (getNextPage && octokit.hasNextPage(response)) {
    response = await octokit.getNextPage(response)
    collection = collection.concat(await callback(response, done))
  }
  return collection
}

function EnhancedGitHubClient (options) {
  const octokit = Octokit(options)
  const limiter = new Bottleneck({ maxConcurrent: 1, minTime: 1000 })
  const logger = options.logger
  const noop = () => Promise.resolve()

  octokit.hook.before('request', limiter.schedule.bind(limiter, noop))
  octokit.hook.error('request', (error, options) => {
    const {method, url, headers, ...params} = options
    const msg = `GitHub request: ${method} ${url} - ${error.code} ${error.status}`
    logger.debug({params}, msg)
  })
  octokit.hook.after('request', (result, options) => {
    const {method, url, headers, ...params} = options
    const msg = `GitHub request: ${method} ${url} - ${result.meta.status}`
    logger.debug({params}, msg)
  })
  octokit.paginate = paginate.bind(null, octokit)

  return octokit
}

module.exports = EnhancedGitHubClient
