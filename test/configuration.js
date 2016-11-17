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

        expect(config.workflows.length).toEqual(2);

        done();
      });
    });
  });

  describe('workflowsFor', () => {
    const config = Configuration.parse(`
      workflows.push(on("issues").label("active"));
      workflows.push(on("issues.created").close());
      workflows.push(on("pull_request.labeled").lock());
    `);

    it('returns behaviors for event', () => {
      expect(
        config.workflowsFor({event: 'issues', payload: {}}).length
      ).toEqual(1);
    });

    it('returns behaviors for event and action', () => {
      expect(
        config.workflowsFor({event: 'issues', payload: {action: 'created'}}).length
      ).toEqual(2);
    });
  });
});
