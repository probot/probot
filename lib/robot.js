const debug = require('debug')('PRobot');
const installations = require('./installations');
const Context = require('./configuration');
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

        return Configuration.load(github, event.payload.repository).then(config => {
          return config.execute(context);
        });
      });
    }
  }
}

module.exports = new Robot();
