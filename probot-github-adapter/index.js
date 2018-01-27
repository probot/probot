const createApp = require('../lib/github-app')
const cacheManager = require('cache-manager')
const createWebhook = require('github-webhook-handler')
const Context = require('../lib/context')
const GitHubApi = require('../lib/github')

module.exports = class GitHubAdapter {
  constructor ({logger}, options) {
    const path = options.webhookPath || '/'
    const secret = options.secret || 'development'

    this.cache = cacheManager.caching({ store: 'memory', ttl: 60 * 60 })
    this.logger = logger
    this.middleware = createWebhook({path, secret})

    this.app = createApp({
      id: options.id,
      cert: options.cert
    })

    // Log all webhook errors
    this.middleware.on('error', err => {
      logger.error({err})
    })
  }

  listen (handler) {
    this.middleware.on('*', async event => {
      // Log all received webhooks
      this.logger.info({event}, 'Webhook received')

      // Deliver the event
      handler(await this.createContext(event))
    })
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
  async auth (id, log = this.logger.wrap()) {
    const github = new GitHubApi({
      debug: process.env.LOG_LEVEL === 'trace',
      host: process.env.GHE_HOST || 'api.github.com',
      pathPrefix: process.env.GHE_HOST ? '/api/v3' : '',
      logger: log.child({installation: id})
    })

    if (id) {
      const res = await this.cache.wrap(`app:${id}:token`, () => {
        log.trace(`creating token for installation`)
        github.authenticate({type: 'integration', token: this.app()})

        return github.apps.createInstallationToken({installation_id: id})
      }, {ttl: 60 * 59}) // Cache for 1 minute less than GitHub expiry

      github.authenticate({type: 'token', token: res.data.token})
    } else {
      github.authenticate({type: 'integration', token: this.app()})
    }

    return github
  }

  async createContext (event) {
    const logger = this.logger.wrap().child({id: event.id})
    const client = await this.auth(event.payload.installation.id, logger)
    return new Context(event, client, logger)
  }
}
