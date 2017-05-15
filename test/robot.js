const fs = require('fs');
const path = require('path');
const expect = require('expect');
const Context = require('../lib/context');
const createRobot = require('../lib/robot');

const nullLogger = {};
['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(level => {
  nullLogger[level] = function () { };
});

function readConfig(fileName) {
  const configPath = path.join(__dirname, 'fixtures', 'config', fileName);
  const content = fs.readFileSync(configPath, {encoding: 'utf8'});
  return {content: Buffer.from(content).toString('base64')};
}

describe('Robot', function () {
  let webhook;
  let robot;
  let event;
  let callbacks;
  let spy;

  beforeEach(function () {
    callbacks = {};
    webhook = {
      on: (name, callback) => {
        callbacks[name] = callback;
      },
      emit: (name, event) => {
        return callbacks[name](event);
      }
    };

    robot = createRobot({webhook, logger: nullLogger});
    robot.auth = () => {};

    event = {
      payload: {
        action: 'foo',
        installation: {id: 1}
      }
    };

    spy = expect.createSpy();
  });

  describe('on', function () {
    it('calls callback when no action is specified', async function () {
      robot.on('test', spy);

      expect(spy).toNotHaveBeenCalled();
      await webhook.emit('test', event);
      expect(spy).toHaveBeenCalled();
      expect(spy.calls[0].arguments[0]).toBe(event);
      expect(spy.calls[0].arguments[1]).toBeA(Context);
    });

    it('calls callback with same action', async function () {
      robot.on('test.foo', spy);

      await webhook.emit('test', event);
      expect(spy).toHaveBeenCalled();
    });

    it('does not call callback with different action', async function () {
      robot.on('test.nope', spy);

      await webhook.emit('test', event);
      expect(spy).toNotHaveBeenCalled();
    });
  });

  describe('getPluginConfig', function () {
    let github;

    beforeEach(function () {
      github = {
        repos: {
          getContent: spy
        }
      };
    });

    it('gets a valid configuration', async function () {
      spy.andReturn(Promise.resolve(readConfig('basic.yml')));
      const config = await robot.getPluginConfig(github, 'owner', 'repo', 'test-file.yml');

      expect(spy).toHaveBeenCalled();
      expect(spy.calls[0].arguments[0]).toEqual({
        owner: 'owner',
        repo: 'repo',
        path: '.github/test-file.yml'
      });
      expect(config).toEqual({
        foo: 5,
        bar: 7,
        baz: 11
      });
    });

    it('throws when the file is missing', async function () {
      spy.andReturn(Promise.reject(new Error('An error occurred')));

      let e;
      let contents;
      try {
        contents = await robot.getPluginConfig(github, 'owner', 'repo', 'test-file.yml');
      } catch (err) {
        e = err;
      }

      expect(contents).toNotExist();
      expect(e).toExist();
      expect(e.message).toEqual('An error occurred');
    });

    it('throws when the configuration file is malformed', async function () {
      spy.andReturn(Promise.resolve(readConfig('malformed.yml')));

      let e;
      let contents;
      try {
        contents = await robot.getPluginConfig(github, 'owner', 'repo', 'test-file.yml');
      } catch (err) {
        e = err;
      }

      expect(contents).toNotExist();
      expect(e).toExist();
      expect(e.message).toMatch(/^end of the stream or a document separator/);
    });

    it('returns an empty object when the file is empty', async function () {
      spy.andReturn(readConfig('empty.yml'));

      const contents = await robot.getPluginConfig(github, 'owner', 'repo', 'test-file.yml');

      expect(contents).toEqual({});
    });
  });
});
