const bunyan = require('bunyan');
const Context = require('./context');

class Robot {
  constructor(integration, webhook) {
    this.integration = integration;
    this.webhook = webhook;

    this.log = bunyan.createLogger({
      name: 'PRobot',
      level: process.env.LOG_LEVEL || 'info'
    });
  }

  on(event, callback) {
    const [name, action] = event.split('.');

    return this.webhook.on(name, event => {
      if (!action || action === event.payload.action) {
        callback(event, new Context(event));
      }
    });
  }
}

module.exports = (...args) => new Robot(...args);
