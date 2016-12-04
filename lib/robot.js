const debug = require('debug')('PRobot');
const installations = require('./installations');
const Context = require('./context');
const Configuration = require('./configuration');

class Robot {
  listen(webhook) {
    webhook.on('*', this.receive.bind(this));
  }

  receive(event) {
    debug('webhook', event);

    if (event.payload.repository) {
      installations.auth(event.payload.installation.id).then(github => {
        const context = new Context(github, event);
        Configuration.load(context, '.probot.js').then(config => {
          return config.execute();
        });
      });
    }
  }
}

module.exports = new Robot();
