const REGEX = /^(?:([\w-]+)\/([\w-]+):)?([^#]*)(?:#(.*))?$/;

// Parses paths in the form of `owner/repo:path/to/file#ref`
module.exports = function (url) {
  const [, owner, repo, path, ref] = url.match(REGEX);
  return Object.assign({path}, owner && {owner, repo}, ref && {ref});
};
