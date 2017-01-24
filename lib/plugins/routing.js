const Plugin = require('../plugin');
const Configuration = require('../configuration');
const url = require('../util/github-url');

console.log("WTF?", Configuration, Configuration.load);

module.exports = class Routing extends Plugin {
  route(context, path) {
    console.log(Configuration, Configuration.load)
    return Configuration.load(context, path).then(config => {
      const parts = url(path);
      context.event.payload.repository.name = parts.repo;
      context.event.payload.repository.owner.login = parts.owner;
      return config.execute(context);
    });
  }
}
