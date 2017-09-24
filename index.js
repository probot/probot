const bunyan = require('bunyan')
const bunyanFormat = require('bunyan-format')
const sentryStream = require('bunyan-sentry-stream')
const Raven = require('raven')

const createRobot = require('./lib/robot')
const createServer = require('./lib/server')
const serializers = require('./lib/serializers')
const GitHubAdapter = require('./lib/adapter/github')

const logger = bunyan.createLogger({
  name: 'Probot',
  level: process.env.LOG_LEVEL || 'debug',
  stream: bunyanFormat({outputMode: process.env.LOG_FORMAT || 'short'}),
  serializers
})

// Log all unhandled rejections
process.on('unhandledRejection', logger.error.bind(logger))

module.exports = (options = {}) => {
  const server = createServer()

  // If sentry is configured, report all logged errors
  if (process.env.SENTRY_DSN) {
    Raven.disableConsoleAlerts()
    Raven.config(process.env.SENTRY_DSN, {
      autoBreadcrumbs: true
    }).install({})

    logger.addStream(sentryStream(Raven))
  }

  const adapter = new GitHubAdapter({logger}, options)
  adapter.listen(receive)
  server.use(adapter.router)

  const robots = []

  function receive (event) {
    return Promise.all(robots.map(robot => robot.receive(event)))
  }

  const probot = {
    adapter,
    server,
    receive,
    logger,

    start () {
      server.listen(options.port)
      logger.trace('Listening on http://localhost:' + options.port)
    },

    load (plugin) {
      const robot = createRobot({logger, catchErrors: true})

      // Connect the router from the robot to the server
      server.use(robot.router)

      // Initialize the plugin
      plugin(robot)
      robots.push(robot)

      return robot
    }
  }

  return probot
}

module.exports.createRobot = createRobot
