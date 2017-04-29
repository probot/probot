const expect = require('expect');
const Context = require('../lib/context');
const createRobot = require('../lib/robot');

const nullLogger = {};
['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach(level => {
  nullLogger[level] = function () { };
});

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
});
