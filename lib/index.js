const cacheManager = require('cache-manager')
const createApp = require('./github-app')
const createRobot = require('./robot')
const createServer = require('./server')
const createWebhookProxy = require('./webhook-proxy')
const resolve = require('./resolver')
const logger = require('./logger')
const logRequestErrors = require('./middleware/log-request-errors')

const GitHubAdapter = require('@probot/github-adapter')

const cache = cacheManager.caching({
  store: 'memory',
  ttl: 60 * 60 // 1 hour
})

const defaultApps = [
  require('./plugins/sentry'),
  require('./plugins/stats'),
  require('./plugins/default')
]

module.exports = (options = {}) => {
  const app = createApp({
    id: options.id,
    cert: options.cert
  })
  const server = createServer({logger})

  const adapter = new GitHubAdapter({logger}, options)
  adapter.listen(receive)
  server.use(adapter.middleware)

  const robots = []

  function receive (event) {
    return Promise.all(robots.map(robot => robot.receive(event)))
  }

  function load (plugin) {
    if (typeof plugin === 'string') {
      plugin = resolve(plugin)
    }

    const robot = createRobot({app, cache, logger, catchErrors: true})

    // Connect the router from the robot to the server
    server.use(robot.router)

    // Initialize the plugin
    plugin(robot)
    robots.push(robot)

    return robot
  }

  function setup (apps) {
    // Log all unhandled rejections
    process.on('unhandledRejection', logger.error.bind(logger))

    // Load the given apps along with the default apps
    apps.concat(defaultApps).forEach(app => load(app))

    // Register error handler as the last middleware
    server.use(logRequestErrors)
  }

  return {
    // FIXME: eventually we'll support multiple adapters, at which point this
    //        will be removed or turned into an array. For now this is not
    //        considered a public interface.
    adapter,
    server,
    // FIXME: deprecate
    webhook: adapter.router,
    receive,
    logger,
    load,
    setup,

    start () {
      if (options.webhookProxy) {
        createWebhookProxy({
          url: options.webhookProxy,
          port: options.port,
          path: options.webhookPath,
          logger
        })
      }

      server.listen(options.port)
      logger.info('Listening on http://localhost:' + options.port)
    }
  }
}

module.exports.createRobot = createRobot
