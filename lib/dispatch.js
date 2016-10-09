const yaml = require('js-yaml');
const actions = {
  comment: require('./actions/comment')
}

module.exports = dispatch;

function dispatch(github, event) {
  if(event.payload.repository) {
    // Get bot config from target repository
    return loadConfig(github, event.payload.repository).then(function(config) {
      // Get rules for the event
      var rules = config.rules.filter(function(rule) {
        return rule.on == event.event;
      });

      // Handle all rules
      return Promise.all(rules.map(function(rule) {
        return handle(github, event, rule);
      }));
    });
  } else {
    throw "No repository for event: " + event.event;
  }
}

function loadConfig(github, repository) {
  return github.repos.getContent({
    user: repository.owner.login,
    repo: repository.name,
    path: '.probot.yml'
  }).then(function (data) {
    var content = new Buffer(data.content, 'base64').toString();
    return yaml.safeLoad(content);
  });
}

function handle(github, event, rule) {
  return Promise.all(Object.keys(rule.then).map(function(actionName) {
    var action = actions[actionName];
    if (!action) {
      throw "Unknown action: " + actionName;
    }
    return action(github, event.payload, rule.then[actionName])
  }));
}
