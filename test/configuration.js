const expect = require('expect');
const Configuration = require('../lib/configuration');
const config = require('./fixtures/content/probot.json');

const createSpy = expect.createSpy;

describe('Configuration', () => {
  describe('load', () => {
    let github;

    const repo = JSON.parse('{"full_name": "bkeepers/test"}');

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
          owner: 'bkeepers',
          repo: 'test',
          path: '.probot'
        });

        expect(config.behaviors.length).toEqual(2);

        done();
      });
    });
  });

  describe('behaviorsFor', () => {
    const config = Configuration.parse(`
      on issues then label(active);
      on issues.created then close;
      on pull_request.labeled then lock;
    `)

    it('returns behaviors for event', () => {
      expect(
        config.behaviorsFor({event: 'issues', payload: {}}).length
      ).toEqual(1);
    });

    it('returns behaviors for event and action', () => {
      expect(
        config.behaviorsFor({event: 'issues', payload: {action: 'created'}}).length
      ).toEqual(2);
    });
  });
});
