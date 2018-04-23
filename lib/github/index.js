const Octokit = require('@octokit/rest')

const addPagination = require('./pagination')
const addRateLimiting = require('./rate-limiting')
const addLogging = require('./logging')
const addGraphQL = require('./graphql')

/**
 * the [@octokit/rest Node.js module](https://github.com/octokit/rest.js),
 * which wraps the [GitHub API](https://developer.github.com/v3/) and allows
 * you to do almost anything programmatically that you can do through a web
 * browser.
 * @typedef github
 * @see {@link https://github.com/octokit/rest.js}
 */
function EnhancedGitHubClient (options = {}) {
  const octokit = Octokit(options)

  addRateLimiting(octokit, options.limiter)
  addLogging(octokit, options.logger)
  addPagination(octokit)
  addGraphQL(octokit)

  return octokit
}

module.exports = EnhancedGitHubClient
