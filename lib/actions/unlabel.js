module.exports = (github, payload, label) => {
  // FIXME: check that it has the label first, or handle expected error:
  // {"message":"Label does not exist","documentation_url":"https://developer.github.com/v3/issues/labels/#remove-a-label-from-an-issue"}
  return Promise.all([].concat(label).map(label => {
    return github.issues.removeLabel({
      user: payload.repository.owner.login,
      repo: payload.repository.name,
      number: payload.issue.number,
      name: label
    });
  }));
};
