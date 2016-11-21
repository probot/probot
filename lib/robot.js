const debug = require('debug')('PRobot');
const installations = require('./installations');
const Configuration = require('./configuration');
const Dispatcher = require('./dispatcher');

class Robot {
  listen(webhook) {
    webhook.on('*', this.receive.bind(this));
  }

  receive(event) {
    debug('webhook', event);

    if (event.payload.repository) {
      installations.auth(event.payload.installation.id).then(github => {
        const dispatcher = new Dispatcher(github, event);
        return Configuration.load(github, event.payload.repository).then(config => {
          dispatcher.call(config);
        });
      });
    }
  }
}

module.exports = new Robot();
