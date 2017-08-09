const fs = require('fs');
const path = require('path');
const expect = require('expect');
const Context = require('../lib/context');

describe('Context', function () {
  let event;
  let context;

  beforeEach(function () {
    event = {
      event: 'push',
      payload: {
        repository: {
          owner: {login: 'bkeepers'},
          name: 'probot'
        },
        issue: {number: 4}
      }
    };
    context = new Context(event);
  });

  it('inherits the payload', () => {
    expect(context.payload).toBe(event.payload);
  });

  describe('repo', function () {
    it('returns attributes from repository payload', function () {
      expect(context.repo()).toEqual({owner: 'bkeepers', repo:'probot'});
    });

    it('merges attributes', function () {
      expect(context.repo({foo: 1, bar: 2})).toEqual({
        owner: 'bkeepers', repo:'probot', foo: 1, bar: 2
      });
    });

    it('overrides repo attributes', function () {
      expect(context.repo({owner: 'muahaha'})).toEqual({
        owner: 'muahaha', repo:'probot'
      });
    });

    // The `repository` object on the push event has a different format than the other events
    // https://developer.github.com/v3/activity/events/types/#pushevent
    it('properly handles the push event', function () {
      event.payload = require('./fixtures/webhook/push');

      context = new Context(event);
      expect(context.repo()).toEqual({owner: 'bkeepers-inc', repo:'test'});
    });
  });

  describe('issue', function () {
    it('returns attributes from repository payload', function () {
      expect(context.issue()).toEqual({owner: 'bkeepers', repo:'probot', number: 4});
    });

    it('merges attributes', function () {
      expect(context.issue({foo: 1, bar: 2})).toEqual({
        owner: 'bkeepers', repo:'probot', number: 4, foo: 1, bar: 2
      });
    });

    it('overrides repo attributes', function () {
      expect(context.issue({owner: 'muahaha', number: 5})).toEqual({
        owner: 'muahaha', repo:'probot', number: 5
      });
    });
  });

  describe('config', function () {
    let github;

    function readConfig(fileName) {
      const configPath = path.join(__dirname, 'fixtures', 'config', fileName);
      const content = fs.readFileSync(configPath, {encoding: 'utf8'});
      return {data: {content: Buffer.from(content).toString('base64')}};
    }

    beforeEach(function () {
      github = {
        repos: {
          getContent: expect.createSpy()
        }
      };

      context = new Context(event, github);
    });

    it('gets a valid configuration', async function () {
      github.repos.getContent.andReturn(Promise.resolve(readConfig('basic.yml')));
      const config = await context.config('test-file.yml');

      expect(github.repos.getContent).toHaveBeenCalledWith({
        owner: 'bkeepers',
        repo: 'probot',
        path: '.github/test-file.yml'
      });
      expect(config).toEqual({
        foo: 5,
        bar: 7,
        baz: 11
      });
    });

    it('returns null when the file is missing', async function () {
      const error = new Error('An error occurred');
      error.code = 404;
      github.repos.getContent.andReturn(Promise.reject(error));

      expect(await context.config('test-file.yml')).toBe(null);
    });

    it('throws when the configuration file is malformed', async function () {
      github.repos.getContent.andReturn(Promise.resolve(readConfig('malformed.yml')));

      let e;
      let contents;
      try {
        contents = await context.config('test-file.yml');
      } catch (err) {
        e = err;
      }

      expect(contents).toNotExist();
      expect(e).toExist();
      expect(e.message).toMatch(/^end of the stream or a document separator/);
    });

    it('throws when loading unsafe yaml', async function () {
      github.repos.getContent.andReturn(readConfig('evil.yml'));

      let e;
      let config;
      try {
        config = await context.config('evil.yml');
      } catch (err) {
        e = err;
      }

      expect(config).toNotExist();
      expect(e).toExist();
      expect(e.message).toMatch(/unknown tag/);
    });

    it('returns an empty object when the file is empty', async function () {
      github.repos.getContent.andReturn(readConfig('empty.yml'));

      const contents = await context.config('test-file.yml');

      expect(contents).toEqual({});
    });

    it('overwrites default config settings', async function () {
      github.repos.getContent.andReturn(Promise.resolve(readConfig('basic.yml')));
      const config = await context.config('test-file.yml', {foo: 10});

      expect(github.repos.getContent).toHaveBeenCalledWith({
        owner: 'bkeepers',
        repo: 'probot',
        path: '.github/test-file.yml'
      });
      expect(config).toEqual({
        foo: 5,
        bar: 7,
        baz: 11
      });
    });

    it('uses default settings to fill in missing options', async function () {
      github.repos.getContent.andReturn(Promise.resolve(readConfig('missing.yml')));
      const config = await context.config('test-file.yml', {bar: 7});

      expect(github.repos.getContent).toHaveBeenCalledWith({
        owner: 'bkeepers',
        repo: 'probot',
        path: '.github/test-file.yml'
      });
      expect(config).toEqual({
        foo: 5,
        bar: 7,
        baz: 11
      });
    });
  });
});
