const yaml = require('js-yaml');
const actions = {
  comment: require('./actions/comment')
};

module.exports = dispatch;

function dispatch(github, event) {
  if (event.payload.repository) {
    // Get bot config from target repository
    return loadConfig(github, event.payload.repository).then(config => {
      // Get behaviors for the event
      const behaviors = config.behaviors.filter(rule => rule.on === event.event);

      // Handle all behaviors
      return Promise.all(behaviors.map(rule => handle(github, event, rule)));
    });
  }
}

function loadConfig(github, repository) {
  return github.repos.getContent({
    user: repository.owner.login,
    repo: repository.name,
    path: '.probot.yml'
  }).then(data => {
    const content = new Buffer(data.content, 'base64').toString();
    return yaml.safeLoad(content);
  });
}

function handle(github, event, rule) {
  return Promise.all(Object.keys(rule.then).map(actionName => {
    const action = actions[actionName];
    if (!action) {
      throw new Error('Unknown action: ' + actionName);
    }
    return action(github, event.payload, rule.then[actionName]);
  }));
}
