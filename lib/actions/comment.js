module.exports = function(github, payload, template) {
  // template(payload)
  return github.issues.createComment({
    user: payload.repository.owner.login,
    repo: payload.repository.name,
    number: payload.issue.number,
    body: template
  });
}
