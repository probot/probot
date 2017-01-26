const Plugin = require('../plugin');
const Configuration = require('../configuration');
const url = require('../util/github-url');

module.exports = class Routing extends Plugin {
  route(context, path) {
    return Configuration.load(context, path).then(config => {
      const parts = url(path);
      context.event.payload.repository.name = parts.repo;
      context.event.payload.repository.owner.login = parts.owner;
      return config.execute(context);
    });
  }
};
