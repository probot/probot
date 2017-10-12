const cacheManager = require('cache-manager')
const createApp = require('github-app')
const createWebhook = require('github-webhook-handler')

const Context = require('../context')
const GitHubApi = require('./github/client')

class GitHubAdapter {
  constructor ({logger}, options) {
    this.logger = logger
    this.cache = cacheManager.caching({
      store: 'memory',
      ttl: 60 * 60 // 1 hour
    })

    this.webhook = createWebhook({path: options.webhookPath || '/', secret: options.secret || 'development'})

    this.app = createApp({
      id: options.id,
      cert: options.cert,
      debug: process.env.LOG_LEVEL === 'trace'
    })

    // Log all webhook errors
    this.webhook.on('error', e => logger.error(e))
  }

  get router () {
    return this.webhook
  }

  listen (handler) {
    this.webhook.on('*', async event => {
      // Log all received webhooks
      this.logger.trace(event, 'webhook received')

      // Deliver the event
      handler(await this.createContext(event))
    })
  }

  async createContext (event) {
    return new Context(event, await this.auth(event.payload.installation.id))
  }

  /**
   * Authenticate and get a GitHub client that can be used to make API calls.
   *
   * You'll probably want to use `context.github` instead.
   *
   * **Note**: `robot.auth` is asynchronous, so it needs to be prefixed with a
   * [`await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)
   * to wait for the magic to happen.
   *
   * @example
   *
   *  module.exports = function(robot) {
   *    robot.on('issues.opened', async context => {
   *      const github = await robot.auth();
   *    });
   *  };
   *
   * @param {number} [id] - ID of the installation, which can be extracted from
   * `context.payload.installation.id`. If called without this parameter, the
   * client wil authenticate [as the app](https://developer.github.com/apps/building-integrations/setting-up-and-registering-github-apps/about-authentication-options-for-github-apps/#authenticating-as-a-github-app)
   * instead of as a specific installation, which means it can only be used for
   * [app APIs](https://developer.github.com/v3/apps/).
   *
   * @returns {Promise<github>} - An authenticated GitHub API client
   * @private
   */
  async auth (id) {
    const github = new GitHubApi({debug: process.env.LOG_LEVEL === 'trace'})

    if (id) {
      const res = await this.cache.wrap(`app:${id}:token`, () => {
        this.logger.trace(`creating token for installation ${id}`)
        return this.app.createToken(id)
      }, {ttl: 60 * 59}) // Cache for 1 minute less than GitHub expiry

      github.authenticate({type: 'token', token: res.data.token})
    } else {
      github.authenticate((await this.app.asApp()).auth)
    }

    return github
  }
}

module.exports = GitHubAdapter
