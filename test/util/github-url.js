const expect = require('expect');
const url = require('../../lib/util/github-url');

describe('github-url', () => {
  const cases = {
    'path.js': {path: 'path.js'},
    'owner/repo:path.js': {owner: 'owner', repo: 'repo', path: 'path.js'},
    'owner/repo:path/to/file.js': {owner: 'owner', repo: 'repo', path: 'path/to/file.js'},
    'path.js#ref': {path: 'path.js', ref: 'ref'},
    'owner/repo:path.js#ref': {owner: 'owner', repo: 'repo', path: 'path.js', ref: 'ref'}
  };

  Object.keys(cases).forEach(path => {
    it(path, () => {
      expect(url(path)).toEqual(cases[path]);
    });
  });
});
