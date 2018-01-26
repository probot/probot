const Bottleneck = require('bottleneck')
const GitHubApi = require('github')

/**
 * the [github Node.js module](https://github.com/octokit/node-github),
 * which wraps the [GitHub API](https://developer.github.com/v3/) and allows
 * you to do almost anything programmatically that you can do through a web
 * browser.
 * @typedef github
 * @see {@link https://github.com/octokit/node-github}
 */

// Default callback should just return the response passed to it.
const defaultCallback = response => response

class EnhancedGitHubClient extends GitHubApi {
  constructor (options) {
    super(options)
    this.limiter = new Bottleneck(1, 1000)
    this.logger = options.logger
  }

  handler (params, block, callback) {
    // Only allow one request at a time with a 1s delay
    // https://github.com/octokit/node-github/issues/526
    this.limiter.submit(super.handler.bind(this), params, block, (err, res) => {
      let msg = `GitHub request: ${block.method} ${block.url}`
      if (res) {
        msg += ` - ${res.meta.status}`
      } else if (err) {
        msg += ` - ${err.code} ${err.status}`
      }
      this.logger.debug({params}, msg)

      if (res) {
        this.logger.trace(res, 'GitHub response:')
      }

      callback(err, res)
    })
  }

  async paginate (responsePromise, callback = defaultCallback) {
    let collection = []
    let getNextPage = true
    let done = () => {
      getNextPage = false
    }
    let response = await responsePromise
    collection = collection.concat(await callback(response, done))
    // eslint-disable-next-line no-unmodified-loop-condition
    while (getNextPage && this.hasNextPage(response)) {
      response = await this.getNextPage(response)
      collection = collection.concat(await callback(response, done))
    }
    return collection
  }
}

module.exports = EnhancedGitHubClient
