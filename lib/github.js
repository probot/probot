const Bottleneck = require('bottleneck')
const GitHubApi = require('github')

/**
 * the [github Node.js module](https://github.com/mikedeboer/node-github),
 * which wraps the [GitHub API](https://developer.github.com/v3/) and allows
 * you to do almost anything programmatically that you can do through a web
 * browser.
 * @typedef github
 * @see {@link https://github.com/mikedeboer/node-github}
 */

// Default callback should just return the response passed to it.
const defaultCallback = response => response

class EnhancedGitHubClient extends GitHubApi {
  constructor (options) {
    super(options)
    this.limiter = new Bottleneck(1, 1000)
  }

  // Hack client to only allow one request at a time with a 1s delay
  // https://github.com/mikedeboer/node-github/issues/526
  handler (msg, block, callback) {
    this.limiter.submit(super.handler.bind(this), msg, block, callback)
  }

  async paginate (responsePromise, callback = defaultCallback) {
    let collection = []
    let response = await responsePromise
    collection = collection.concat(await callback(response))
    while (this.hasNextPage(response)) {
      response = await this.getNextPage(response)
      collection = collection.concat(await callback(response))
    }
    return collection
  }
}

module.exports = EnhancedGitHubClient
