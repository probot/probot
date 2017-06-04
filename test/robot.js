const expect = require('expect');
const Context = require('../lib/context');
const createRobot = require('../lib/robot');

function createNullLogger() {
  const logger = expect.createSpy();

  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(level => {
    logger[level] = expect.createSpy();
  });

  return logger;
}

describe('Robot', function () {
  let webhook;
  let robot;
  let event;
  let callbacks;
  let spy;
  let logger;

  beforeEach(function () {
    callbacks = {};
    webhook = {
      on: (name, callback) => {
        callbacks[name] = callback;
      },
      emit: (name, event) => {
        if (callbacks[name]) {
          return callbacks[name](event);
        }
      }
    };

    logger = createNullLogger();
    robot = createRobot({webhook, logger});
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

  describe('error handling', () => {
    it('logs errors throw from handlers', async () => {
      const error = new Error('testing');

      robot.on('test', () => {
        throw error;
      });

      await webhook.emit('test', event);

      expect(logger.error).toHaveBeenCalledWith(error);
    });
  });
});
