const path = require('path')
const yaml = require('js-yaml')

/**
 * Helpers for extracting information from the webhook event, which can be
 * passed to GitHub API calls.
 *
 * @property {github} github - An authenticated GitHub API client
 * @property {payload} payload - The webhook event payload
 */
class Context {
  constructor (event, github) {
    Object.assign(this, event)
    this.github = github
  }

  /**
   * Return the `owner` and `repo` params for making API requests against a
   * repository.
   *
   * @param {object} [object] - Params to be merged with the repo params.
   *
   * @example
   *
   * const params = context.repo({path: '.github/stale.yml'})
   * // Returns: {owner: 'username', repo: 'reponame', path: '.github/stale.yml'}
   *
   */
  repo (object) {
    const repo = this.payload.repository

    return Object.assign({
      owner: repo.owner.login || repo.owner.name,
      repo: repo.name
    }, object)
  }

  /**
   * Return the `owner`, `repo`, and `number` params for making API requests
   * against an issue or pull request. The object passed in will be merged with
   * the repo params.
   *
   * @example
   *
   * const params = context.issue({body: 'Hello World!'})
   * // Returns: {owner: 'username', repo: 'reponame', number: 123, body: 'Hello World!'}
   *
   * @param {object} [object] - Params to be merged with the issue params.
   */
  issue (object) {
    const payload = this.payload
    return Object.assign({
      number: (payload.issue || payload.pull_request || payload).number
    }, this.repo(), object)
  }

  /**
   * Returns a boolean if the actor on the event was a bot.
   * @type {boolean}
   */
  get isBot () {
    return this.payload.sender.type === 'Bot'
  }

  /**
   * Reads the plugin configuration from the given YAML file in the `.github`
   * directory of the repository.
   *
   * @example <caption>Contents of <code>.github/myplugin.yml</code>.</caption>
   *
   * close: true
   * comment: Check the specs on the rotary girder.
   *
   * @example <caption>Plugin that reads from <code>.github/myplugin.yml</code>.</caption>
   *
   * // Load config from .github/myplugin.yml in the repository
   * const config = await context.config('myplugin.yml');
   *
   * if(config.close) {
   *   context.github.issues.comment(context.issue({body: config.comment}));
   *   context.github.issues.edit(context.issue({state: 'closed'}));
   * }
   *
   * @param {string} fileName - Name of the YAML file in the `.github` directory
   * @param {object} [defaultConfig] - An object of default config options
   * @return {Promise<Object>} - Configuration object read from the file
   */
  async config (fileName, defaultConfig) {
    const params = this.repo({path: path.join('.github', fileName)})

    try {
      const res = await this.github.repos.getContent(params)
      const config = yaml.safeLoad(Buffer.from(res.data.content, 'base64').toString()) || {}
      return Object.assign({}, defaultConfig, config)
    } catch (err) {
      if (err.code === 404) {
        if (defaultConfig) {
          return defaultConfig
        }
        return null
      } else {
        throw err
      }
    }
  }
}

module.exports = Context
