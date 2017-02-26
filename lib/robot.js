const log = require('./log');
const Context = require('./context');
const Configuration = require('./configuration');

class Robot {
  constructor(integration) {
    this.integration = integration;
  }

  listen(webhook) {
    webhook.on('*', this.receive.bind(this));
  }

  receive(event) {
    log.trace('webhook', event);

    if (event.payload.repository) {
      this.integration.asInstallation(event.payload.installation.id).then(github => {
        const context = new Context(github, event);
        Configuration.load(context, '.probot.js').then(config => {
          return config.execute();
        });
      });
    }
  }
}

module.exports = function (integration) {
  return new Robot(integration);
};
