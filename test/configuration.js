const expect = require('expect');
const Configuration = require('../lib/configuration');
const config = require('./fixtures/content/probot.yml.json');

const createSpy = expect.createSpy;

describe('Configuration', () => {
  describe('load', () => {
    let github;

    const repo = {
      owner: {login: 'bkeepers'},
      name: 'test'
    };

    beforeEach(() => {
      github = {
        repos: {
          getContent: createSpy().andReturn(Promise.resolve(config))
        }
      };
    });

    it('loads from the repo', done => {
      Configuration.load(github, repo).then(config => {
        expect(github.repos.getContent).toHaveBeenCalledWith({
          user: 'bkeepers',
          repo: 'test',
          path: '.probot.yml'
        });

        expect(config.behaviors.length).toEqual(1);

        done();
      });
    });
  });

  describe('behaviorsFor', () => {
    const config = new Configuration({behaviors: [
      {on: 'issues', then: {comment: ''}},
      {on: 'issues.created', then: {comment: ''}},
      {on: 'pull_request.labeled', then: {comment: ''}}
    ]});

    it('returns behaviors for event', () => {
      expect(config.behaviorsFor({event: 'issues', payload: {}})).toEqual([
        config.behaviors[0]
      ]);
    });

    it('returns behaviors for event and action', () => {
      expect(config.behaviorsFor({event: 'issues', payload: {action: 'created'}})).toEqual([
        config.behaviors[0], config.behaviors[1]
      ]);
    });
  });
});
