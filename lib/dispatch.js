let yaml = require('js-yaml');

module.exports = dispatch;

function dispatch(github, event) {
  if(event.payload.repository) {
    return loadConfig(github, event.payload.repository);
  } else {
    console.log("No repository for event", event);
  }
}

function loadConfig(github, repository) {
  return new Promise(function(resolve, reject) {
    github.repos.getContent({
      user: repository.owner.login,
      repo: repository.name,
      path: '.probot.yml'
    }).then(function (data) {
      var content = new Buffer(data.content, 'base64').toString();
      resolve(yaml.safeLoad(content));
    }).catch(reject);
  })
}
