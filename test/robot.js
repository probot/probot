const fs = require('fs');
const path = require('path');
const expect = require('expect');
const Context = require('../lib/context');
const createRobot = require('../lib/robot');

function readConfig(fileName) {
  const configPath = path.join(__dirname, 'fixtures', 'config', fileName);
  const content = fs.readFileSync(configPath, {encoding: 'utf8'});
  return {content: Buffer.from(content).toString('base64')};
}

describe('Robot', function () {
  let robot;
  let event;
  let spy;

  beforeEach(function () {
    robot = createRobot();
    robot.auth = () => {};

    event = {
      event: 'test',
      payload: {
        action: 'foo',
        installation: {id: 1}
      }
    };

    spy = expect.createSpy();
  });

  describe('constructor', () => {
    it('takes a logger', () => {
      const logger = {
        trace: expect.createSpy(),
        debug: expect.createSpy(),
        info: expect.createSpy(),
        warn: expect.createSpy(),
        error: expect.createSpy(),
        fatal: expect.createSpy()
      };
      robot = createRobot({logger});

      robot.log('hello world');
      expect(logger.debug).toHaveBeenCalledWith('hello world');
    });
  });

  describe('on', function () {
    it('calls callback when no action is specified', async function () {
      robot.on('test', spy);

      expect(spy).toNotHaveBeenCalled();
      await robot.receive(event);
      expect(spy).toHaveBeenCalled();
      expect(spy.calls[0].arguments[0]).toBeA(Context);
      expect(spy.calls[0].arguments[0].payload).toBe(event.payload);
    });

    it('calls callback with same action', async function () {
      robot.on('test.foo', spy);

      await robot.receive(event);
      expect(spy).toHaveBeenCalled();
    });

    it('does not call callback with different action', async function () {
      robot.on('test.nope', spy);

      await robot.receive(event);
      expect(spy).toNotHaveBeenCalled();
    });

    it('calls callback with *', async function () {
      robot.on('*', spy);

      await robot.receive(event);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('receive', () => {
    it('delivers the event', async () => {
      const spy = expect.createSpy();
      robot.on('test', spy);

      await robot.receive(event);

      expect(spy).toHaveBeenCalled();
    });

    it('waits for async events to resolve', async () => {
      const spy = expect.createSpy();

      robot.on('test', () => {
        return new Promise(resolve => {
          setTimeout(() => {
            spy();
            resolve();
          }, 1);
        });
      });

      await robot.receive(event);

      expect(spy).toHaveBeenCalled();
    });

    it('returns a reject errors thrown in plugins', async () => {
      robot.on('test', () => {
        throw new Error('error from plugin');
      });

      try {
        await robot.receive(event);
        throw new Error('expected error to be raised from plugin');
      } catch (err) {
        expect(err.message).toEqual('error from plugin');
      }
    });
  });

  describe('error handling', () => {
    it('logs errors throw from handlers', async () => {
      const error = new Error('testing');
      robot.log.error = expect.createSpy();

      robot.on('test', () => {
        throw error;
      });

      try {
        await robot.receive(event);
      } catch (err) {
        // Expected
      }

      expect(robot.log.error).toHaveBeenCalledWith(error);
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
