const bunyan = require('bunyan');
const bunyanFormat = require('bunyan-format');
const Context = require('./context');

const logger = bunyan.createLogger({
  name: 'PRobot',
  level: process.env.LOG_LEVEL || 'debug',
  stream: bunyanFormat({outputMode: process.env.LOG_FORMAT || 'short'})
});

class Robot {
  constructor(integration, webhook) {
    this.integration = integration;
    this.webhook = webhook;
  }

  on(event, callback) {
    const [name, action] = event.split('.');

    return this.webhook.on(name, event => {
      if (!action || action === event.payload.action) {
        callback(event, new Context(event));
      }
    });
  }

  auth(id) {
    return this.integration.asInstallation(id);
  }

  log(...args) {
    return logger.debug(...args);
  }
}

// Add level methods on the logger
['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(level => {
  Robot.prototype.log[level] = logger[level].bind(logger);
});

module.exports = (...args) => new Robot(...args);
